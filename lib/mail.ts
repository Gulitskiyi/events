import fs from "node:fs";
import path from "node:path";
import type Mailer from "nodemailer";
import type { Locale } from "./locale";
import { fill, messages } from "./messages";
import { encryptField } from "./secret";

export function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || "";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM?.trim() || "";
  return {
    host,
    port,
    user,
    pass,
    from,
    configured: Boolean(host && from),
  };
}

type Message = {
  id: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  ics: string;
};

function writeOutbox(message: Message) {
  const dir = path.join(process.cwd(), "data", "outbox");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.join(dir, `${stamp}-${message.id}`);
  const json = JSON.stringify({
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    createdAt: new Date().toISOString(),
  });
  fs.writeFileSync(`${base}.json`, encryptField(json), { mode: 0o600 });
  fs.writeFileSync(`${base}.ics`, encryptField(message.ics), { mode: 0o600 });
}

export async function deliverReminder(message: Message): Promise<
  { ok: true; mode: "smtp" | "outbox" } | { ok: false; error: string }
> {
  const cfg = smtpConfig();
  if (!cfg.configured) {
    writeOutbox(message);
    return { ok: true, mode: "outbox" };
  }

  try {
    const nodemailer = (await import(/* webpackIgnore: true */ "nodemailer")) as typeof Mailer;
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      connectionTimeout: 8000,
      socketTimeout: 8000,
    });
    await transporter.sendMail({
      from: cfg.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: [
        {
          filename: "event.ics",
          content: message.ics,
          contentType: "text/calendar; charset=UTF-8; method=PUBLISH",
        },
      ],
    });
    return { ok: true, mode: "smtp" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Ошибка SMTP" };
  }
}

export async function deliverProposalConfirmation(input: {
  id: string;
  to: string;
  name: string;
  number: number;
  title: string;
  locale: Locale;
}): Promise<{ ok: true; mode: "smtp" | "outbox" } | { ok: false; error: string }> {
  const text = messages[input.locale];
  const subject = fill(text.proposeMailSubject, { number: input.number });
  const bodyText = [
    fill(text.mailHello, { name: input.name }),
    text.proposeDoneTitle,
    fill(text.proposeDoneNumber, { number: input.number }),
    fill(text.proposeMailContract, { title: input.title }),
    text.proposeDoneBody,
    text.proposeDoneMeet,
  ].join("\n\n");
  const html = bodyText
    .split("\n\n")
    .map((paragraph) => `<p>${paragraph.replace(/</g, "&lt;")}</p>`)
    .join("");

  const cfg = smtpConfig();
  if (!cfg.configured) {
    writeOutbox({
      id: input.id,
      to: input.to,
      subject,
      text: bodyText,
      html,
      ics: "",
    });
    return { ok: true, mode: "outbox" };
  }

  try {
    const nodemailer = (await import(/* webpackIgnore: true */ "nodemailer")) as typeof Mailer;
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      connectionTimeout: 8000,
      socketTimeout: 8000,
    });
    await transporter.sendMail({
      from: cfg.from,
      to: input.to,
      subject,
      text: bodyText,
      html,
    });
    return { ok: true, mode: "smtp" };
  } catch (error) {
    writeOutbox({
      id: input.id,
      to: input.to,
      subject,
      text: bodyText,
      html,
      ics: "",
    });
    return { ok: false, error: error instanceof Error ? error.message : "Ошибка SMTP" };
  }
}

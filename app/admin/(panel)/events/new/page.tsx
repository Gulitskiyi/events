import { EventForm } from "@/components/event-form";
import { toAlmatyInput } from "@/lib/format";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";

function defaultStart() {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return `${toAlmatyInput(date.toISOString()).slice(0, 11)}10:00`;
}

export default async function NewEventPage() {
  const locale = await getLocale();
  const text = messages[locale];
  return (
    <>
      <h1>{text.newEvent}</h1>
      <p className="lede">{text.newEventLead}</p>
      <EventForm
        mode="create"
        locale={locale}
        initial={{
          title: "",
          summary: "",
          description: "",
          location: "",
          startsAt: defaultStart(),
          endsAt: "",
          slug: "",
          published: true,
          contractsEnabled: false,
          contractsVoting: false,
          proposalsDeadline: "",
        }}
      />
    </>
  );
}

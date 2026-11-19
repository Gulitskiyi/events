function trimOrigin(value: string | undefined) {
  return (value || "").trim().replace(/\/$/, "");
}

export function publicOrigin() {
  const fromEnv = trimOrigin(process.env.PUBLIC_ORIGIN);
  if (fromEnv) return fromEnv;
  const host = process.env.HOST && process.env.HOST !== "0.0.0.0" ? process.env.HOST : "127.0.0.1";
  const port = process.env.PORT || "4000";
  return `http://${host}:${port}`;
}

export function adminOrigin() {
  const fromEnv = trimOrigin(process.env.ADMIN_ORIGIN);
  if (fromEnv) return fromEnv;
  const host = process.env.HOST && process.env.HOST !== "0.0.0.0" ? process.env.HOST : "127.0.0.1";
  const port = process.env.ADMIN_PORT || "4001";
  return `http://${host}:${port}`;
}

export function publicUrl(path = "/") {
  const base = publicOrigin();
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

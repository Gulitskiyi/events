const { createServer } = require("node:http");
const { parse } = require("node:url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "127.0.0.1";
const publicPort = Number(process.env.PORT || 4000);
const adminPort = Number(process.env.ADMIN_PORT || 4001);

if (!Number.isFinite(publicPort) || publicPort <= 0) throw new Error("Invalid PORT");
if (!Number.isFinite(adminPort) || adminPort <= 0) throw new Error("Invalid ADMIN_PORT");
if (publicPort === adminPort) throw new Error("PORT and ADMIN_PORT must differ");

const app = next({ dev, hostname, port: publicPort });
const handle = app.getRequestHandler();

function pathnameOf(url) {
  return parse(url || "/", true).pathname || "/";
}

function routeKind(pathname) {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/__next") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo.png" ||
    pathname === "/astana.jpg" ||
    pathname === "/afsa-green-list.pdf" ||
    pathname === "/icon.png" ||
    pathname.startsWith("/icon")
  ) {
    return "asset";
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin")) {
    return "admin";
  }
  return "public";
}

function stripProxyHeaders(req) {
  if (process.env.TRUST_PROXY === "1") return;
  delete req.headers["x-forwarded-for"];
  delete req.headers["x-real-ip"];
  delete req.headers["forwarded"];
}

function notFound(res) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not Found");
}

function listen(mode, port) {
  return createServer(async (req, res) => {
    stripProxyHeaders(req);
    const pathname = pathnameOf(req.url);
    const kind = routeKind(pathname);

    if (mode === "public" && kind === "admin") return notFound(res);
    if (mode === "admin" && kind === "public") return notFound(res);

    try {
      await handle(req, res, parse(req.url, true));
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.end("internal error");
    }
  }).listen(port, hostname, () => {
    console.log(`[${mode}] http://${hostname}:${port}`);
  });
}

app.prepare().then(() => {
  listen("public", publicPort);
  listen("admin", adminPort);
});

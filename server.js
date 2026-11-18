const { createServer } = require("node:http");
const { parse } = require("node:url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    if (process.env.TRUST_PROXY !== "1") {
      delete req.headers["x-forwarded-for"];
      delete req.headers["x-real-ip"];
      delete req.headers["forwarded"];
    }
    try {
      await handle(req, res, parse(req.url, true));
    } catch (error) {
      console.error(error);
      res.statusCode = 500;
      res.end("internal error");
    }
  }).listen(port, hostname);
});

import http from "node:http";
import crypto from "node:crypto";

const SECRET = process.env.CONVEX_TO_N8N_SECRET;
const FAIL = process.env.FAIL === "1";
if (!SECRET) {
  console.error("Set CONVEX_TO_N8N_SECRET first");
  process.exit(1);
}

http
  .createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const ts = String(req.headers["x-lendloop-timestamp"] ?? "");
      const sig = String(req.headers["x-lendloop-signature"] ?? "").replace(/^sha256=/, "");
      const expected = crypto.createHmac("sha256", SECRET).update(`${ts}.${raw}`, "utf8").digest("hex");
      const fresh = /^\d+$/.test(ts) && Math.abs(Date.now() / 1000 - Number(ts)) <= 300;
      const valid =
        fresh && /^[0-9a-f]{64}$/i.test(sig) && crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));

      console.log(new Date().toISOString(), valid ? "VALID" : "INVALID", raw);
      if (!valid) return res.writeHead(401).end();
      if (FAIL) return res.writeHead(500).end();
      res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
    });
  })
  .listen(5678, () => console.log("Mock n8n listening on http://localhost:5678"));
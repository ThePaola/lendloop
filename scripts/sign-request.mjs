// use:
//   node scripts/sign-request.mjs overdue
//   node scripts/sign-request.mjs record <loanId> [sent|failed]
//   node scripts/sign-request.mjs unsigned
import crypto from "node:crypto";

const SECRET = process.env.N8N_TO_CONVEX_SECRET;
const BASE = process.env.CONVEX_SITE_URL ?? "http://127.0.0.1:3211";
if (!SECRET) {
  console.error("Set N8N_TO_CONVEX_SECRET first");
  process.exit(1);
}

async function call(method, path, payload) {
  const body = payload ? JSON.stringify(payload) : "";
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac("sha256", SECRET).update(`${ts}.${method}.${path}.${body}`, "utf8").digest("hex");
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "x-lendloop-timestamp": ts,
      "x-lendloop-signature": `sha256=${sig}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body || undefined,
  });
  console.log(res.status, await res.text());
}

const [cmd, loanId, status = "sent"] = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);

if (cmd === "overdue") await call("GET", "/overdue-loans");
else if (cmd === "record") await call("POST", "/reminder-status", { loanId, reminderDate: today, status, n8nExecutionId: "manual-test" });
else if (cmd === "unsigned") console.log((await fetch(BASE + "/overdue-loans")).status);
else console.log("Usage: overdue | record <loanId> [sent|failed] | unsigned");
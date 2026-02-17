import "dotenv/config";
import https from "node:https";
import dns from "node:dns";

const token = process.env.TELEGRAM_BOT_TOKEN;

console.log("🚀 Attempting Low-Level Socket Connection...");

const options = {
  hostname: "api.telegram.org",
  port: 443,
  path: `/bot${token}/getMe`,
  method: "GET",
  family: 4, // Force IPv4 at the socket level
  lookup: (hostname: string, options: any, cb: any) => {
    // Manually resolve to ensure we aren't getting stuck in DNS-land
    dns.lookup(hostname, { family: 4 }, cb);
  },
  headers: {
    "User-Agent": "curl/7.81.0", // Mimic curl exactly
    Accept: "*/*",
  },
  timeout: 10000, // 10 second timeout
};

const req = https.request(options, (res) => {
  let data = "";
  console.log(`📡 Status Code: ${res.statusCode}`);

  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      console.log("✅ SUCCESS:", json.result?.username || json);
    } catch (e) {
      console.log("Response received but failed to parse:", data);
    }
  });
});

req.on("error", (err: any) => {
  console.error("❌ SOCKET ERROR:", err.message);
  if (err.code === "ETIMEDOUT") {
    console.error(
      "💡 Hint: Your ISP is likely silently dropping Node's TLS handshake packets.",
    );
  }
});

req.on("timeout", () => {
  req.destroy();
  console.error("❌ REQUEST TIMED OUT");
});

req.end();

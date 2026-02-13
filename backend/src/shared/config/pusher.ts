import Pusher from "pusher";
import "dotenv/config";

const {
  SOKETI_DEFAULT_APP_ID,
  SOKETI_DEFAULT_APP_KEY,
  SOKETI_DEFAULT_APP_SECRET,
} = process.env;

if (
  !SOKETI_DEFAULT_APP_ID ||
  !SOKETI_DEFAULT_APP_KEY ||
  !SOKETI_DEFAULT_APP_SECRET
) {
  throw new Error("Missing required Soketi environment variables");
}

export const pusher = new Pusher({
  appId: SOKETI_DEFAULT_APP_ID,
  key: SOKETI_DEFAULT_APP_KEY,
  secret: SOKETI_DEFAULT_APP_SECRET,
  host: "realtime.abhisharma.app",
  port: "443",
  useTLS: true,
});

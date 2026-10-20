import { json, optionsResponse } from "./_supabase.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  return json(200, {
    ok: true,
    service: "smart-bus-transit-api",
    message: "Backend function is deployed. Database connectivity will be verified by API operations."
  });
}

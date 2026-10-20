import { db, json, optionsResponse } from "./_supabase.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  try {
    if (event.httpMethod === "GET") {
      const passengers = await db("passenger_profiles?select=*&order=created_at.desc");
      return json(200, { passengers });
    }
    if (event.httpMethod !== "POST") return json(405, { error: "Use GET or POST." });
    const body = JSON.parse(event.body || "{}");
    const name = String(body.name || "").trim();
    if (name.length < 1 || name.length > 80) return json(400, { error: "Enter a name between 1 and 80 characters." });
    const rows = await db("passenger_profiles", {
      method: "POST",
      body: JSON.stringify([{ passenger_name: name }])
    });
    return json(201, { passenger: rows[0] });
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Unexpected backend error." });
  }
}

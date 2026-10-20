import { db, json, optionsResponse } from "./_supabase.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  if (event.httpMethod !== "POST") return json(405, { error: "Use POST." });

  const expected = process.env.ESP32_DEVICE_TOKEN;
  const supplied = (event.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!expected || supplied !== expected) return json(401, { error: "Invalid device token." });

  try {
    const body = JSON.parse(event.body || "{}");
    const busNo = String(body.busNo || "").trim().toUpperCase();
    const command = String(body.command || "").trim().toUpperCase();
    const value = String(body.value ?? "").trim();
    if (!busNo || !command) return json(400, { error: "busNo and command are required." });

    const buses = await db(`buses?bus_no=eq.${encodeURIComponent(busNo)}&select=*`);
    if (!buses.length && command !== "BUS") return json(404, { error: "Bus not found. Create it using the BUS command first." });

    // The full ticket transaction and STOP/reset processing will be added in the next implementation step.
    if (command === "BUS") {
      return json(400, { error: "Use the bus creation API with busNo and routeId for initial setup in this starter version." });
    }

    const bus = buses[0];
    const trips = await db(`trips?bus_id=eq.${bus.id}&status=eq.active&select=*`);
    const trip = trips[0];
    await db("system_events", {
      method: "POST",
      body: JSON.stringify([{
        bus_id: bus.id, trip_id: trip?.id || null,
        event_type: "esp32_command_received",
        message: `ESP32 command ${command} received for ${busNo}.`,
        details: { command, value }
      }])
    });
    return json(202, { ok: true, message: "Command received and logged. Full command processing is the next build step." });
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Unexpected backend error." });
  }
}

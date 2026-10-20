import { db, json, optionsResponse } from "./_supabase.mjs";

const routeMap = {
  chennai_kanyakumari: { start: "Chennai", end: "Kanyakumari" },
  coimbatore_thoothukudi: { start: "Coimbatore", end: "Thoothukudi" }
};

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  try {
    if (event.httpMethod === "GET") {
      const buses = await db("buses?select=*&order=created_at.desc");
      const trips = await db("trips?select=*&status=eq.active&order=created_at.desc");
      const routes = await db("routes?select=*&order=route_name.asc");
      return json(200, { buses, trips, routes });
    }
    if (event.httpMethod !== "POST") return json(405, { error: "Use GET or POST." });
    const body = JSON.parse(event.body || "{}");
    const busNo = String(body.busNo || "").trim().toUpperCase();
    const routeId = String(body.routeId || "").trim();
    if (!/^[A-Z0-9 -]{4,20}$/.test(busNo)) return json(400, { error: "Enter a valid bus number (4–20 letters/numbers)." });
    if (!routeMap[routeId]) return json(400, { error: "Choose one of the predefined routes." });

    let busRows = await db(`buses?bus_no=eq.${encodeURIComponent(busNo)}&select=*`);
    let bus = busRows?.[0];
    if (!bus) {
      const created = await db("buses", { method: "POST", body: JSON.stringify([{ bus_no: busNo }]) });
      bus = created[0];
    }

    const existing = await db(`trips?bus_id=eq.${bus.id}&status=eq.active&select=*`);
    if (existing?.length) return json(409, { error: "This bus already has an active trip. Finish or reset that trip before creating another." });

    const route = routeMap[routeId];
    const tripRows = await db("trips", {
      method: "POST",
      body: JSON.stringify([{
        bus_id: bus.id, route_id: routeId, start_city: route.start,
        end_city: route.end, current_stop_sequence: 0,
        status: "active", control_mode: "simulation"
      }])
    });
    const trip = tripRows[0];
    await db("system_events", {
      method: "POST",
      body: JSON.stringify([{
        bus_id: bus.id, trip_id: trip.id, event_type: "bus_created",
        message: `Bus ${busNo} created for ${route.start} to ${route.end}.`,
        details: { busNo, routeId }
      }])
    });
    return json(201, { bus, trip });
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Unexpected backend error." });
  }
}

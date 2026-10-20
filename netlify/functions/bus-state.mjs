import { db, json, optionsResponse } from "./_supabase.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return optionsResponse();
  try {
    const busNo = String(event.queryStringParameters?.busNo || "").trim().toUpperCase();
    if (!busNo) return json(400, { error: "Pass busNo in the query string." });
    const buses = await db(`buses?bus_no=eq.${encodeURIComponent(busNo)}&select=*`);
    if (!buses.length) return json(404, { error: "Bus not found." });
    const bus = buses[0];
    const trips = await db(`trips?bus_id=eq.${bus.id}&status=eq.active&select=*`);
    const trip = trips[0] || null;
    const groups = trip ? await db(`passenger_groups?trip_id=eq.${trip.id}&status=eq.valid&select=*&order=created_at.asc`) : [];
    const events = await db(`system_events?bus_id=eq.${bus.id}&select=*&order=created_at.desc&limit=50`);
    const stops = trip ? await db(`route_stops?route_id=eq.${trip.route_id}&select=*&order=stop_sequence.asc`) : [];
    const currentStop = trip ? stops.find(s => s.stop_sequence === trip.current_stop_sequence)?.stop_name || null : null;
    const onboard = trip ? groups.filter(g => g.board_sequence <= trip.current_stop_sequence && g.destination_sequence > trip.current_stop_sequence).reduce((n,g)=>n+g.ticket_count,0) : 0;
    return json(200, {
      bus, trip, stops, currentStop, groups, events,
      capacity: 52,
      onboard,
      seated: Math.min(onboard, 52),
      availableSeats: Math.max(52 - onboard, 0),
      standing: Math.max(onboard - 52, 0)
    });
  } catch (e) {
    return json(e.status || 500, { error: e.message || "Unexpected backend error." });
  }
}

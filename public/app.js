const app = document.getElementById("app");
const toastEl = document.getElementById("toast");
let page = "bus";
let cache = { buses: [], passengers: [], events: [] };
let selectedBus = "";
const ROUTES = [
  {id:"chennai_kanyakumari", name:"Chennai → Kanyakumari"},
  {id:"coimbatore_thoothukudi", name:"Coimbatore → Thoothukudi"}
];

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 3500);
}
async function api(path, options={}) {
  const response = await fetch(`/.netlify/functions/${path}`, {
    headers: {"Content-Type":"application/json", ...(options.headers||{})},
    ...options
  });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function heading(title, subtitle) {
  return `<div class="page-heading"><div><h1>${title}</h1><div class="muted">${subtitle}</div></div><span class="pill">SHARED CLOUD</span></div>`;
}
function nav() {
  document.querySelectorAll(".nav").forEach(b => b.classList.toggle("active", b.dataset.page === page));
}
function routeName(id) { return ROUTES.find(r=>r.id===id)?.name || id || "Route not assigned"; }
function activeTripFor(bus) { return cache.trips?.find(t=>t.bus_id===bus.id && t.status==="active"); }

async function loadCommon() {
  try {
    const b = await api("buses");
    cache.buses = b.buses || [];
    cache.trips = b.trips || [];
    cache.routes = b.routes || [];
  } catch (e) {
    cache.buses=[]; cache.trips=[]; cache.routes=[];
    cache.loadError=e.message;
  }
  try { cache.passengers=(await api("passengers")).passengers||[]; } catch { cache.passengers=[]; }
}
function busRows() {
  if (!cache.buses.length) return `<div class="empty">No buses created yet. Create the first bus using the form or the ESP32 integration when enabled.</div>`;
  return `<div class="list">${cache.buses.map(bus=>{
    const trip=activeTripFor(bus);
    return `<div class="list-item"><div><strong>${escapeHtml(bus.bus_no)}</strong><small>${escapeHtml(routeName(trip?.route_id))} · ${trip?"Active trip":"No active trip"}</small></div><button class="button secondary" data-action="bus-details" data-id="${bus.id}">View</button></div>`;
  }).join("")}</div>`;
}
async function renderBus() {
  const routes = cache.routes?.length ? cache.routes : ROUTES;
  app.innerHTML = `${heading("BUS","Create and manage buses. ESP32 integration will feed commands into this shared system.")}
    ${cache.loadError?`<div class="notice">Backend not configured yet: ${escapeHtml(cache.loadError)}. Configure Netlify environment variables and deploy functions to connect the database.</div>`:""}
    <div class="grid">
      <div class="card"><div class="stat-label">Registered buses</div><div class="stat-value">${cache.buses.length}</div></div>
      <div class="card"><div class="stat-label">Active trips</div><div class="stat-value">${(cache.trips||[]).length}</div></div>
      <div class="card"><div class="stat-label">Registered passengers</div><div class="stat-value">${cache.passengers.length}</div></div>
    </div>
    <div class="stack" style="margin-top:16px">
      <section class="card"><h2>Create bus / initialize trip</h2><p class="muted">Choose the predefined route. The backend will create the bus and active trip.</p>
        <form id="create-bus-form">
          <div class="form-grid">
            <div class="field"><label for="busNo">Bus registration number</label><input id="busNo" name="busNo" required placeholder="TN16CX3456" maxlength="20"></div>
            <div class="field"><label for="routeId">Predefined route</label><select id="routeId" name="routeId">${routes.map(r=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.route_name||r.name)}</option>`).join("")}</select></div>
          </div>
          <div class="actions"><button class="button" type="submit">Create bus</button></div>
        </form>
      </section>
      <section class="card"><h2>Created buses</h2>${busRows()}</section>
      <section class="card"><h2>Bus details</h2><div id="bus-detail" class="empty">Choose a bus to view its current state.</div></section>
    </div>`;
  document.getElementById("create-bus-form").addEventListener("submit", async e=>{
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const result = await api("buses",{method:"POST",body:JSON.stringify({busNo:form.get("busNo"),routeId:form.get("routeId")})});
      toast(`Created ${result.bus.bus_no}.`);
      await refresh();
    } catch(err){toast(err.message);}
  });
  document.querySelectorAll('[data-action="bus-details"]').forEach(btn=>btn.addEventListener("click",()=>showBusDetail(btn.dataset.id)));
}
async function showBusDetail(id) {
  const bus=cache.buses.find(b=>b.id===id); if(!bus)return;
  const target=document.getElementById("bus-detail"); if(!target)return;
  target.innerHTML="Loading bus state…";
  try {
    const state=await api(`bus-state?busNo=${encodeURIComponent(bus.bus_no)}`);
    target.innerHTML=`<div class="grid">
      <div><div class="stat-label">Current stop</div><div class="stat-value" style="font-size:18px">${escapeHtml(state.currentStop||"Not reported")}</div></div>
      <div><div class="stat-label">Onboard</div><div class="stat-value">${state.onboard}</div></div>
      <div><div class="stat-label">Seats available</div><div class="stat-value">${state.availableSeats}</div></div>
      <div><div class="stat-label">Standing</div><div class="stat-value">${state.standing}</div></div>
    </div><h3 style="margin-top:18px">ESP32 / system event log</h3>
      ${(state.events||[]).map(ev=>`<div class="log-row"><time>${new Date(ev.created_at).toLocaleString()}</time><div>${escapeHtml(ev.message)}</div></div>`).join("")||'<div class="empty">No events recorded.</div>'}`;
  } catch(e){target.innerHTML=`<div class="notice">${escapeHtml(e.message)}</div>`;}
}
async function renderPassenger() {
  app.innerHTML=`${heading("PASSENGER","Register a passenger. Journey selection and live bus availability will be added next.")}
  <div class="grid">
    <div class="card"><div class="stat-label">Registered passengers</div><div class="stat-value">${cache.passengers.length}</div></div>
    <div class="card"><div class="stat-label">Available routes</div><div class="stat-value">2</div></div>
    <div class="card"><div class="stat-label">Seat capacity per bus</div><div class="stat-value">52</div></div>
  </div>
  <section class="card" style="margin-top:16px"><h2>Create Passenger ID</h2><form id="passenger-form"><div class="field"><label for="passengerName">Passenger name</label><input id="passengerName" name="name" maxlength="80" required placeholder="Enter passenger name"></div><div class="actions"><button class="button">Register passenger</button></div></form></section>
  <section class="card" style="margin-top:16px"><h2>Registered passengers</h2>${cache.passengers.length?`<div class="list">${cache.passengers.map(p=>`<div class="list-item"><div><strong>${escapeHtml(p.passenger_name)}</strong><small>Passenger ID: ${escapeHtml(p.id)}</small></div><span class="pill">Registered</span></div>`).join("")}</div>`:'<div class="empty">No passengers registered yet.</div>'}</section>`;
  document.getElementById("passenger-form").addEventListener("submit",async e=>{
    e.preventDefault(); const name=new FormData(e.currentTarget).get("name");
    try{const result=await api("passengers",{method:"POST",body:JSON.stringify({name})});toast(`Passenger registered: ${result.passenger.id}`);await refresh();}
    catch(err){toast(err.message);}
  });
}
async function renderMonitor() {
  let events=[];
  try { for(const bus of cache.buses.slice(0,20)){const s=await api(`bus-state?busNo=${encodeURIComponent(bus.bus_no)}`);events.push(...(s.events||[]));} } catch {}
  events.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  app.innerHTML=`${heading("MONITOR","Public read-only view of bus creation and system activity.")}
  <div class="grid"><div class="card"><div class="stat-label">Buses created</div><div class="stat-value">${cache.buses.length}</div></div><div class="card"><div class="stat-label">Passengers registered</div><div class="stat-value">${cache.passengers.length}</div></div><div class="card"><div class="stat-label">Active trips</div><div class="stat-value">${(cache.trips||[]).length}</div></div></div>
  <section class="card" style="margin-top:16px"><h2>Created buses</h2>${busRows()}</section>
  <section class="card" style="margin-top:16px"><h2>Recent activity</h2>${events.length?events.slice(0,100).map(ev=>`<div class="log-row"><time>${new Date(ev.created_at).toLocaleString()}</time><div><strong>${escapeHtml(ev.event_type)}</strong><br>${escapeHtml(ev.message)}</div></div>`).join(""):'<div class="empty">No activity logged yet.</div>'}</section>`;
}
async function renderSimulate() {
  app.innerHTML=`${heading("SIMULATE","Select a bus created in BUS, then advance it along its predefined route.")}
  <section class="card"><h2>Available buses</h2>${busRows()}</section><section class="card" style="margin-top:16px"><h2>Route simulator</h2><div id="sim-detail" class="empty">Choose a bus above to load its route.</div></section>`;
  document.querySelectorAll('[data-action="bus-details"]').forEach(btn=>btn.addEventListener("click",()=>showSimDetail(btn.dataset.id)));
}
async function showSimDetail(id) {
  const bus=cache.buses.find(b=>b.id===id);if(!bus)return;
  const target=document.getElementById("sim-detail");target.innerHTML="Loading route…";
  try{
    const s=await api(`bus-state?busNo=${encodeURIComponent(bus.bus_no)}`);
    if(!s.trip){target.innerHTML='<div class="empty">No active trip for this bus.</div>';return;}
    target.innerHTML=`<p class="muted">${escapeHtml(bus.bus_no)} · ${escapeHtml(routeName(s.trip.route_id))}</p><div class="route-line">${s.stops.map(stop=>`<div class="stop ${stop.stop_sequence===s.trip.current_stop_sequence?"current":stop.stop_sequence<s.trip.current_stop_sequence?"passed":""}"><div class="stop-marker"><div class="dot"></div></div><div class="stop-body"><div class="stop-title">${escapeHtml(stop.stop_name)} ${stop.stop_sequence===s.trip.current_stop_sequence?'<span class="pill">Current</span>':""}</div>${stop.stop_sequence===s.trip.current_stop_sequence+1?`<button class="button" data-next-stop="${stop.stop_sequence}" data-trip="${s.trip.id}">Advance bus to ${escapeHtml(stop.stop_name)}</button>`:""}</div></div>`).join("")}</div><div class="notice">Next step: connect this control to a validated backend stop-advance function.</div>`;
  }catch(e){target.innerHTML=`<div class="notice">${escapeHtml(e.message)}</div>`;}
}
async function refresh() { await loadCommon(); nav(); if(page==="bus")await renderBus(); else if(page==="passenger")await renderPassenger(); else if(page==="monitor")await renderMonitor(); else await renderSimulate(); }
document.querySelectorAll(".nav").forEach(btn=>btn.addEventListener("click",()=>{page=btn.dataset.page;refresh();}));
refresh();
setInterval(()=>{ if(document.visibilityState==="visible") refresh(); },15000);

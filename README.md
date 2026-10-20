# Smart Bus Transit — starter project

This is the initial starter for the four-link Smart Bus Transit System:
- BUS
- PASSENGER
- MONITOR
- SIMULATE

Stack:
- Frontend: HTML, CSS, JavaScript
- Hosting/API: Netlify + Netlify Functions
- Database: Supabase PostgreSQL

## Important deployment note
Do not use a plain drag-and-drop static deploy as the final deployment for this project. The `netlify/functions` directory must be built/deployed as Netlify Functions. The recommended route is to upload this folder to a GitHub repository and import that repository in Netlify, or deploy with Netlify CLI.

## Files
- `public/index.html`: four-page dashboard shell
- `public/styles.css`: responsive styling
- `public/app.js`: dashboard navigation and API calls
- `netlify/functions/health.mjs`: backend health endpoint
- `netlify/functions/buses.mjs`: bus list/create API
- `netlify/functions/passengers.mjs`: passenger registration API
- `netlify/functions/bus-command.mjs`: initial ESP32 command endpoint
- `netlify/functions/bus-state.mjs`: bus/trip state endpoint
- `supabase/schema.sql`: database schema and route seed data
- `netlify.toml`: Netlify build and function settings

## Setup summary
1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. In Netlify, configure environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ESP32_DEVICE_TOKEN`
3. Deploy this project using Git-based deploy or Netlify CLI.
4. Test `/.netlify/functions/health`.
5. Add frontend bus/passenger flows, then simulator movement and ticket lifecycle.

The backend functions use the Supabase REST API directly, so no npm dependencies are required for these functions.

## Current prototype limitations
This is a starter scaffold, not the complete production system yet. It includes bus creation/listing, passenger registration, a basic ESP32 command endpoint, and dashboard navigation. The full ticket transaction protocol, destination-based passenger counting, simulator stop advancement, public read permissions, and realtime synchronization must be implemented and tested in subsequent steps. Do not expose the service-role key in browser code or ESP32 firmware.

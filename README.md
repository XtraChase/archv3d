# archv3d

Web front end and streaming servers for the interactive archviz experience at https://archv3d.com,
streamed from the Unreal Engine 5.8 project `Movie_Studio` with Pixel Streaming 2. Levels: Movie Studio (`/Game/Main`)
and As-Built Residence (`/Game/Levels/AsBuilt_WP`), served by one game process and one waiting line; the game opens
whichever level the current visitor picked.

- `frontend/` – the browser UI (Vite + React + TypeScript + `@epicgames-ps/lib-pixelstreamingfrontend-ue5.8`):
  `index.html` is the home page in React (`src/home/`): the live experiences with an availability badge on each, then the
  portfolio (`src/data/projects.json`, media in `public/portfolio/`) and about; `explore.html?level=<id>` the experience
  (views, orbit/walk, time of day, weather, switching level, queue). Runtime settings and the level list are in
  `frontend/public/config.js`; card images in `frontend/public/levels/<id>.jpg`. To add a level: add it to
  `AArchVizPlayerController::Levels` (C++) and `MapsToCook`, give the map `ArchVizGameMode` and `AArchVizCameraPoint`
  hotspots, then list it in `config.js` with the same id.
- `contact/` – the contact form backend: a Cloudflare Worker (`archv3d-contact`) that emails each message from the
  home page's Contact dialog to Chase through Cloudflare Email Routing (`send_email` binding, sender
  contact@archv3d.com, Reply-To the visitor). Deployed by Workers Builds from this repo (root directory `contact`);
  needs Email Routing enabled on archv3d.com with the destination address verified. URL in `config.js` `contactUrl`.
- `control/` – wake/status service for the on-demand Google Cloud VM: a Cloudflare Worker (`archv3d-control`) that tells
  the site whether the VM is off, asleep, starting or running, and starts it when a visitor asks. Secret `GCP_SA_KEY`:
  a service account that may only get/start that VM. Deployed by Workers Builds (root directory `control`).
- `cloud/` – the Google Cloud L4 VM that can run the stream instead of this PC: `config.ps1` (names),
  `vm-startup.ps1` (runs at each VM boot: installs, syncs from the bucket), `run-stream.ps1` (logon task: starts the
  stream with `start_experience.bat cloud`), `upload.ps1` (desktop: pushes build/servers/secrets to the bucket),
  `stream-on.ps1` / `stream-off.ps1` (desktop shortcuts: allow waking and start, or disable and stop).
- `servers/gateway.mjs` – public entry point on port 80: one viewer at a time, a waiting line, session/idle limits,
  TURN credential refresh, and a watchdog that launches and restarts the packaged game.
- `servers/SignallingWebServer`, `Signalling`, `Common` – Epic's Pixel Streaming signalling server (Wilbur, MIT,
  see `servers/LICENSE.md`), with a small change to reload `peer_options.json` while running.
- `servers/cloudflared.yml` – named Cloudflare tunnel exposing the gateway as stream.archv3d.com.
- `start_experience.bat` / `stop_experience.bat` / `restart_experience.bat` – run everything on the streaming PC.
- `PLAN.md` – design notes and a running log of decisions and fixes.

## Hosting

- **archv3d.com** – Cloudflare Pages, deployed from this GitHub repo on every push to `main`. Always up, even when the
  streaming PC is off. Pages settings: root directory `frontend`, build command `npm run build`, output directory `dist`
  (Node version from `frontend/.node-version`).
- **stream.archv3d.com** – the Cloudflare tunnel to the gateway on the streaming PC, only while `start_experience.bat`
  runs. Pages served from anywhere other than localhost connect here (`signallingUrl` in `frontend/public/config.js`);
  when it's down the home page shows each experience as Unavailable (red) and turns green again once it's back.
- Locally, the signalling server also serves `frontend/dist` at http://127.0.0.1/ (run `npm run build` after changes).

### On-demand cloud stream

The stream can run on a Google Cloud G2 VM (NVIDIA L4 vWS, Windows Server) instead of this PC. The VM powers itself
off after 15 minutes with nobody streaming or waiting (`start_experience.bat cloud` -> gateway
`--idle_shutdown_minutes 15`). While it's off, the home page shows the experiences as **Asleep**; opening one wakes
the VM through the control Worker and joins the line automatically once the stream is up (about 3 minutes).
`cloud\stream-off.ps1` switches waking off (label `archv3d-wake=off`), so the site shows **Unavailable**.
Never run the desktop and the cloud stream at once: they share the Cloudflare tunnel.

## Setup on a fresh clone

```bat
cd frontend && npm install && npm run build
cd ..\servers && npm install
copy turn.env.example turn.env   & rem then fill in the Cloudflare TURN key
```

The signalling server's compiled `dist/` folders are committed, so it runs without a build. After changing its
TypeScript, rebuild in order: `Common`, `Signalling`, `SignallingWebServer` (`npm run build` in each).

The packaged game is expected at `..\Packaged\Windows\Movie_Studio.exe` (relative to this folder).

Not in the repo (secrets): `servers/turn.env`, `servers/peer_options.json` (generated), and the Cloudflare tunnel
credentials in `%USERPROFILE%\.cloudflared`.

`npm run package` in `frontend/` builds the zip uploaded to Netcade.

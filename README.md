# archv3d

Web front end and streaming servers for the interactive archviz experience at https://archv3d.com,
streamed from the Unreal Engine 5.8 project `Movie_Studio` with Pixel Streaming 2. Levels: Movie Studio (`/Game/Main`)
and As-Built Residence (`/Game/Levels/AsBuilt_WP`), served by one game process and one waiting line; the game opens
whichever level the current visitor picked.

- `frontend/` – the browser UI (Vite + TypeScript + `@epicgames-ps/lib-pixelstreamingfrontend-ue5.8`):
  `index.html` is the landing page (pick a level, live availability), `explore.html?level=<id>` the experience
  (views, orbit/walk, time of day, weather, switching level, queue). Runtime settings and the level list are in
  `frontend/public/config.js`; card images in `frontend/public/levels/<id>.jpg`. To add a level: add it to
  `AArchVizPlayerController::Levels` (C++) and `MapsToCook`, give the map `ArchVizGameMode` and `AArchVizCameraPoint`
  hotspots, then list it in `config.js` with the same id.
- `servers/gateway.mjs` – public entry point on port 80: one viewer at a time, a waiting line, session/idle limits,
  TURN credential refresh, and a watchdog that launches and restarts the packaged game.
- `servers/SignallingWebServer`, `Signalling`, `Common` – Epic's Pixel Streaming signalling server (Wilbur, MIT,
  see `servers/LICENSE.md`), with a small change to reload `peer_options.json` while running.
- `servers/cloudflared.yml` – named Cloudflare tunnel for archv3d.com.
- `start_experience.bat` / `stop_experience.bat` / `restart_experience.bat` – run everything on the streaming PC.
- `PLAN.md` – design notes and a running log of decisions and fixes.

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

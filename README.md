# archv3d

Web front end and streaming servers for the interactive archviz experience at https://archv3d.com,
streamed from the Unreal Engine 5.8 project `Movie_Studio` with Pixel Streaming 2. Levels: Movie Studio (`/Game/Main`)
and As-Built Residence (`/Game/Levels/AsBuilt_WP`), served by one game process and one waiting line; the game opens
whichever level the current visitor picked.

- `frontend/` – the browser UI (Vite + React + TypeScript + `@epicgames-ps/lib-pixelstreamingfrontend-ue5.8`):
  `index.html` is the home page in React (`src/home/`): the live experiences with an availability badge on each, then the
  portfolio (`src/data/projects.json`, media in `public/portfolio/`) and about; `explore.html?level=<id>` the experience
  (views, orbit/walk, time of day, weather, switching level, queue). Runtime settings and the level list are in
  `frontend/public/config.js`; card images in `frontend/public/levels/<id>.webp` (plus a `-640.webp` for small screens,
  listed in `imageSrcset`; the `.jpg` stays as the link-preview image). To add a level: add it to
  `AArchVizPlayerController::Levels` (C++) and `MapsToCook`, give the map `ArchVizGameMode` and `AArchVizCameraPoint`
  hotspots, then list it in `config.js` with the same id.
- `contact/` – the contact form backend: a Cloudflare Worker (`archv3d-contact`) that emails each message from the
  home page's Contact dialog to Chase through Cloudflare Email Routing (`send_email` binding, sender
  contact@archv3d.com, Reply-To the visitor). Deployed by Workers Builds from this repo (root directory `contact`);
  needs Email Routing enabled on archv3d.com with the destination address verified. URL in `config.js` `contactUrl`.
- `control/` – a Cloudflare Worker (`archv3d-control`) with three jobs: wake/status for the on-demand AWS instance (tells
  the site whether it's off, asleep, starting or running, and starts it when a visitor asks); visit counting (`POST /e`
  from the site, stored in the D1 database `archv3d-insights`, see Privacy below); and the admin API used by the desktop
  app (`/admin/*`, Bearer secret `ADMIN_TOKEN`: cloud on/off, insights, contact messages, AWS costs). Secrets
  `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: the IAM user `archv3d-control`, whose policy is
  `aws/control-policy.json` (describe instances; start, stop and tag the one named `archv3d-stream`; read costs). A daily
  cron deletes visit records older than 13 months. Deployed by Workers Builds (root directory `control`).
- `desktop/` – **archv3d Control**, the Windows app (Electron + React) that replaced the Start/Stop shortcuts: stream
  status, cloud machine on/off, the stream on this PC start/stop, AWS costs, visitors (organizations, places, referrers,
  projects, recent visits) and contact messages, with Windows notifications for new messages and new organization
  visitors. Closing the window keeps it in the system tray (the icon's color is the stream status; right-click for the
  actions and Quit). Build the installer with `npm install && npm run dist` (output in `desktop/release/`).
- `aws/` – the AWS EC2 g5.xlarge (NVIDIA A10G, Cloud Gaming driver, Windows Server 2022, us-west-2) that runs the stream
  instead of this PC: `config.ps1` (names), `create-instance.ps1` (one time: bucket, instance role, security group,
  instance), `userdata.txt` + `vm-startup.ps1` (every boot: installs, driver, page file, logs from before the boot,
  sync from S3), `run-stream.ps1` / `stream-session.ps1` (logon task: starts the stream with
  `start_experience.bat cloud`), `monitor.ps1` (logon task: game memory/GPU/exit codes, uploads logs when the game
  exits), `upload.ps1` (desktop: pushes build/servers/secrets to S3), `stream-on.ps1` / `stream-off.ps1` (allow waking
  and start, or disable and stop; the desktop app does the same through the control Worker).
- `cloud/` – the earlier Google Cloud L4 version (replaced by `aws/`, kept for reference).
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

The stream runs on an AWS g5.xlarge instead of this PC (turn it on or off in the archv3d Control app, or with
`aws\stream-on.ps1` / `stream-off.ps1`; the app's "This PC" card runs it locally). The instance powers itself off after
15 minutes with nobody streaming or waiting (`start_experience.bat cloud` -> gateway `--idle_shutdown_minutes 15`).
While it's off, the home page shows the experiences as **Asleep**; opening one wakes the instance through the control
Worker and joins the line automatically once the stream is up (about 4 minutes). `aws\stream-off.ps1` switches waking
off (tag `archv3d-wake=off`), so the site shows **Unavailable**. Never run the desktop and the cloud stream at once:
they share the Cloudflare tunnel (a local start switches the cloud off first).

The cloud stream uses **VP8**, not the project's H.264: on NVIDIA's cloud vGPU drivers the NVENC H.264 path leaks
committed memory (~380 MB/s while a viewer streams) until the game dies. Extra game arguments for experiments go in the
instance tag `archv3d-game-args` (applied at the next boot). Logs: `s3://archv3d-stream-194184403309/logs/`.
Updating the cloud build: package the game, then `aws\upload.ps1` and restart the instance.

### Privacy and visitor insights

The site counts visits without cookies and without storing IP addresses, so it needs no cookie banner. Each event
(page view, project view, experience opened/started, contact form opened/sent) is sent with `navigator.sendBeacon` and
stored with the visitor's network organization and city as Cloudflare reports them, device/browser/OS, and the
referring site's host only. A visitor is an anonymous hash of IP + user agent with a salt that changes daily and is
deleted after the day, so the same person can't be followed across days. Browsers with Global Privacy Control or Do
Not Track send nothing, and the Privacy page (`#/privacy`) has a per-device opt-out. Records are kept 13 months; contact
messages until deleted (Messages tab in the app). Organization names come from the network: a company, school or agency
network is a likely business lead; home and mobile providers are flagged as such.

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

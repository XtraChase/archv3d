# Interactive ArchViz Web Experience — Plan / Handoff

Goal: an interactive archviz experience for level `/Game/Main`, in the style of
"Unreal Engine 5 ArchViz Web App Template" (Vinode, youtube.com/watch?v=5VOTfkBfgCI),
running in the browser via **Pixel Streaming 2**, with the web UI published on **Netcade** (https://netcade.com).

## Architecture

```
[Netcade page] --iframe--> index.html (our custom UI, zipped HTML5 build)
                               |  WebSocket (wss://) + WebRTC
                               v
             [Signalling server (Epic PS2 infra, Cirrus/Wilbur)]
                               |
                               v
       [Packaged Movie_Studio build, Main map, -PixelStreamingURL=...]
          (user's PC exposed via tunnel, or a cloud GPU box)
```

- Netcade only hosts static HTML5 zips (index.html at root, runs in an iframe). It does NOT host Unreal.
  The UE app + signalling server must run elsewhere and be reachable over HTTPS/WSS (e.g. Cloudflare Tunnel).
- Risk to verify early: whether Netcade's iframe sandbox/CSP allows outbound WebSocket/WebRTC to an
  external host. Their docs are silent. Test with a minimal upload before polishing.
- Signalling URL must be configurable (query param `?ss=wss://...` + default baked into config.js).

## Features (UI <-> UE)

| Feature | Web UI | UE side |
|---|---|---|
| Camera hotspots | Thumbnail strip / menu of named views | `BP_ArchVizCameraPoint` actors; blend view target |
| Orbit mode | Default exterior mode | Orbit pawn around building pivot, zoom/pan, clamped |
| Walk mode | Toggle; WASD + mouse/touch joystick | First-person pawn with collision, eye height ~165cm |
| Time of day | Slider + presets (morning/noon/sunset/night) | SunPosition / UltraDynamicSky time-of-day |
| Material / variant swaps | Swatch panels (floor, walls, kitchen, etc.) | Variant Manager `LevelVariantSets` (VariantManager plugin enabled) |
| Lights on/off | Toggle | Interior light group |
| Floor plan / info | Overlay panel with room info | Optional: jump camera to room |
| Screenshot | Button | `HighResShot` or UI-side canvas capture |
| Fullscreen, quality | Buttons | PS2 encoder settings |

## Message protocol (UI -> UE via `emitUIInteraction`, JSON)

```json
{ "cmd": "camera",   "id": "Exterior_Front" }
{ "cmd": "mode",     "value": "orbit" | "walk" }
{ "cmd": "time",     "hour": 17.5 }
{ "cmd": "variant",  "set": "Floor", "option": "Oak" }
{ "cmd": "lights",   "on": true }
{ "cmd": "screenshot" }
```

UE -> UI (via `SendPixelStreamingResponse` / PS2 equivalent):
```json
{ "event": "ready", "cameras": [...], "variants": {"Floor": ["Oak","Marble"]}, "hour": 12 }
{ "event": "cameraChanged", "id": "..." }
```
UE builds the catalog dynamically (scan camera point actors + LevelVariantSets) so the UI isn't hard-coded.

## UE implementation steps (do via unreal-mcp)

1. Enable `PixelStreaming2` plugin (5.8 ships PixelStreaming2 + PixelStreamingPlayer). Restart editor.
2. Inspect `/Game/Main`: buildings, lighting (sky system in use), existing cameras/variants.
3. Create `BP_ArchVizGameMode`, `BP_ArchVizController` (handles PS2 input component messages),
   `BP_OrbitPawn`, `BP_WalkPawn`, `BP_ArchVizCameraPoint`.
4. Place camera points; create LevelVariantSets for material options.
5. Set GameMode override on Main; set Main as GameDefaultMap for the packaged build
   (currently GameDefaultMap = /Game/Levels/AsBuilt_WP — change only for the streaming build/confirm with user).
6. Project settings: hide default PS2 UI elements as needed, mouse/touch input.
7. Package Win64 Shipping/Development; launch with `-PixelStreamingURL=ws://127.0.0.1:8888 -RenderOffscreen`.

## Web frontend (this folder)

- Vite + TypeScript, `@epicgames-ps/lib-pixelstreamingfrontend-ue5.x` (match 5.8 version on npm).
- Custom UI (not the stock UI lib): left menu (Views / Materials / Time / Mode), bottom hotspot strip,
  loading screen with "Click to start" (autoplay policy), reconnect handling.
- `npm run build` -> `dist/` -> zip with index.html at root -> upload to Netcade (web game).
- Relative asset paths (`base: './'`) so it works inside Netcade's iframe.

## Hosting the stream

- Signalling: Epic PixelStreamingInfrastructure (Wilbur) matching the 5.8 PS2 branch.
- Expose via Cloudflare Tunnel (wss) + TURN server for WebRTC across NATs (coturn or a hosted TURN).
- One UE instance = one concurrent viewer (or SFU for broadcast-only).

## Status

- 2026-10-28: Plan written. MCP server was not running (auto-start off) and Remote Control blocks console
  commands, so the user must start MCP in-editor and relaunch Claude Code from this project folder.
- 2026-10-28: Switched to **C++** (user installed VS 2026). Added `Source/Movie_Studio` module:
  `ArchViz/` GameMode, PlayerController (UI bridge, PS2 input via reflection), OrbitPawn, WalkPawn
  (kinematic, complex traces — Datasmith meshes have no simple collision), CameraPoint.
  uproject: Modules entry + PixelStreaming2 + VariantManagerContent plugins (backup in scratchpad).
- Engine workaround: Fab plugin update (10/28) added module FabToolset missing from the installed engine's
  precompiled UE5Rules.dll -> UBT RulesError for any C++ project. Removed FabToolset from
  `D:\UE_5.8\Engine\Plugins\Fab\Fab.uplugin` (backup `Fab.uplugin.bak-20261028`); launcher Verify restores it.
- Message protocol (actual): UI -> UE `{cmd:"hello"|"camera"|"mode"|"time"|"lights"|"variant"|"zoom", id, value, hour, on, set, option}`;
  UE -> UI responses `{event:"catalog", cameras[], variants[], hasSun, hasLights}` and `{event:"state", mode, camera, hour, lights}`.
  Console test: `ArchViz camera <id>`, `ArchViz mode walk`, `ArchViz time 18`.
- Frontend: `ArchVizWeb/frontend` (Vite + TS + @epicgames-ps/lib-pixelstreamingfrontend-ue5.8); runtime
  signalling URL in `public/config.js`; `npm run package` -> Netcade zip.
- C++ editor build succeeded (`Build.bat Movie_StudioEditor Win64 Development -Project=... -NoHotReloadFromIDE`;
  the flag skips UBT's Live Coding check so it builds while the editor is open). `Module Load` can't load
  it in the running editor (project was content-only at startup) -> editor restart needed. MCP auto-start enabled.
  Frontend builds (`npm run build`). MCP is reached over HTTP via scratchpad helper scripts (ct.sh/mcp.sh).
- TODO: after restart: set Main's GameMode override, place AArchVizCameraPoint hotspots, PS2 servers, test, package.
- 2026-10-28 (later): Hotspots placed (6, `ArchViz` folder, always-loaded), Main GameMode override set, SunSky always-loaded.
  Signalling server built in `ArchVizWeb/servers/SignallingWebServer` and run with
  `node dist/index.js --serve --player_port 80 --streamer_port 8888 --http_root ../../frontend/dist`. Full loop works in PIE + Chrome.
- 2026-10-28 GPU crash (DXGI_ERROR_DEVICE_HUNG) during PIE streaming: hung in Nanite culling of `SceneCapture2D_0`
  (old ortho heightmap capture -> /Game/MyStuff/Materials/Heightmap, rendering every frame). Set its
  bCaptureEveryFrame/bCaptureOnMovement = false (actor kept).
- PCG reduced to TEST levels in /Game/Main only (graphs untouched; PCG_Grass is shared with AsBuilt_WP):
  - Trees volume `Wind_Example_PCG` instance param `density` 0.1 -> 0.02. Restore: set back to 0.1.
  - Grass volume `PCG_Grass`: bOverrideGenerationRadii=true, radius1600 3200 -> 1600 (Grid16 cells within 16 m).
    Restore: bOverrideGenerationRadii=false.
  - MCP can't save WP external actors -> user must File > Save All for these + the SceneCapture change.
- Web stream profile (Config/DefaultGame.ini, PixelStreaming2PluginSettings): WebRTCFps=30, DecoupleFramerate=True,
  StartBitrate 5 Mbps, MaxBitrate 20 Mbps, codec prefs H264 first. Measured in PIE at 1764x672: coupled 111 fps / 16.6 Mbps ->
  decoupled 30 fps, 0 drops (3.2 Mbps right after the switch; WebRTC later ramps toward the 20 Mbps cap on localhost). Packaged render cap: Config/DefaultGameUserSettings.ini FrameRateLimit=60.
- Frontend: `?stats=1` overlay (codec, res, fps, Mbps, RTT, drops); `window.archvizStats` always populated.
- Stream resolution cap (frontend): `maxStreamResolution` in public/config.js (default 1920x1080, portrait swaps it;
  `?maxres=WxH` overrides) -> lowers ViewportResScale so r.SetRes never exceeds it. Verified in log (1706x832 page ->
  r.SetRes 1280x624 with maxres=1280x720). PIE in-viewport ignores r.SetRes, so verify end-to-end in the packaged build.
- Packaging (2026-10-28): Win64 Development -> `Packaged/Windows/Movie_Studio.exe` (2.3 GB). Run RunUAT from PowerShell
  (Git Bash mangles `-map=/Game/Main`). Command: BuildCookRun -platform=Win64 -clientconfig=Development -build -cook
  -map=/Game/Main -stage -pak -iostore -archive -archivedirectory=<proj>/Packaged -nocompileeditor -unattended.
  Cook failed only on the GameFeatureData asset-manager error -> added the rule to DefaultGame.ini.
  Launch: `ArchVizWeb/start_experience.bat [windowed]` / `stop_experience.bat`. Verified: Main loads in 3.8 s, streamer joins,
  resolution cap works (maxres=1280x720 -> 1280x582 H264 30 fps).
- BLOCKER: terrain missing in the packaged build. Mesh Partition only builds placeholder CompiledSections in PIE; cooked builds need
  Build > Mesh Partition > Build Mesh Partition (WorldPartitionMeshPartitionBuilder, runs out of process) on /Game/Main, then re-cook.
  PCG grass/trees raycast the terrain at runtime, so they depend on this too.
- 2026-10-28 21:07 editor died silently during PIE streaming (log cut off mid-connection, no crash report, no GPU/OOM event).
  Likely cause: during PIE streaming the EDITOR hosts the signalling server on 8888, and stop_experience.bat force-killed any
  PID listening on 8888. Fixed: it now kills only node.exe on that port (dry-run verified it skips UnrealEditor).
  Edits from before the crash (PCG reductions, SceneCapture) were already saved.
- Mesh Partition build not yet run (no Saved/Logs/WPMeshPartitionBuilderLog.txt). Not scriptable via MCP (modal dialogs,
  no Python binding) -> user clicks Build > Mesh Partition > Build Mesh Partition with /Game/Main open, then re-cook.
- 2026-10-28 21:17 Mesh Partition built (18/18 compiled sections, 57 s, log Saved/Logs/WPMeshPartitionBuilderLog.txt).
  Note: builder applied no LOD reduction (all LODs 384k tris; mesh partition definition has no EdgeLength/ErrorTolerance).
- Trees PCG BAKED: `Wind_Example_PCG` volume GenerationTrigger GenerateAtRuntime -> GenerateOnLoad, generated in editor:
  196 PCGPartitionGridActor_25600 tiles, 104,587 instanced-skinned PVE instances (~26k each plant/shrub/deciduous/conifer).
  Needs File > Save All (MCP save_actor fails on new WP actors). Restore runtime: Cleanup the volume, set trigger back.
  Grass stays GenerateAtRuntime (GPU, 16 m radius) - baking grass over 3.3 km would be millions of instances.
- 2026-10-28 21:29 Repackaged (full cook 3001 pkgs, 44 s; Main now 210 WP cells vs 8; AsBuilt_WP no longer cooked since
  GameDefaultMap=/Game/Main). VERIFIED in browser: terrain + baked trees render, 1280x588 H264 30 fps, 0 dropped.
- Grass missing in Main (not a packaging bug): PCG_Grass keeps clumps only inside a spline tagged `PCG_LawnBoundary`
  ("Keep Clumps Inside Lot" intersection). That spline exists only in AsBuilt_WP (external actor .../AsBuilt_WP/B/1Q/EZTR41...),
  so every Main cell is empty (verbose log: "Intersection resulted in empty output", "Lot Boundary ... No matching actor").
  Get Landscape Data also finds nothing (Main has Mesh Partition, no Landscape) - feeds the CustomHLSL branch only.
  Fix options: copy that spline into Main, or draw a new lawn spline tagged PCG_LawnBoundary.
  AsBuilt_WP's lot (99x90 m pentagon at z~0) does NOT match Main's building (~200x100 m, ground ~20 m; trace map).
  -> Created `Lot_Boundary` in Main (folder Environment, not spatially loaded): closed linear spline rectangle
     x -130..130 m, y -120..140 m, z 20 m, tag PCG_LawnBoundary. Graph already excludes building footprints/paving.
     Saved + repackaged (3002 pkgs). VERIFIED in browser: grass blades at Courtyard + Main Entrance, terrain, trees;
     1280x630 H264 30 fps, 0 dropped. Log: "Intersection generated 1024 points from 1024 source points" (78 cells).
- stop_experience.bat verified: stops game + node, leaves UnrealEditor running.
- Terrain LOD reduction: NOT NEEDED. MPD_SenseiTerrain uses engine default pipelines; Windows variants =
  Common_GameplayData (collision, QEM-simplified 1%) + HighEndPlatform_RenderData (Nanite, fallback 20% tris, no LOD chain).
  The "384k tris 100% retained" warnings come only from LowEndPlatform_RenderData, which ACompiledSection::ShouldBeLoadedForPlatform
  excludes from the Windows cook. Nanite runs on any SM6 cloud GPU. Optional: drop the LowEnd variant from MPD_SenseiTerrain
  to shorten Mesh Partition builds (only matters if a mobile/low-end target is never planned).
- 2026-10-28 22:05 NETCADE IFRAME TEST: PASSED. Hidden upload "Movie Studio – stream test"
  (https://netcade.com/game/virtualimagery-20261028-215748-movie-studio-netcade-test/, visibility Hidden, downloads/comments off).
  Netcade serves the zip same-origin at netcade.com/games/<slug>/index.html in an iframe with NO sandbox,
  allow="autoplay;encrypted-media"; fullscreenEnabled=true. Signalling via Cloudflare quick tunnel
  (cloudflared 2026.10.5 installed via winget; `cloudflared tunnel --url http://127.0.0.1:80`) -> wss://<random>.trycloudflare.com.
  Stream 952x560 H264 30 fps, 0 dropped; UI->UE commands (camera views) work. Tunnel stopped after test, so the page is now dead.
  Signalling server (Wilbur) does no Origin filtering -> no AllowedOrigins change needed.
  CAVEAT: viewer was on the same PC, so WebRTC used host candidates; remote viewers behind NAT still need TURN.
  Test zip built from a copy (scratchpad) with config.js signallingUrl=wss://tunnel; repo public/config.js unchanged.
- 2026-10-28 22:30 PERMANENT HOSTNAME: archv3d.com is on Cloudflare. `cloudflared tunnel login` (user) -> named tunnel
  `archviz` (id ce2ce5bf-7e0d-49e8-b7ed-c4e76c75bdb7, creds %USERPROFILE%\.cloudflared\<id>.json - secret),
  proxied CNAME stream.archv3d.com -> tunnel. Config: servers/cloudflared.yml (ingress -> http://127.0.0.1:80).
  start_experience.bat starts the tunnel; stop_experience.bat kills cloudflared. public/config.js picks
  ws://127.0.0.1:80 on localhost, else wss://stream.archv3d.com. VERIFIED https://stream.archv3d.com: 1280x626 30 fps.
- Signalling sends peerConnectionOptions {} -> NO STUN/TURN servers. Remote viewers can't connect until iceServers are set
  (Wilbur --peer_options / config.json peer_options).
- STUN added: servers/peer_options.json (stun.cloudflare.com:3478, stun.l.google.com:19302), passed via
  --peer_options_file in start_experience.bat. Verified in the config message over wss://stream.archv3d.com.
  (Launch note: piping start_experience.bat into PowerShell `| Out-Null` hangs - started children inherit the pipe.)
- 2026-10-28 22:32 PHONE TEST FAILED (Android Chrome, on home Wi-Fi 192.168.68.55, same public IP 74.244.109.56):
  signalling over wss OK, offer/answer OK, but ICE never completed (UE never logged OnDataTrackState Active for the player).
  PC side verified OK: game listens UDP 49152 on 192.168.68.68, Windows Firewall Allow rule (UDP/TCP any, Public profile),
  Bitdefender firewall not active. -> LAN/router blocks device-to-device UDP (or similar). Fix: TURN relay.
  Frontend note: lib fires webRtcConnecting only when the BROWSER creates the offer; with UE offering, the status stays
  "Waiting for the experience server..." until video starts -> misleading text, fix pending.
- TURN: servers/turn_refresh.mjs (run first by start_experience.bat) -> Cloudflare
  POST rtc.live.cloudflare.com/v1/turn/keys/<id>/credentials/generate-ice-servers (ttl 7 days, drops :53 URLs)
  -> writes servers/peer_options.json; falls back to STUN only without servers/turn.env (secret; template turn.env.example).
  Signalling reads peer_options.json once at startup, so restart the experience at least weekly.
- 2026-10-28 22:45 TURN LIVE: user created Cloudflare TURN key + servers/turn.env. Cloudflare rejects ttl=7 days
  ("400 invalid argument"); 48 h accepted -> TTL_SECONDS=48h, so RESTART THE EXPERIENCE AT LEAST EVERY 2 DAYS.
  Config message (to browsers and to the UE streamer) now lists stun.cloudflare.com + turn/turns turn.cloudflare.com
  (udp 3478/443, tcp 3478/80, tls 5349/443). UE PS2/EpicRtc takes ICE servers from that config (no UE setting needed).
  VERIFIED relay-only: https://stream.archv3d.com/?ForceTURN=true -> relay candidates both directions, 1280x584 30 fps, 0 drops.
- Frontend status fix: click -> "Connecting to the experience..."; after 20 s without video -> "Still connecting... your
  network may be blocking the stream." (UE makes the offer, so the lib never fires webRtcConnecting.)
- 2026-10-28 PHONE RETEST PASSED (Android Chrome) on home Wi-Fi AND cellular via https://stream.archv3d.com.
- 2026-10-28 22:50 DAILY RESTART: restart_experience.bat (stop -> start; start refreshes TURN creds). Scheduled task
  "ArchViz daily restart" daily 04:00, runs as james, interactive (only while logged in - the GPU stream needs that).
  Test run OK (result 0, game/tunnel/signalling restarted, peer_options.json refreshed). Remove with:
  Unregister-ScheduledTask 'ArchViz daily restart'.
- 2026-10-28 22:52 NETCADE PERMANENT BUILD: new HIDDEN upload "Movie Studio – Interactive Archviz"
  https://netcade.com/game/virtualimagery-20261028-225238-movie-studio-archviz/ (zip of frontend/dist with permanent config).
  Netcade now puts new uploads through "processing -> Netcade review -> publishes when approved"; it was still processing
  after 1 min, so it is NOT yet verified in Netcade's frame. Visibility set to Hidden - confirm it stays Hidden after approval.
  Builds-tab "+ Add build" on the old test item did NOT replace the served files (still old quick-tunnel build).
  User to delete the old test item "Movie Studio – stream test" (Manage Content > Builds > Danger zone > Delete).
  `npm run package` fixed: uses System32 tar.exe (Git Bash GNU tar can't zip, misreads D:) and names entries
  without './' -> frontend/movie-studio-archviz-netcade.zip has index.html at the root.
- 2026-10-28 23:00 NETCADE PERMANENT BUILD VERIFIED (status "Pending review - not public"): served from
  netcade.com/games/virtualimagery-20261028-225238-movie-studio-archviz/, iframe unsandboxed, signalling
  wss://stream.archv3d.com, 952x560 H264 30 fps, 0 dropped; Exterior > Courtyard camera command works.
  User deleted the old test item. Manage Content > Details shows Visibility with only Public/Private and nothing selected
  (stored value = hidden, not in that list) -> don't save that Details form without re-checking Visibility.
- 2026-10-28 23:15 OFFLINE/BUSY MESSAGES (frontend/src/main.ts + --max_players 1 in start_experience.bat):
  - On page load a probe WebSocket asks for the streamer list (no subscribe) -> offline message if unreachable/empty (8 s timeout).
  - streamerListMessage with no ids -> "offline", disconnect. subscribeFailed (server full) -> "Someone else is exploring
    right now...", disconnect. Disconnect before any streamer list -> offline; after -> "stopped or restarted". Button -> "Try again".
  - VERIFIED: online; busy (2nd tab rejected, 1st undisturbed, 2nd connects after 1st leaves); game killed mid-session and
    on load -> offline; server+tunnel down (page served from a temp local server, ss=wss://stream.archv3d.com) -> offline.
  - Netcade item still has the PREVIOUS build (no offline/busy UI); updated zip: frontend/movie-studio-archviz-netcade.zip.
  - No idle timeout yet: an idle open tab holds the single viewer slot indefinitely (lib AFK feature: Flags.AFKDetection).
- 2026-10-28 23:15 DESKTOP SHORTCUTS (C:\Users\james\OneDrive\Desktop): "Start ArchViz Stream" / "Stop ArchViz Stream"
  -> cmd /c start|stop_experience.bat, window stays 5 s. start_experience.bat now: refuses if Movie_Studio.exe is running;
  otherwise runs stop first to clear leftover signalling/tunnel; game launched WITHOUT -log (its console window, when closed,
  shut the game down: "Engine exit requested (reason: ConsoleCtrl RequestExit)" at 23:09). Verified start/refuse/crash-recovery/stop.
- 2026-10-28 23:20 Daily 04:00 scheduled task REMOVED at the user's request (manual start/stop via desktop shortcuts).
  restart_experience.bat kept for manual use. TURN creds expire 48 h after each start -> stop/start at least every 2 days.
- 2026-10-29 PRIMARY URL -> https://archv3d.com/ (apex). `cloudflared tunnel route dns archviz archv3d.com` (apex had no records;
  proxied CNAME, flattened). cloudflared.yml ingress: archv3d.com first, stream.archv3d.com kept as alias (both -> 127.0.0.1:80).
  config.js: localhost -> ws://127.0.0.1:80; any *archv3d.com page -> wss://<its own host>; elsewhere (Netcade) -> wss://archv3d.com.
  VERIFIED (signalling + tunnel only, game not running): https://archv3d.com/ 200, config.js served, wss://archv3d.com returns
  config (TURN) + streamerList. Netcade zip rebuilt with the new default; the live Netcade build still uses stream.archv3d.com (alias works).
  To switch back: remove the apex DNS record in Cloudflare (optional), drop the archv3d.com ingress rule, revert config.js default.
- 2026-10-29 QUEUE + LEAVE-RUNNING. New servers/gateway.mjs on port 80 (tunnel target); signalling server moved to 8080
  (--rest_api, private: gateway returns 404 for /api). Visitors wait on wss://<host>/queue and see "You're number N in line
  (M waiting)"; the active viewer sees an "M waiting" pill. A turn = one-time ticket on the signalling URL (?ticket=), anything
  else gets 403. Limits (start_experience.bat args): session 10 min ONLY while others wait (60 s warning, never less than 60 s
  after someone joins); idle 3 min while others wait / 15 min alone (activity = pointer/wheel/key/touch, reported every 5 s);
  30 s to claim a turn. Closing the tab or dropping the signalling socket frees the slot immediately. Frontend: MaxReconnectAttempts 0
  (each session needs a fresh ticket); old probe-based availability check removed. --max_players 1 kept as a backstop.
  TURN: gateway runs turn_refresh.mjs --keep-on-error every 24 h (atomic write); Wilbur src/index.ts now watches peer_options.json and
  swaps protocolConfig.peerConnectionOptions (rebuilt dist). The UE streamer keeps the creds it got at connect; browsers always get
  fresh ones (their relay candidates suffice). -> no periodic restart needed.
  VERIFIED: scripted test (fake streamer, 3 visitors, short limits): positions/counts, ticket single-use, ticketless 403, time
  limit with 60 s warning, missed turn -> next, idle warning cancelled by activity, tab close frees slot. TURN refresh -> "Reloaded
  peer_options_file". Real game + 2 Chrome tabs (local): tab 2 "number 1 in line", tab 1 pill "1 waiting", tab 1 closed -> tab 2
  streams (Player1 data track Active). The live Netcade build predates the queue and will show "offline" -> re-upload
  frontend/movie-studio-archviz-netcade.zip.
  Port 8080 is reachable on the LAN without a ticket.
- 2026-10-29 GAME WATCHDOG (in gateway.mjs, enabled by --game): the gateway now LAUNCHES the game (start_experience.bat no longer
  does; args /Game/Main -RenderOffscreen|-Windowed -ResX=1920 -ResY=1080 -ForceRes -unattended -PixelStreamingConnectionURL, detached).
  Polls tasklist every 5 s (adopts an already-running game): not running -> relaunch; running but no identified streamer for 180 s
  -> taskkill (hang). Crash-loop guard: 5 launches in 15 min -> pause 10 min. -unattended stops error dialogs from blocking a crashed game.
  Packaged game = 2 processes named Movie_Studio.exe (bootstrap + Binaries\Win64) -> always kill by image name.
  Online now means an IDENTIFIED streamer (streaming:true), not just a connected one.
  Mid-session crash: viewer gets 'ended' reason 'restart' and goes back to the FRONT of the line (page: "restarting, you keep your
  place"); gateway-up-but-game-down shows "restarting" instead of "offline" and still lets people join the line.
  stop_experience.bat kills the gateway first (else the watchdog relaunches the game).
  VERIFIED (real game): taskkill mid-session -> viewer requeued at #1, game relaunched 5 s later, viewer streaming again 11 s after
  the crash, second visitor still #1 behind. Hang (streamer port 9999) -> killed at 180 s and relaunched. stop script -> nothing left,
  no relaunch. NOT detected: a game that stays registered but stops rendering frames.
- NEXT: update the Netcade build; idle timeout; after Netcade approval confirm still hidden; go public when ready; then the old TODOs below,
  then re-upload with the permanent wss:// URL in config.js; test from a phone on cellular. Delete/replace the hidden test upload.
- TODO (web optimization): add Netcade origin to AllowedOrigins;
  Cloudflare Tunnel + TURN; test the Netcade iframe early.
- 2026-10-29 GLASS FIX: M_Glass (/Game/MyStuff/Materials) built "Mask BaseColor"/"Masked Opacity" from length(UV-0.5) -> a soft
  circle on every Datasmith curtain-wall pane. Both masks now come from Fresnel nodes (ExponentIn = Falloff Base Color /
  Falloff Opacity), so MI_Glass params keep working (Center = facing, Edge = grazing). Saved. Backup of the old asset:
  Saved/Backups/M_Glass.uasset.bak-20261029.
- 2026-10-29 SITE WORK (folders Site/Walkways, Site/Courtyard, Site/HillPath; all /Engine/BasicShapes/Cube StaticMeshActors
  with /Game/MyStuff/Materials/MI_Walkway_Concrete = child of ResidentialHouses MI_Path_Concrete, World Space Tiling ON):
  - Walkways: 3 m concrete band around the whole outer footprint (63 slabs), terrain-following (pitch/roll fitted to traced
    ground, never buried; thick enough to reach the lowest ground). East strip tilts ~14 deg because the terrain rises 25%
    right against the entrance facade (Mesh Partition terrain can't be regraded).
  - Hill path: 3 m wide on axis y=555 (door is at y~755; shifted 2 m to avoid the ravine at y>=855, x 4300-5800),
    x 1832 -> 12000 + 6x6 m overlook at the crest (x 12000-12600, z~33.2 m). Ramp slabs on the gentle slope, a 52-step
    concrete flight (15 cm risers, x 3131 -> 4705, +7.6 m) up the bank, then the plateau and crest.
  - Courtyard (x -8527..-3793, y -2026..3463, flat z=2000): 3 m perimeter walk, cross paths, 9x9 m centre plaza,
    4 maples (/Game/MyStuff/Meshes/SM_CourtyardMaple = copy of SM_MapleTree_Pivot with CTF_UseSimpleAsComplex so only the
    trunk box collides; grass grows under canopies, walk pawn isn't blocked by leaves). CP_Courtyard hotspot moved to the SW
    corner (-8330,-1830,2170) yaw 50 pitch 6 (old spot was inside the SW lawn next to a tree).
  - Grass PCG removes blades under any StaticMeshActor automatically. Trees PCG re-executed (needed a param nudge
    pointBounds.z 500->501 to bust the cache, then restored to 500): its 10 m building sweep now clears a ~20 m corridor
    along the hill path.
  - Planner scripts (layout.py/plan.py/plan2.py) were in the session scratchpad; regenerate from traces if the layout changes.
  - NOT SAVED by MCP (new WP external actors + regenerated PCG partition actors + moved hotspot): user must File > Save All.
  - Packaged build / Netcade stream still has the old site until re-cooked + repackaged.
- 2026-10-29 22:30 EDITOR CRASH (assert SplineComponent.cpp:738 Rotation/Scale point count != Position) while setting
  SplineCurves + bClosedLoop in ONE set_properties call on a new SplineComponent (actor Terrain_BuildingPad, with a
  MeshPartitionEditor.SplineModifier component, for flattening terrain under the walkways). On restart the user restored
  autosaves: all Site/* actors (168 walkway, 79 hill-path files) are on disk in Content; Terrain_BuildingPad was never saved (gone).
  Site actors are spatially loaded -> not loaded in the editor after restart (folders missing until regions load).
  RULE: never set bClosedLoop (or anything that calls UpdateSpline) until SplineCurves read-back shows equal
  Position/Rotation/Scale point counts; set SplineCurves alone first.
- IN PROGRESS (user request): walkways -> /Game/SenseiMaterials/Materials/MI_Concrete; walkway around the building flat + wider
  (level terrain); hill path: no stairs, curvy, gentle slope (level terrain). Terrain edit path: Mesh Partition SplineModifier
  (USplineModifier: closed spline flattens interior, FalloffDistance, WriteMode) on MeshPartition_UAID_9C6B0030B6C72F0A03_1126716664.
  After terrain edits: Build > Mesh Partition > Build Mesh Partition again before packaging.
- 2026-10-29 23:10 SITE REDO (after crash). Safe spline helper (scratchpad splineset.py): resize SplineCurves arrays first keeping
  existing elements (set_properties rejects "size + element change" on arrays, which left 2/4/4 counts -> the crash), then values;
  verify counts; only then touch bClosedLoop (setting bClosedLoop, even to its current value, runs UpdateSpline + OnSplineChanged).
  - Terrain (folder Site/Terrain, Mesh Partition SplineModifiers, WriteMode=Positions):
    Terrain_BuildingPad: closed rect x -11535..2132, y -4640..6062, z 2000, falloff 20 m, FirstLayer.
    Terrain_HillPath: open spline, 117 pts every 2 m at path top -5 cm, plateau 225, falloff 600 (spline scale ramps 0.05->1 over the
      first 17 m so the falloff doesn't lift terrain into the ring), SecondLayer.
    Terrain_Overlook: closed 16-gon r=5 m at overlook z-5, falloff 5 m, SecondLayer.
  - Concrete (folder Site/Concrete, MI_Concrete = triplanar, meshes /Game/MyStuff/Meshes/Site, generated OBJ -> import_file;
    OBJ->UE axis mapping is (x,-y,z) cm; collision CTF_UseComplexAsSimple):
    Site_Walkway_Ring (SM_Site_Walkway): flat 5 m band around the footprint, top z 2004, 30 cm curb.
    Site_HillPath (SM_Site_HillPath): 3.5 m wide, 231 m serpentine from the east door (2027,755) to a 9 m round overlook at
      (~12650,~560) z 3303; max grade 6.5%, no steps. Route optimised on a 2.5 m terrain grid (scratchpad opt.py/genmesh.py).
  - TODO: delete OLD slabs (Site/Walkways, Site/HillPath folders, incl. the 52-step flight) once their regions are loaded;
    courtyard slabs -> MI_Concrete; re-run tree PCG (nudge pointBounds.z 500->501->500) so trees clear the new path; Save All;
    re-run Build Mesh Partition + repackage for the stream.
- 2026-10-30 ULTRA DYNAMIC SKY + WEATHER. User replaced SunSky with Ultra_Dynamic_Sky + Ultra_Dynamic_Weather in /Game/Main.
  Controller: sky = UDS if present (property "Time of Day", 0-2400, set directly; UDS applies it each frame), else SunSky.
  Weather = actor with "Change Weather" custom event, called via reflection, params filled by type (preset object + transition
  seconds, WeatherTransitionSeconds=5). WeatherOptions (11 presets: Clear Skies .. Blizzard; no sand/dust) are soft paths into
  /Game/UltraDynamicSky/Blueprints/Weather_Effects/Weather_Presets -> added that folder to DirectoriesToAlwaysCook (DefaultGame.ini).
  Protocol: UI -> {cmd:"weather", value:"<name>"}; catalog adds weather[] + sky:"uds"|"sunsky"; state adds weather.
  Frontend: "Sun" rail -> "Sky" panel (time slider 0-24 h for UDS with Sunrise/Morning/Noon/Afternoon/Sunset/Night presets,
  weather grid with icons). Level start: Time of Day 704, Animate off, Random Weather Variation Disabled, Weather None.
  Editor DLL NOT rebuilt (module loaded + Live Coding) -> PIE runs old controller until next editor restart/Live Coding compile;
  the packaged game target was built separately.
- 2026-10-30 Repackaged twice (86 s, then 45 s). Cook includes the 13 Weather_Presets. Game log: "sky Ultra Dynamic Sky, weather found".
  EXPOSURE FIX: Config/DefaultEngine.ini r.EyeAdaptation.CachedLightingPreExposure 8 -> 2. UDS uses non-physical light (sun 5 lux,
  moon 0.15), so dusk/night exposure fell to -5.9..-6.4 EV, below the [-4,16] window of 8: Lumen cached lighting clipped (storm sunset
  near black) and the Development build drew a red on-screen warning into the stream. 2 -> safe window [-10,10]. Backup of the ini in
  the session scratchpad. If the sky ever goes back to physical units (~100k lux sun), raise it again.
  VERIFIED on https://archv3d.com (1706x832 H264 30 fps, 0 dropped): catalog shows 0-24 h slider + 11 weather options; Night,
  Sunset+Thunderstorm, Noon+Thunderstorm/Snow, Sunset+Clear all render, no warning after the fix.
  Netcade zip rebuilt (frontend/movie-studio-archviz-netcade.zip, 10/30 09:13) but NOT uploaded; live Netcade item is older.
  Editor DLL still the old controller (module loaded in the editor); PIE gets weather/UDS time after the next editor restart.
- 2026-10-30 TERRAIN: packaged build still had the 10/28 terrain because Build Mesh Partition had not been re-run after the
  10/29 SplineModifier edits. User ran Build > Mesh Partition (09:33, 18/18 sections), repackaged (3570 pkgs) and restarted.
  Visual check in the browser not done yet (interrupted).
- 2026-10-30 GIT: this folder is the repo https://github.com/XtraChase/archv3d (PRIVATE, branch main). gh CLI installed
  (C:\Program Files\GitHub CLI\gh.exe, logged in as XtraChase). Ignored: servers/turn.env, servers/peer_options.json,
  node_modules, frontend/dist, logs, the Netcade zip. servers/*/dist are force-added (their own .gitignores exclude dist)
  so a clone runs after `npm install`; after rebuilding them, `git add -f` again isn't needed (already tracked).
- 2026-10-30 INTERIOR FURNISHING with /Game/BigCompanyArchViz (office prop pack; its demo map Maps_BigCompany not touched).
  Revit placeholders swapped 1:1 at the same spots, then props added. All new actors are StaticMeshActors in outliner folder
  Interior/{Chairs,Desks,Tables,Restrooms,Lounge,DeskProps}, labels AV_<Mesh>_NNNN (3,743 total).
  Mapping: Chair-Task (467) -> SM_ArmchairA (yaw+180); Standing desk 1500x600 (465) -> SM_Desk scaled to footprint;
  Desk 1830 (135) + Table 1830x762 (83) -> SM_OutDoorTable scaled; Sofa (10) -> SM_Sofa_A x0.75; Toilet (116) -> SM_ToiletUnitB
  (pack toilet faces local +Y, so yaw+180, back face on the wall); Sink (96) -> SM_WashBasinB; Urinal (48) -> SM_StandToilet
  (top matched to Revit top). Revit fixtures face local -Y (wall at +Y, found by traces); chairs face their desk (local -Y).
  Desks (600) get MonitorWide facing the chair side + KeyboardA + MouseA; ~40% mug, 22% desk plant, 15% phone; sofa pairs get a
  coffee table + floor plants; half the meeting tables get a PlantB centrepiece. Auditorium seats (1253) and lifts unchanged.
  Revit originals (1,420) are NOT deleted: actor bHidden=true + StaticMeshComponent0 bVisible=false (collision left on; same footprint).
  To revert: delete folder Interior, set those back (refs in the session scratchpad items.json, or select by label prefix
  Furniture_/Plumbing_Fixtures_ in Datasmith).
  Desk props (2,267) have bAffectDynamicIndirectLighting/bAffectDistanceFieldLighting=false (Lumen surface cache budget);
  DefaultEngine.ini r.LumenScene.SurfaceCache.AtlasSize=6144 (was default 4096, oversubscribed 7-11%).
  Needs File > Save All (MCP can't save WP external actors), then repackage to update archv3d.com.
- 2026-10-30 ASSET OPTIMIZATION (for the streaming PC: Pixel Streaming sends video, so assets never reach the browser).
  Audit: build used 196 of 1,857 textures, effective ~830 MB if fully resident (BigCompany 370, UDS 150, grass 120, Fab 100);
  1,922 meshes, Datasmith already Nanite (1,881), the 17 BigCompany meshes were not and had no LODs
  (SM_ArmchairA 12,295 tris x 467 = 5.7M tris, SM_Desk 0.8M).
  Done (all non-destructive, source data kept, assets saved):
  - Nanite ON for the 17 placed BigCompany meshes.
  - MaxTextureSize on 54 textures: 4K -> 2K (furniture, Fab facade, grass/moss, terrain Voronoi, UDS snow/frost/DLWE noise),
    furniture small props -> 1K (keyboard, phone, mug, desk plant, monitor, books, stationery), UDS Real_Stars 8K -> 4K;
    T_PlantE_* NeverStream -> false. Full list with previous values: notes/texture_caps_20261030.txt.
    Kept: UDS StaticClouds_A / clouds_diverse, Building T_Background.
  Result: repackaged (3,661 pkgs) container 937 -> 908 MB despite adding the furniture; Main loads in 1.5 s; stream 1706x776 H264
  30 fps, 0 dropped; no Lumen surface cache warning in game (atlas 6144 active).
  OBSERVED (not caused by this pass as far as known, no earlier interior capture to compare): blotchy Lumen GI noise in the
  unfurnished lobby at any time of day (interior lit only by bounce light). Fix options: interior ceiling lights, or raise Lumen
  Final Gather / Scene Lighting quality in the PostProcessVolume.
  Not touched: PCG trees (104,587 instanced PVE plants) - likely the largest remaining GPU cost; reduce density if FPS headroom needed.

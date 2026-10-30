@echo off
rem Starts the archviz web experience locally:
rem   1. Pixel Streaming signalling + web server (serves frontend\dist) on 127.0.0.1:8080, one viewer at a time.
rem   2. Gateway on port 80 (servers\gateway.mjs): the public entry point. One visitor streams, the rest wait in a
rem      line that shows their place; sessions end after 10 min while others wait, or when idle. Refreshes TURN daily.
rem   3. The packaged Movie_Studio build on /Game/Main, rendering off-screen and streaming to it. Launched by the
rem      gateway, which restarts it if it crashes or stops streaming (viewers keep their place in line meanwhile).
rem It can be left running: TURN credentials are renewed without a restart.
rem Usage: start_experience.bat [windowed] [cloud]
rem   windowed  shows the game window, for debugging
rem   cloud     on the Google Cloud VM (cloud\vm-startup.ps1 runs it at logon): the gateway powers the VM off after
rem             15 idle minutes, and the tunnel uses servers\tunnel-credentials.json. Never use it on the desktop.
setlocal
set ROOT=%~dp0
set WINDOWED=
set CLOUD=
for %%a in (%*) do (
  if /i "%%~a"=="windowed" set WINDOWED=--windowed
  if /i "%%~a"=="cloud" set CLOUD=--idle_shutdown_minutes 15
)
set GAME=%ROOT%..\Packaged\Windows\Movie_Studio.exe
set PLAYER_PORT=80
rem Signalling server's own player/web port; only the gateway should use it.
set SIGNALLING_PORT=8080
set STREAMER_PORT=8888

if not exist "%GAME%" (
  echo Packaged build not found: %GAME%
  echo Package it first ^(see PLAN.md^).
  exit /b 1
)

rem A second copy would fight over the ports; use stop_experience.bat or restart_experience.bat first.
tasklist /fi "IMAGENAME eq Movie_Studio.exe" /nh | findstr /i "Movie_Studio.exe" >nul && (
  echo The experience is already running. Use stop_experience.bat to stop it.
  exit /b 0
)
rem The game isn't running, but a signalling server or tunnel may be left over (e.g. after a crash).
call "%ROOT%stop_experience.bat" >nul

rem ICE servers for browsers and Unreal: Cloudflare TURN credentials if servers\turn.env exists, else STUN only.
node "%ROOT%servers\turn_refresh.mjs"

start "ArchViz signalling" /D "%ROOT%servers\SignallingWebServer" node dist\index.js --serve ^
  --player_port %SIGNALLING_PORT% --streamer_port %STREAMER_PORT% ^
  --http_root "%ROOT%frontend\dist" --homepage index.html --console_messages basic ^
  --peer_options_file "%ROOT%servers\peer_options.json" --max_players 1 --rest_api

rem Queue limits: --session_minutes (while others wait), --idle_minutes_waiting, --idle_minutes_alone.
rem The gateway also launches the game (/Game/Main, off-screen, 1920x1080 start size; the browser then requests its own
rem size, capped by maxStreamResolution in config.js) and restarts it if it crashes or stops streaming.
rem The game log still goes to Saved\Logs\Movie_Studio.log.
start "ArchViz gateway" /D "%ROOT%servers" node gateway.mjs --port %PLAYER_PORT% --upstream %SIGNALLING_PORT% ^
  --session_minutes 10 --idle_minutes_waiting 3 --idle_minutes_alone 15 ^
  --game "%GAME%" --streamer_port %STREAMER_PORT% %WINDOWED% %CLOUD%

rem Public https/wss://archv3d.com (and stream.archv3d.com) -> gateway (named Cloudflare tunnel, see servers\cloudflared.yml).
set CLOUDFLARED=%ProgramFiles(x86)%\cloudflared\cloudflared.exe
rem The tunnel config names the desktop's credentials file; on the VM it sits next to the servers instead.
if defined CLOUD set TUNNEL_CRED_FILE=%ROOT%servers\tunnel-credentials.json
if exist "%CLOUDFLARED%" (
  start "ArchViz tunnel" /min "%CLOUDFLARED%" tunnel --config "%ROOT%servers\cloudflared.yml" run
) else (
  echo cloudflared not found, skipping the public tunnel ^(local only^).
)

echo Experience starting. Open http://127.0.0.1:%PLAYER_PORT%/ locally or https://archv3d.com/ remotely
echo (add ?stats=1 for stream diagnostics).

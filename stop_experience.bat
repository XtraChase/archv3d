@echo off
rem Stops the packaged game, the gateway, the signalling server and the tunnel started by start_experience.bat.
set STREAMER_PORT=8888
set PLAYER_PORT=80
rem Gateway first (node.exe on the player port), so its watchdog doesn't relaunch the game we're about to stop.
rem Only kill node.exe: during PIE streaming the editor itself listens on the streamer port.
for %%n in (%PLAYER_PORT% %STREAMER_PORT%) do (
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%%n .*LISTENING"') do (
    tasklist /fi "PID eq %%p" /fi "IMAGENAME eq node.exe" /nh | findstr /i "node.exe" >nul && taskkill /pid %%p /f >nul 2>&1
  )
)
taskkill /im Movie_Studio.exe /f >nul 2>&1
taskkill /im cloudflared.exe /f >nul 2>&1
echo Stopped.

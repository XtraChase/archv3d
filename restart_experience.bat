@echo off
rem Restarts the experience (game, signalling server, gateway, tunnel). Not needed on a schedule:
rem the gateway renews the TURN credentials daily while it runs.
setlocal
set ROOT=%~dp0
call "%ROOT%stop_experience.bat"
rem Let the ports close before starting again.
ping -n 4 127.0.0.1 >nul
call "%ROOT%start_experience.bat"

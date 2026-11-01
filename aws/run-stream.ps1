# Logon task of the auto-logon user on the archv3d-stream instance (registered by vm-startup.ps1). Waits until this
# boot's sync from the bucket has finished, then runs the freshly synced stream-session.ps1. Kept minimal: Windows may
# start this file before the sync replaces it, so everything that changes lives in stream-session.ps1.
$Root = 'C:\archv3d'
$boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString('o')
$deadline = (Get-Date).AddMinutes(20)
while ((Get-Content "$Root\synced.txt" -ErrorAction SilentlyContinue) -ne $boot) {
  if ((Get-Date) -gt $deadline) {
    # The sync failed (see C:\archv3d\vm-startup.log); don't leave a broken instance billing.
    Stop-Computer -Force
    return
  }
  Start-Sleep -Seconds 3
}
& "$Root\ArchVizWeb\aws\stream-session.ps1"

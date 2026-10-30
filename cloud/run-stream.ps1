# Logon task of the auto-logon user on the archv3d-stream VM (registered by vm-startup.ps1): waits until this boot's
# sync from the bucket has finished, then starts the stream in cloud mode (idle shutdown, VM tunnel credentials).
$Root = 'C:\archv3d'
$boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString('o')
$deadline = (Get-Date).AddMinutes(20)
while ((Get-Content "$Root\synced.txt" -ErrorAction SilentlyContinue) -ne $boot) {
  if ((Get-Date) -gt $deadline) {
    # The sync failed (see C:\archv3d\vm-startup.log); don't leave a broken VM billing.
    Stop-Computer -Force
    return
  }
  Start-Sleep -Seconds 3
}
& "$Root\ArchVizWeb\start_experience.bat" cloud

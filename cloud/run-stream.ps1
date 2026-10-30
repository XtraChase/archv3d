# Logon task of the auto-logon user on the archv3d-stream VM (registered by vm-startup.ps1): waits until this boot's
# sync from the bucket has finished, then starts the stream in cloud mode (idle shutdown, VM tunnel credentials), then
# keeps uploading changed logs to gs://<bucket>/logs/<boot>/ for debugging (the VM may only add files under logs/,
# so each upload is a new, timestamped object).
$Root = 'C:\archv3d'
$Web = "$Root\ArchVizWeb"
$boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
$deadline = (Get-Date).AddMinutes(20)
while ((Get-Content "$Root\synced.txt" -ErrorAction SilentlyContinue) -ne $boot.ToString('o')) {
  if ((Get-Date) -gt $deadline) {
    # The sync failed (see C:\archv3d\vm-startup.log); don't leave a broken VM billing.
    Stop-Computer -Force
    return
  }
  Start-Sleep -Seconds 3
}
& "$Web\start_experience.bat" cloud

# ---- Log upload ------------------------------------------------------------------------------------
$bucket = Invoke-RestMethod -Headers @{ 'Metadata-Flavor' = 'Google' } `
  'http://metadata.google.internal/computeMetadata/v1/instance/attributes/archv3d-bucket'
$gcloud = 'C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'
if (-not (Test-Path $gcloud)) { $gcloud = (Get-Command gcloud.cmd).Source }
$prefix = "gs://$bucket/logs/$($boot.ToString('yyyyMMdd-HHmmss'))"
$game = "$Root\Packaged\Windows\Movie_Studio\Saved"
$uploaded = @{}

while ($true) {
  Start-Sleep -Seconds 60
  $files = @(
    "$Root\vm-startup.log",
    "$Web\servers\gateway.log",
    "$game\Logs\Movie_Studio.log"
  ) + @(Get-ChildItem "$Web\servers\SignallingWebServer\logs\*.log" -ErrorAction SilentlyContinue | ForEach-Object FullName) `
    + @(Get-ChildItem "$game\Crashes" -Recurse -Include *.log, *.runtime-xml -ErrorAction SilentlyContinue | ForEach-Object FullName)
  $stamp = Get-Date -Format 'HHmmss'
  foreach ($file in $files) {
    $item = Get-Item $file -ErrorAction SilentlyContinue
    if (-not $item) { continue }
    $version = "$($item.Length)/$($item.LastWriteTimeUtc.Ticks)"
    if ($uploaded[$file] -eq $version) { continue }
    # Copy first: the game keeps its log open.
    $copy = "$env:TEMP\upload-$($item.Name)"
    Copy-Item $file $copy -Force -ErrorAction SilentlyContinue
    $name = ($file.Substring($Root.Length + 1) -replace '[\\:]', '_')
    & $gcloud storage cp $copy "$prefix/$stamp-$name" --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $uploaded[$file] = $version }
  }
}

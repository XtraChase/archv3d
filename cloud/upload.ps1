# Desktop: uploads what the cloud VM runs to the bucket; the VM syncs it at its next boot (vm-startup.ps1).
#   cloud\upload.ps1              build, servers, page files and scripts (only changed build files are sent)
#   cloud\upload.ps1 -Secrets     also servers\turn.env and the tunnel credentials (first time, or after rotating them)
# Package the game first (..\Packaged\Windows) and run `npm run build` in frontend\.
param(
  [switch]$Secrets,
  # Unreal's prerequisite installers (Visual C++ runtime, GameInput) for the VM; the packaged build doesn't include them.
  [string]$EngineRedist = 'D:\UE_5.8\Engine\Extras\Redist\en-us'
)
# Not 'Stop': gcloud and tar report progress on stderr. Every program call below checks its exit code instead.
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\config.ps1"
$Web = Split-Path $PSScriptRoot
$Build = Join-Path (Split-Path $Web) 'Packaged\Windows'
$tar = "$env:SystemRoot\System32\tar.exe"
$temp = New-Item -ItemType Directory -Force (Join-Path $env:TEMP 'archv3d-upload')

# The program by path ($GCloudExe, config.ps1): PowerShell names are case-insensitive, so `gcloud` inside GCloud would
# call GCloud itself.
function GCloud {
  & $GCloudExe @args 2>&1 | ForEach-Object { "$_" }
  if ($LASTEXITCODE) { throw "gcloud $args failed ($LASTEXITCODE)" }
}

Write-Host 'Packaged build...'
GCloud storage rsync --recursive --delete-unmatched-destination-objects $Build "gs://$Bucket/build"

Write-Host 'Servers...'
# Without secrets, logs, or the workspace junctions (absolute paths into this folder; the VM recreates them).
& $tar -a -c -f "$temp\servers.zip" -C "$Web\servers" `
  --exclude 'turn.env' --exclude 'peer_options.json' --exclude 'tunnel-credentials.json' `
  --exclude 'node_modules/@epicgames-ps' --exclude 'logs' --exclude '*.log' .
if ($LASTEXITCODE) { throw 'zipping servers failed' }
GCloud storage cp "$temp\servers.zip" "gs://$Bucket/web/servers.zip"

Write-Host 'Page files...'
# The stream host only needs the experience page; the site itself is on Cloudflare Pages.
& $tar -a -c -f "$temp\frontend-dist.zip" -C "$Web\frontend\dist" --exclude 'portfolio' .
if ($LASTEXITCODE) { throw 'zipping frontend\dist failed' }
GCloud storage cp "$temp\frontend-dist.zip" "gs://$Bucket/web/frontend-dist.zip"

Write-Host 'Unreal prerequisites...'
GCloud storage cp "$EngineRedist\vc_redist.x64.exe" "$EngineRedist\GameInputRedist.msi" "gs://$Bucket/web/redist/"

Write-Host 'Scripts...'
GCloud storage cp "$Web\start_experience.bat" "$Web\stop_experience.bat" "gs://$Bucket/web/"
GCloud storage cp "$PSScriptRoot\vm-startup.ps1" "$PSScriptRoot\run-stream.ps1" "gs://$Bucket/web/cloud/"

if ($Secrets) {
  Write-Host 'Secrets...'
  $tunnelId = (Select-String '^tunnel:\s*(\S+)' "$Web\servers\cloudflared.yml").Matches[0].Groups[1].Value
  GCloud storage cp "$Web\servers\turn.env" "gs://$Bucket/secrets/turn.env"
  GCloud storage cp "$env:USERPROFILE\.cloudflared\$tunnelId.json" "gs://$Bucket/secrets/tunnel-credentials.json"
}

Remove-Item -Recurse -Force $temp
Write-Host "Uploaded to gs://$Bucket. Restart the VM (or let it wake) to use it."

# Desktop: uploads what the AWS instance runs to the bucket; it syncs at its next boot (vm-startup.ps1).
#   aws\upload.ps1              build, servers, page files, prerequisites and scripts (only changed build files are sent)
#   aws\upload.ps1 -Secrets     also servers\turn.env and the tunnel credentials (first time, or after rotating them)
# Package the game first (..\Packaged\Windows) and run `npm run build` in frontend\.
param(
  [switch]$Secrets,
  # Unreal's prerequisite installers (Visual C++ runtime, GameInput); the packaged build doesn't include them.
  [string]$EngineRedist = 'D:\UE_5.8\Engine\Extras\Redist\en-us'
)
# Not 'Stop': aws and tar report progress on stderr. Every program call below checks its exit code instead.
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\config.ps1"
$Web = Split-Path $PSScriptRoot
$Build = Join-Path (Split-Path $Web) 'Packaged\Windows'
$tar = "$env:SystemRoot\System32\tar.exe"
$temp = New-Item -ItemType Directory -Force (Join-Path $env:TEMP 'archv3d-upload')

function Aws {
  & $AwsExe @args --region $Region --no-progress 2>&1 | ForEach-Object { "$_" } | Where-Object { $_ -notmatch '^(upload|copy|delete):' }
  if ($LASTEXITCODE) { throw "aws $args failed ($LASTEXITCODE)" }
}

Write-Host 'Packaged build...'
# Saved\ holds this PC's logs and settings, not part of the build.
Aws s3 sync $Build "s3://$Bucket/build" --delete --exclude 'Movie_Studio/Saved/*'

Write-Host 'Servers...'
# Without secrets, logs, or the workspace junctions (absolute paths into this folder; the instance recreates them).
& $tar -a -c -f "$temp\servers.zip" -C "$Web\servers" `
  --exclude 'turn.env' --exclude 'peer_options.json' --exclude 'tunnel-credentials.json' `
  --exclude 'node_modules/@epicgames-ps' --exclude 'logs' --exclude '*.log' .
if ($LASTEXITCODE) { throw 'zipping servers failed' }
Aws s3 cp "$temp\servers.zip" "s3://$Bucket/web/servers.zip"

Write-Host 'Page files...'
# The stream host only needs the experience page; the site itself is on Cloudflare Pages.
& $tar -a -c -f "$temp\frontend-dist.zip" -C "$Web\frontend\dist" --exclude 'portfolio' .
if ($LASTEXITCODE) { throw 'zipping frontend\dist failed' }
Aws s3 cp "$temp\frontend-dist.zip" "s3://$Bucket/web/frontend-dist.zip"

Write-Host 'Unreal prerequisites...'
Aws s3 cp "$EngineRedist\vc_redist.x64.exe" "s3://$Bucket/web/redist/vc_redist.x64.exe"
Aws s3 cp "$EngineRedist\GameInputRedist.msi" "s3://$Bucket/web/redist/GameInputRedist.msi"

Write-Host 'Scripts...'
Aws s3 cp "$Web\start_experience.bat" "s3://$Bucket/web/start_experience.bat"
Aws s3 cp "$Web\stop_experience.bat" "s3://$Bucket/web/stop_experience.bat"
foreach ($script in 'vm-startup.ps1', 'run-stream.ps1', 'stream-session.ps1', 'monitor.ps1') {
  Aws s3 cp "$PSScriptRoot\$script" "s3://$Bucket/web/aws/$script"
}

if ($Secrets) {
  Write-Host 'Secrets...'
  $tunnelId = (Select-String '^tunnel:\s*(\S+)' "$Web\servers\cloudflared.yml").Matches[0].Groups[1].Value
  Aws s3 cp "$Web\servers\turn.env" "s3://$Bucket/secrets/turn.env"
  Aws s3 cp "$env:USERPROFILE\.cloudflared\$tunnelId.json" "s3://$Bucket/secrets/tunnel-credentials.json"
}

Remove-Item -Recurse -Force $temp
Write-Host "Uploaded to s3://$Bucket. Restart the instance (or let it wake) to use it."

# Desktop "Start ArchViz Stream" (cloud): lets visitors wake the cloud VM from archv3d.com and starts it now.
# It powers itself off after 15 idle minutes; visitors wake it again from the site. Stops a desktop stream first,
# since both would run the same Cloudflare tunnel.
# Not 'Stop': gcloud reports progress on stderr. Each call checks its exit code instead.
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\config.ps1"
$Web = Split-Path $PSScriptRoot

if (Get-Process Movie_Studio -ErrorAction SilentlyContinue) {
  Write-Host 'Stopping the stream running on this PC...'
  & "$Web\stop_experience.bat" | Out-Null
}
& $GCloudExe compute instances add-labels $Instance --project $Project --zone $Zone --labels archv3d-wake=on --quiet
if ($LASTEXITCODE) { throw 'could not enable waking' }
& $GCloudExe compute instances start $Instance --project $Project --zone $Zone --async --quiet
if ($LASTEXITCODE) { throw 'could not start the VM' }
Write-Host 'Cloud stream on: starting now (about 3-5 minutes), and visitors can wake it from archv3d.com.'

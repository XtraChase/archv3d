# Desktop "Stop ArchViz Stream" (cloud): stops visitors from waking the cloud VM and powers it off now.
# archv3d.com then shows the experiences as Unavailable (red) until stream-on.ps1.
# Not 'Stop': gcloud reports progress on stderr. Each call checks its exit code instead.
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\config.ps1"

& $GCloudExe compute instances add-labels $Instance --project $Project --zone $Zone --labels archv3d-wake=off --quiet
if ($LASTEXITCODE) { throw 'could not disable waking' }
& $GCloudExe compute instances stop $Instance --project $Project --zone $Zone --async --quiet
if ($LASTEXITCODE) { throw 'could not stop the VM' }
Write-Host 'Cloud stream off: the VM is shutting down and visitors can no longer wake it.'

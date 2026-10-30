# Names of the Google Cloud resources for the on-demand stream. Dot-sourced by the other desktop scripts here.
# The control Worker (control/wrangler.jsonc) uses the same project, zone and instance.
$Project = 'archv3d-stream'
$Zone = 'us-central1-a'
$Instance = 'archv3d-stream'
# Private bucket with the packaged build, the servers and the secrets the VM pulls at boot.
$Bucket = 'archv3d-stream-files'

# gcloud: from PATH, else where the Google Cloud SDK installer puts it (desktop shortcuts may start with an old PATH).
$GCloudExe = (Get-Command gcloud.cmd -CommandType Application -ErrorAction SilentlyContinue).Source
if (-not $GCloudExe) { $GCloudExe = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" }

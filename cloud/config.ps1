# Names of the Google Cloud resources for the on-demand stream. Dot-sourced by the other desktop scripts here.
# The control Worker (control/wrangler.jsonc) uses the same project, zone and instance.
$Project = 'archv3d-stream'
$Zone = 'us-central1-a'
$Instance = 'archv3d-stream'
# Private bucket with the packaged build, the servers and the secrets the VM pulls at boot.
$Bucket = 'archv3d-stream-files'

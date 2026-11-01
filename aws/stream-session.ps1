# Run by run-stream.ps1 on the archv3d-stream instance once this boot's sync is done: starts the stream in cloud mode
# (idle shutdown, the instance's tunnel credentials).
$Web = 'C:\archv3d\ArchVizWeb'

# Experiments: extra game arguments from the instance tag archv3d-game-args (e.g. "-nosound"), read through the
# instance metadata, so a different launch needs only a tag change and a restart, not a re-upload.
try {
  $token = Invoke-RestMethod -Method Put -Uri 'http://169.254.169.254/latest/api/token' `
    -Headers @{ 'X-aws-ec2-metadata-token-ttl-seconds' = '60' }
  $extra = Invoke-RestMethod -Uri 'http://169.254.169.254/latest/meta-data/tags/instance/archv3d-game-args' `
    -Headers @{ 'X-aws-ec2-metadata-token' = $token }
  if ($extra) { $env:ARCHVIZ_GAME_ARGS = "$extra".Trim() }
} catch {
  # No such tag: the normal launch.
}

& "$Web\start_experience.bat" cloud

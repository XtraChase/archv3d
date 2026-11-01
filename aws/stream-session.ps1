# Run by run-stream.ps1 on the archv3d-stream instance once this boot's sync is done: starts the stream in cloud mode
# (idle shutdown, the instance's tunnel credentials).
$Web = 'C:\archv3d\ArchVizWeb'

# VP8 (software) instead of the project's H.264: on NVIDIA's cloud vGPU drivers (GCP L4 vWS, AWS A10G Cloud Gaming)
# the NVENC H.264 path leaks ~380 MB/s of committed memory while a viewer streams, until the game dies (0xC0000409).
# With VP8 a session ran 5+ minutes at 25 fps with no growth. The streaming PC keeps hardware H.264.
$gameArgs = @('-ini:Game:[/Script/PixelStreaming2Settings.PixelStreaming2PluginSettings]:Codec=VP8')

# Experiments: extra game arguments from the instance tag archv3d-game-args, read through the instance metadata, so a
# different launch needs only a tag change and a restart, not a re-upload.
try {
  $token = Invoke-RestMethod -Method Put -Uri 'http://169.254.169.254/latest/api/token' `
    -Headers @{ 'X-aws-ec2-metadata-token-ttl-seconds' = '60' }
  $extra = Invoke-RestMethod -Uri 'http://169.254.169.254/latest/meta-data/tags/instance/archv3d-game-args' `
    -Headers @{ 'X-aws-ec2-metadata-token' = $token }
  if ($extra) { $gameArgs += "$extra".Trim() }
} catch {
  # No such tag: the normal launch.
}
$env:ARCHVIZ_GAME_ARGS = $gameArgs -join ' '

& "$Web\start_experience.bat" cloud

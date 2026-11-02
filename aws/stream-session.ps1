# Run by run-stream.ps1 on the archv3d-stream instance once this boot's sync is done: starts the stream in cloud mode
# (idle shutdown, the instance's tunnel credentials).
$Web = 'C:\archv3d\ArchVizWeb'

# Vulkan RHI with the project's hardware H.264. On NVIDIA's cloud vGPU drivers (GCP L4 vWS, AWS A10G Cloud Gaming) the
# default D3D12 NVENC path leaks ~380 MB/s of committed memory while a viewer streams, until the game dies (0xC0000409);
# the Vulkan path (NVENC through CUDA) did not: a 10+ minute session ran at 30 fps with no restarts (2026-11-02).
# Needs the build cooked with SF_VULKAN_SM6 (DefaultEngine.ini). To fall back to software VP8 (25 fps, no leak), set the
# instance tag archv3d-game-args to: -d3d12 -ini:Game:[/Script/PixelStreaming2Settings.PixelStreaming2PluginSettings]:Codec=VP8
$gameArgs = @('-vulkan')

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

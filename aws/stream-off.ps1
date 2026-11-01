# Desktop "Stop ArchViz Stream" (cloud): stops visitors from waking the AWS instance and powers it off now.
# archv3d.com then shows the experiences as Unavailable (red) until stream-on.ps1.
# Not 'Stop': aws reports progress on stderr. Each call checks its exit code instead.
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\config.ps1"

$id = Get-StreamInstanceId
if (-not $id) { Write-Host "No instance named $InstanceName; nothing to stop."; return }
& $AwsExe ec2 create-tags --region $Region --resources $id --tags 'Key=archv3d-wake,Value=off'
if ($LASTEXITCODE) { throw 'could not disable waking' }
& $AwsExe ec2 stop-instances --region $Region --instance-ids $id --output text | Out-Null
if ($LASTEXITCODE) { throw 'could not stop the instance' }
Write-Host 'Cloud stream off: the instance is shutting down and visitors can no longer wake it.'

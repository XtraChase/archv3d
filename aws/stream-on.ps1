# Desktop "Start ArchViz Stream" (cloud): lets visitors wake the AWS instance from archv3d.com and starts it now.
# It powers itself off after 15 idle minutes; visitors wake it again from the site. Stops a desktop stream first,
# since both would run the same Cloudflare tunnel.
# Not 'Stop': aws reports progress on stderr. Each call checks its exit code instead.
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\config.ps1"
$Web = Split-Path $PSScriptRoot

if (Get-Process Movie_Studio -ErrorAction SilentlyContinue) {
  Write-Host 'Stopping the stream running on this PC...'
  & "$Web\stop_experience.bat" | Out-Null
}
$id = Get-StreamInstanceId
if (-not $id) { throw "no instance named $InstanceName in $Region (aws\create-instance.ps1 creates it)" }
& $AwsExe ec2 create-tags --region $Region --resources $id --tags 'Key=archv3d-wake,Value=on'
if ($LASTEXITCODE) { throw 'could not enable waking' }
& $AwsExe ec2 start-instances --region $Region --instance-ids $id --output text | Out-Null
if ($LASTEXITCODE) { throw 'could not start the instance' }
Write-Host 'Cloud stream on: starting now (about 3-5 minutes), and visitors can wake it from archv3d.com.'

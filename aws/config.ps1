# Names of the AWS resources for the on-demand stream. Dot-sourced by the other desktop scripts here.
# The control Worker (control/wrangler.jsonc) uses the same region and instance.
$Region = 'us-west-2'
$InstanceName = 'archv3d-stream'
# NVIDIA A10G, 4 vCPUs, 16 GB RAM; runs the NVIDIA Cloud Gaming driver (the setup Epic's AWS Pixel Streaming guides use).
$InstanceType = 'g5.xlarge'
# Private bucket with the packaged build, the servers and the secrets the instance pulls at boot.
$Bucket = 'archv3d-stream-194184403309'
# IAM role the instance runs as: read the bucket, add files under logs/, download the NVIDIA gaming driver.
$InstanceRole = 'archv3d-stream-vm'

# aws: from PATH, else where Amazon's installer puts it (desktop shortcuts may start with an old PATH).
$AwsExe = (Get-Command aws.exe -CommandType Application -ErrorAction SilentlyContinue).Source
if (-not $AwsExe) { $AwsExe = "$env:ProgramFiles\Amazon\AWSCLIV2\aws.exe" }

# The instance's id, found by its Name tag (it can't be hard-coded: recreating the instance gives a new one).
function Get-StreamInstanceId {
  $id = & $AwsExe ec2 describe-instances --region $Region `
    --filters "Name=tag:Name,Values=$InstanceName" 'Name=instance-state-name,Values=pending,running,stopping,stopped' `
    --query 'Reservations[0].Instances[0].InstanceId' --output text 2>$null
  if ($id -and $id -ne 'None') { $id }
}

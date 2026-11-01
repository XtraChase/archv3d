# Desktop, one time: creates the AWS resources for the on-demand stream (config.ps1 names them) and launches the
# instance. Safe to re-run: existing pieces are kept. Upload the build first (upload.ps1 -Secrets).
#   - the private bucket (public access blocked)
#   - the instance role: read the bucket, add files under logs/ only, read AWS's nvidia-gaming driver bucket
#   - a security group with no inbound rules (the stream leaves through the Cloudflare tunnel)
#   - the g5.xlarge instance: Windows Server 2022, 100 GB gp3, user data from userdata.txt, tag archv3d-wake=on
# Not 'Stop': aws reports some progress on stderr. Each call checks its exit code instead.
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\config.ps1"
function Aws { & $AwsExe @args --region $Region 2>&1 | ForEach-Object { "$_" }; if ($LASTEXITCODE) { throw "aws $args failed ($LASTEXITCODE)" } }
function Exists { & $AwsExe @args --region $Region 2>$null | Out-Null; $LASTEXITCODE -eq 0 }
$temp = New-Item -ItemType Directory -Force (Join-Path $env:TEMP 'archv3d-aws')

# ---- Bucket ----------------------------------------------------------------------------------------
if (-not (Exists s3api head-bucket --bucket $Bucket)) {
  Write-Host "Creating s3://$Bucket"
  Aws s3api create-bucket --bucket $Bucket --create-bucket-configuration "LocationConstraint=$Region" | Out-Null
}
Aws s3api put-public-access-block --bucket $Bucket --public-access-block-configuration `
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true' | Out-Null

# ---- Instance role ---------------------------------------------------------------------------------
if (-not (Exists iam get-role --role-name $InstanceRole)) {
  Write-Host "Creating role $InstanceRole"
  @{
    Version = '2012-10-17'
    Statement = @(@{ Effect = 'Allow'; Principal = @{ Service = 'ec2.amazonaws.com' }; Action = 'sts:AssumeRole' })
  } | ConvertTo-Json -Depth 5 | Set-Content -Encoding ascii "$temp\trust.json"
  Aws iam create-role --role-name $InstanceRole --assume-role-policy-document "file://$temp\trust.json" `
    --description 'archv3d stream instance: read its bucket, add logs, get the NVIDIA gaming driver' | Out-Null
}
@{
  Version = '2012-10-17'
  Statement = @(
    @{ Sid = 'ReadBucket'; Effect = 'Allow'; Action = @('s3:ListBucket'); Resource = "arn:aws:s3:::$Bucket" },
    @{ Sid = 'ReadObjects'; Effect = 'Allow'; Action = @('s3:GetObject'); Resource = "arn:aws:s3:::$Bucket/*" },
    @{ Sid = 'AddLogs'; Effect = 'Allow'; Action = @('s3:PutObject'); Resource = "arn:aws:s3:::$Bucket/logs/*" },
    @{ Sid = 'NvidiaGamingDriver'; Effect = 'Allow'; Action = @('s3:ListBucket', 's3:GetObject')
       Resource = @('arn:aws:s3:::nvidia-gaming', 'arn:aws:s3:::nvidia-gaming/*') }
  )
} | ConvertTo-Json -Depth 6 | Set-Content -Encoding ascii "$temp\policy.json"
Aws iam put-role-policy --role-name $InstanceRole --policy-name 'archv3d-stream-vm' --policy-document "file://$temp\policy.json" | Out-Null
if (-not (Exists iam get-instance-profile --instance-profile-name $InstanceRole)) {
  Aws iam create-instance-profile --instance-profile-name $InstanceRole | Out-Null
  Aws iam add-role-to-instance-profile --instance-profile-name $InstanceRole --role-name $InstanceRole | Out-Null
  Write-Host 'Waiting for the new instance profile to propagate...'
  Start-Sleep -Seconds 15
}

# ---- Security group (no inbound) ---------------------------------------------------------------------
$sg = (& $AwsExe ec2 describe-security-groups --region $Region --filters "Name=group-name,Values=$InstanceName" `
  --query 'SecurityGroups[0].GroupId' --output text 2>$null)
if (-not $sg -or $sg -eq 'None') {
  $sg = (Aws ec2 create-security-group --group-name $InstanceName `
    --description 'archv3d stream: no inbound; leaves through the Cloudflare tunnel' --query GroupId --output text) | Select-Object -Last 1
  Write-Host "Created security group $sg"
}

# ---- Instance --------------------------------------------------------------------------------------
$existing = Get-StreamInstanceId
if ($existing) {
  Write-Host "Instance already exists: $existing"
  return
}
(Get-Content -Raw "$PSScriptRoot\userdata.txt") -replace '__BUCKET__', $Bucket | Set-Content -Encoding ascii "$temp\userdata.txt"
Write-Host "Launching $InstanceType..."
$id = Aws ec2 run-instances `
  --image-id 'resolve:ssm:/aws/service/ami-windows-latest/Windows_Server-2022-English-Full-Base' `
  --instance-type $InstanceType `
  --iam-instance-profile "Name=$InstanceRole" `
  --security-group-ids $sg `
  --user-data "file://$temp\userdata.txt" `
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=100,VolumeType=gp3,DeleteOnTermination=true}' `
  --metadata-options 'HttpTokens=required,HttpEndpoint=enabled,InstanceMetadataTags=enabled' `
  --instance-initiated-shutdown-behavior stop `
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$InstanceName},{Key=archv3d-wake,Value=on}]" `
  --query 'Instances[0].InstanceId' --output text | Select-Object -Last 1
Write-Host "Launched $id. First boot (driver, installs, sync, reboot) takes about 15 minutes."
Remove-Item -Recurse -Force $temp

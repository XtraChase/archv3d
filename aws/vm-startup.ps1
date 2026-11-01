# Runs at every boot of the archv3d-stream EC2 instance, as SYSTEM (the user data downloads it from the bucket and
# runs it; see aws\userdata.txt). First boot: installs the AWS CLI, Node, cloudflared, Unreal's prerequisites and the
# NVIDIA Cloud Gaming driver (with its license), creates the auto-logon user whose logon tasks run the stream
# (run-stream.ps1) and the diagnostics (monitor.ps1), and reboots. Every boot: uploads the logs from before this boot,
# then syncs the packaged build, the servers and the secrets from the bucket (only what changed), so updating the
# stream is aws\upload.ps1 on the desktop and an instance restart.
param([Parameter(Mandatory)] [string]$Bucket, [string]$Region = 'us-west-2')
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Root = 'C:\archv3d'
$Web = "$Root\ArchVizWeb"
$Build = "$Root\Packaged\Windows"
$User = 'streamer'
$NodeVersion = 'v22.14.0'
$Aws = "$env:ProgramFiles\Amazon\AWSCLIV2\aws.exe"
New-Item -ItemType Directory -Force $Root, $Web, $Build | Out-Null
# For monitor.ps1, which uploads logs when the game exits.
Set-Content "$Root\bucket.txt" $Bucket

function Log($message) { "$(Get-Date -Format s) $message" | Out-File -Append -Encoding utf8 "$Root\vm-startup.log" }

# Programs report progress on stderr, which Windows PowerShell turns into errors under 'Stop'; judge by exit code.
function Run([string]$exe) {
  $ErrorActionPreference = 'Continue'
  & $exe @args 2>&1 | ForEach-Object { "$_" } | Out-File -Append -Encoding utf8 "$Root\vm-startup.log"
  if ($LASTEXITCODE) { throw "$exe $args failed ($LASTEXITCODE)" }
}
function AwsCli { Run $Aws @args --region $Region --no-progress }

function Install-Msi($url, $name) {
  Log "installing $name"
  $msi = "$env:TEMP\$name.msi"
  Invoke-WebRequest $url -OutFile $msi
  Start-Process msiexec.exe -Wait -ArgumentList '/i', $msi, '/qn', '/norestart'
}

try {
  Log "boot, bucket $Bucket"
  $needsReboot = $false

  # ---- One-time installs -------------------------------------------------------------------------
  if (-not (Test-Path $Aws)) { Install-Msi 'https://awscli.amazonaws.com/AWSCLIV2.msi' 'awscli' }
  if (-not (Test-Path 'C:\Program Files\nodejs\node.exe')) {
    Install-Msi "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-x64.msi" 'node'
  }
  if (-not (Test-Path "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe")) {
    Install-Msi 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi' 'cloudflared'
  }

  # ---- Logs from before this boot -----------------------------------------------------------------
  # Game, gateway, monitor and boot logs plus Windows errors from the last 3 hours, to s3://<bucket>/logs/boot-*/
  # (the instance may only add files under logs/). Covers runs that crashed or hung.
  $since = (Get-Date).AddHours(-3)
  $prev = "$env:TEMP\archv3d-prev-logs"
  Remove-Item -Recurse -Force $prev -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force $prev | Out-Null
  Get-WinEvent -FilterHashtable @{ LogName = 'Application'; Level = 1, 2, 3; StartTime = $since } -ErrorAction SilentlyContinue |
    Format-List TimeCreated, ProviderName, Id, LevelDisplayName, Message | Out-File -Encoding utf8 "$prev\app-events.log"
  Get-WinEvent -FilterHashtable @{ LogName = 'System'; Level = 1, 2, 3; StartTime = $since } -ErrorAction SilentlyContinue |
    Format-List TimeCreated, ProviderName, Id, LevelDisplayName, Message | Out-File -Encoding utf8 "$prev\system-events.log"
  Get-ChildItem "$Build\Movie_Studio\Saved\Logs\*.log", "$Web\servers\gateway.log", "$Root\monitor.log" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -gt $since } | Copy-Item -Destination $prev -ErrorAction SilentlyContinue
  Get-ChildItem "$Build\Movie_Studio\Saved\Crashes" -Recurse -Include *.log, *.runtime-xml -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -gt $since } |
    ForEach-Object { Copy-Item $_.FullName "$prev\crash-$($_.Directory.Name)-$($_.Name)" -ErrorAction SilentlyContinue }
  if ((Get-ChildItem "$prev\*.log" | Where-Object Length -gt 0)) {
    Log 'uploading logs from before this boot'
    try { AwsCli s3 cp $prev "s3://$Bucket/logs/boot-$(Get-Date -Format 'yyyyMMdd-HHmmss')/" --recursive } catch { Log "log upload failed: $_" }
  }

  # A 48 GB page file. With a viewer moving the camera the game commits 25+ GB of memory while only ~3-4 GB is
  # resident (seen on GCP L4 and AWS A10G: commit limit reached, exit 0xC0000409, with 10 GB of RAM still free). The
  # streaming PC has 128 GB of RAM and never hits the limit; here the page file raises it to ~64 GB without more RAM.
  $pageFileMB = 49152
  $computer = Get-CimInstance Win32_ComputerSystem
  $pageFile = Get-CimInstance Win32_PageFileSetting -ErrorAction SilentlyContinue | Where-Object Name -like 'C:*'
  if ($computer.AutomaticManagedPagefile -or -not $pageFile -or $pageFile.InitialSize -ne $pageFileMB) {
    Log "setting a $pageFileMB MB page file"
    if ($computer.AutomaticManagedPagefile) {
      Set-CimInstance -InputObject $computer -Property @{ AutomaticManagedPagefile = $false }
    }
    $pageFile = Get-CimInstance Win32_PageFileSetting -ErrorAction SilentlyContinue | Where-Object Name -like 'C:*'
    if (-not $pageFile) {
      $pageFile = New-CimInstance -ClassName Win32_PageFileSetting -Property @{ Name = 'C:\pagefile.sys' }
    }
    Set-CimInstance -InputObject $pageFile -Property @{ InitialSize = [uint32]$pageFileMB; MaximumSize = [uint32]$pageFileMB }
    $needsReboot = $true
  }

  # Unreal's runtime prerequisites (Visual C++ runtime, GameInput), which Windows Server lacks and the packaged build
  # doesn't install; without them the game exits at launch. Uploaded from the engine's Extras\Redist by upload.ps1.
  if (-not (Test-Path "$Root\redist.installed")) {
    Log 'installing Unreal prerequisites'
    $redist = "$env:TEMP\archv3d-redist"
    AwsCli s3 cp "s3://$Bucket/web/redist/" $redist --recursive
    Start-Process "$redist\vc_redist.x64.exe" -Wait -ArgumentList '/install', '/quiet', '/norestart'
    if (Test-Path "$redist\GameInputRedist.msi") {
      Start-Process msiexec.exe -Wait -ArgumentList '/i', "$redist\GameInputRedist.msi", '/qn', '/norestart'
    }
    Set-Content "$Root\redist.installed" (Get-Date -Format s)
  }

  # NVIDIA Cloud Gaming driver, from AWS's nvidia-gaming bucket (AWS customers only), licensed by the registry value
  # and certificate below (AWS docs, "Install NVIDIA gaming drivers", driver 591.59 or later).
  if (-not (Test-Path "$Root\nvidia.installed")) {
    Log 'installing the NVIDIA gaming driver'
    $nv = "$env:TEMP\nvidia-gaming"
    Run $Aws s3 cp 's3://nvidia-gaming/windows/latest/' $nv --recursive --region us-east-1 --no-progress
    $installer = Get-ChildItem "$nv\*.exe" | Sort-Object Length -Descending | Select-Object -First 1
    Log "driver installer: $($installer.Name)"
    Start-Process $installer.FullName -Wait -ArgumentList '-s', '-noreboot', '-clean'
    New-Item -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm\Global' -Force | Out-Null
    New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm\Global' -Name 'vGamingMarketplace' `
      -PropertyType DWord -Value 2 -Force | Out-Null
    Invoke-WebRequest 'https://nvidia-gaming.s3.amazonaws.com/GridSwCert-Archive/GridSwCert_2026_03_02.cert' `
      -OutFile "$env:PUBLIC\Documents\GridSwCert.txt"
    Set-Content "$Root\nvidia.installed" $installer.Name
    $needsReboot = $true
  }

  # Auto-logon user: the game renders on the GPU from an interactive session, and its logon tasks start the stream
  # and the diagnostics. Administrator so the gateway may shut the instance down when idle. Its password is random and
  # only kept for auto-logon.
  if (-not (Get-LocalUser $User -ErrorAction SilentlyContinue)) {
    Log "creating user $User with auto-logon"
    $chars = [char[]]'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    $password = (-join (1..28 | ForEach-Object { $chars | Get-Random })) + '!7a'
    New-LocalUser $User -Password (ConvertTo-SecureString $password -AsPlainText -Force) `
      -PasswordNeverExpires -AccountNeverExpires -Description 'Runs the archv3d stream' | Out-Null
    Add-LocalGroupMember Administrators $User
    $winlogon = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
    Set-ItemProperty $winlogon AutoAdminLogon '1'
    Set-ItemProperty $winlogon DefaultUserName $User
    Set-ItemProperty $winlogon DefaultDomainName $env:COMPUTERNAME
    Set-ItemProperty $winlogon DefaultPassword $password
    Get-ScheduledTask ServerManager -ErrorAction SilentlyContinue | Disable-ScheduledTask | Out-Null
    $needsReboot = $true
  }
  foreach ($task in @(
      @{ Name = 'archv3d-stream'; Script = 'run-stream.ps1' },
      @{ Name = 'archv3d-monitor'; Script = 'monitor.ps1' })) {
    if (-not (Get-ScheduledTask $task.Name -ErrorAction SilentlyContinue)) {
      Log "registering the logon task $($task.Name)"
      $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Web\aws\$($task.Script)`"" -WorkingDirectory $Web
      $trigger = New-ScheduledTaskTrigger -AtLogOn -User $User
      $principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Highest
      $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0 -AllowStartIfOnBatteries
      Register-ScheduledTask $task.Name -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
    }
  }

  # ---- Sync from the bucket ----------------------------------------------------------------------
  Log 'syncing the build'
  AwsCli s3 sync "s3://$Bucket/build" $Build --delete --exclude 'Movie_Studio/Saved/*'

  # servers.zip and frontend-dist.zip: extracted again only when the uploaded object changed.
  foreach ($archive in @(
      @{ Name = 'servers.zip'; Target = "$Web\servers" },
      @{ Name = 'frontend-dist.zip'; Target = "$Web\frontend\dist" })) {
    $ErrorActionPreference = 'Continue'
    $etag = "$(& $Aws s3api head-object --bucket $Bucket --key "web/$($archive.Name)" --region $Region --query ETag --output text 2>$null)".Trim()
    $ErrorActionPreference = 'Stop'
    if (-not $etag) { throw "s3://$Bucket/web/$($archive.Name) not found" }
    $marker = "$Root\$($archive.Name).etag"
    if ((Get-Content $marker -ErrorAction SilentlyContinue) -ne $etag) {
      Log "extracting $($archive.Name) ($etag)"
      $zip = "$env:TEMP\$($archive.Name)"
      AwsCli s3 cp "s3://$Bucket/web/$($archive.Name)" $zip
      if (Test-Path $archive.Target) { Remove-Item -Recurse -Force $archive.Target }
      New-Item -ItemType Directory -Force $archive.Target | Out-Null
      Run "$env:SystemRoot\System32\tar.exe" -x -f $zip -C $archive.Target
      Set-Content $marker $etag
    }
  }
  # npm links the signalling server's workspace packages with junctions, which don't survive the zip.
  $links = "$Web\servers\node_modules\@epicgames-ps"
  New-Item -ItemType Directory -Force $links | Out-Null
  foreach ($link in @(
      @{ Name = 'lib-pixelstreamingcommon-ue5.7'; Target = "$Web\servers\Common" },
      @{ Name = 'lib-pixelstreamingsignalling-ue5.7'; Target = "$Web\servers\Signalling" },
      @{ Name = 'wilbur'; Target = "$Web\servers\SignallingWebServer" })) {
    if (-not (Test-Path "$links\$($link.Name)")) {
      New-Item -ItemType Junction -Path "$links\$($link.Name)" -Target $link.Target | Out-Null
    }
  }

  AwsCli s3 cp "s3://$Bucket/web/" $Web --recursive --exclude '*' --include '*.bat'
  AwsCli s3 cp "s3://$Bucket/web/aws/" "$Web\aws" --recursive
  AwsCli s3 cp "s3://$Bucket/secrets/turn.env" "$Web\servers\turn.env"
  AwsCli s3 cp "s3://$Bucket/secrets/tunnel-credentials.json" "$Web\servers\tunnel-credentials.json"

  # run-stream.ps1 waits for this before starting the stream, so it never starts on half-synced files.
  Set-Content "$Root\synced.txt" (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString('o')
  Log 'sync done'

  if ($needsReboot) {
    Log 'rebooting (driver, auto-logon)'
    Restart-Computer -Force
  }
} catch {
  Log "FAILED: $_"
  throw
}

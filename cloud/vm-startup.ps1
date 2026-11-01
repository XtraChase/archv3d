# Runs at every boot of the archv3d-stream VM (metadata windows-startup-script-url), as SYSTEM.
# First boot: installs Node and cloudflared, creates the auto-logon user whose logon task runs the stream
# (cloud\run-stream.ps1), and reboots so the logon happens. Every boot: syncs the packaged build, the servers and the
# secrets from the bucket (only what changed), so updating the cloud stream is cloud\upload.ps1 on the desktop and
# a VM restart. The NVIDIA driver is installed separately by Google's script (metadata sysprep-specialize-script-url).
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Root = 'C:\archv3d'
$Web = "$Root\ArchVizWeb"
$Build = "$Root\Packaged\Windows"
$User = 'streamer'
$NodeVersion = 'v22.14.0'
New-Item -ItemType Directory -Force $Root, $Web, $Build | Out-Null

function Log($message) { "$(Get-Date -Format s) $message" | Out-File -Append -Encoding utf8 "$Root\vm-startup.log" }

function Meta($name) {
  Invoke-RestMethod -Headers @{ 'Metadata-Flavor' = 'Google' } `
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$name"
}

$gcloud = 'C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'
if (-not (Test-Path $gcloud)) { $gcloud = (Get-Command gcloud.cmd).Source }
# gcloud reports progress on stderr, which Windows PowerShell turns into errors under 'Stop' when output is
# redirected (as it is for startup scripts); judge it by exit code and keep its output in the log.
function GCloud {
  $ErrorActionPreference = 'Continue'
  & $gcloud @args --quiet 2>&1 | ForEach-Object { "$_" } | Out-File -Append -Encoding utf8 "$Root\vm-startup.log"
  if ($LASTEXITCODE) { throw "gcloud $args failed ($LASTEXITCODE)" }
}

try {
  $bucket = Meta 'archv3d-bucket'
  Log "boot, bucket $bucket"
  $needsReboot = $false

  # ---- One-time installs -------------------------------------------------------------------------
  if (-not (Test-Path 'C:\Program Files\nodejs\node.exe')) {
    Log "installing Node $NodeVersion"
    $msi = "$env:TEMP\node.msi"
    Invoke-WebRequest "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-x64.msi" -OutFile $msi
    Start-Process msiexec.exe -Wait -ArgumentList '/i', $msi, '/qn', '/norestart'
  }
  if (-not (Test-Path "${env:ProgramFiles(x86)}\cloudflared\cloudflared.exe")) {
    Log 'installing cloudflared'
    $msi = "$env:TEMP\cloudflared.msi"
    Invoke-WebRequest 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi' -OutFile $msi
    Start-Process msiexec.exe -Wait -ArgumentList '/i', $msi, '/qn', '/norestart'
  }

  # Unreal's runtime prerequisites (Visual C++ runtime, GameInput), which Windows Server lacks and the packaged build
  # doesn't install; without them the game exits at launch. Uploaded from the engine's Extras\Redist by upload.ps1.
  if (-not (Test-Path "$Root\redist.installed")) {
    Log 'installing Unreal prerequisites'
    $redist = New-Item -ItemType Directory -Force "$env:TEMP\archv3d-redist"
    GCloud storage cp "gs://$bucket/web/redist/*" "$redist"
    Start-Process "$redist\vc_redist.x64.exe" -Wait -ArgumentList '/install', '/quiet', '/norestart'
    if (Test-Path "$redist\GameInputRedist.msi") {
      Start-Process msiexec.exe -Wait -ArgumentList '/i', "$redist\GameInputRedist.msi", '/qn', '/norestart'
    }
    Set-Content "$Root\redist.installed" (Get-Date -Format s)
  }

  # Auto-logon user: the game renders on the GPU from an interactive session, and its logon task starts the stream.
  # Administrator so the gateway may shut the VM down when idle. Its password is random and only kept for auto-logon.
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
    # No Server Manager popping up in the stream user's session.
    Get-ScheduledTask ServerManager -ErrorAction SilentlyContinue | Disable-ScheduledTask | Out-Null
    $needsReboot = $true
  }
  if (-not (Get-ScheduledTask archv3d-stream -ErrorAction SilentlyContinue)) {
    Log 'registering the logon task'
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
      -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Web\cloud\run-stream.ps1`"" -WorkingDirectory $Web
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $User
    $principal = New-ScheduledTaskPrincipal -UserId $User -LogonType Interactive -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit 0 -AllowStartIfOnBatteries
    Register-ScheduledTask archv3d-stream -Action $action -Trigger $trigger -Principal $principal -Settings $settings | Out-Null
  }

  # ---- Logs from before this boot -----------------------------------------------------------------
  # Game, gateway and boot logs plus Windows application errors from the last 3 hours, to gs://<bucket>/logs/boot-*/
  # (the VM may only add files under logs/). Covers runs that crashed or hung, whatever state the session was in.
  $since = (Get-Date).AddHours(-3)
  $prev = "$env:TEMP\archv3d-prev-logs"
  Remove-Item -Recurse -Force $prev -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force $prev | Out-Null
  Get-WinEvent -FilterHashtable @{ LogName = 'Application'; Level = 1, 2, 3; StartTime = $since } -ErrorAction SilentlyContinue |
    Format-List TimeCreated, ProviderName, Id, LevelDisplayName, Message | Out-File -Encoding utf8 "$prev\app-events.log"
  Get-WinEvent -FilterHashtable @{ LogName = 'System'; Level = 1, 2, 3; StartTime = $since } -ErrorAction SilentlyContinue |
    Format-List TimeCreated, ProviderName, Id, Message | Out-File -Encoding utf8 "$prev\system-errors.log"
  Get-ChildItem "$Build\Movie_Studio\Saved\Logs\*.log", "$Web\servers\gateway.log", "$Root\log-upload.log", "$Root\monitor.log" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -gt $since } | Copy-Item -Destination $prev -ErrorAction SilentlyContinue
  Get-ChildItem "$Build\Movie_Studio\Saved\Crashes" -Recurse -Include *.log, *.runtime-xml -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -gt $since } |
    ForEach-Object { Copy-Item $_.FullName "$prev\crash-$($_.Directory.Name)-$($_.Name)" -ErrorAction SilentlyContinue }
  if (Get-ChildItem $prev) {
    Log 'uploading logs from before this boot'
    try { GCloud storage cp "$prev\*" "gs://$bucket/logs/boot-$(Get-Date -Format 'yyyyMMdd-HHmmss')/" } catch { Log "log upload failed: $_" }
  }

  # ---- Sync from the bucket ----------------------------------------------------------------------
  Log 'syncing the build'
  GCloud storage rsync --recursive --delete-unmatched-destination-objects "gs://$bucket/build" $Build

  # servers.zip and frontend-dist.zip: extracted again only when the uploaded object changed.
  foreach ($archive in @(
      @{ Name = 'servers.zip'; Target = "$Web\servers" },
      @{ Name = 'frontend-dist.zip'; Target = "$Web\frontend\dist" })) {
    $ErrorActionPreference = 'Continue'
    $generation = "$(& $gcloud storage objects describe "gs://$bucket/web/$($archive.Name)" --format='value(generation)' 2>$null)".Trim()
    $ErrorActionPreference = 'Stop'
    if (-not $generation) { throw "gs://$bucket/web/$($archive.Name) not found" }
    $marker = "$Root\$($archive.Name).generation"
    if ((Get-Content $marker -ErrorAction SilentlyContinue) -ne $generation) {
      Log "extracting $($archive.Name) (generation $generation)"
      $zip = "$env:TEMP\$($archive.Name)"
      GCloud storage cp "gs://$bucket/web/$($archive.Name)" $zip
      if (Test-Path $archive.Target) { Remove-Item -Recurse -Force $archive.Target }
      New-Item -ItemType Directory -Force $archive.Target | Out-Null
      $ErrorActionPreference = 'Continue'
      & tar.exe -x -f $zip -C $archive.Target 2>&1 | Out-File -Append -Encoding utf8 "$Root\vm-startup.log"
      $ErrorActionPreference = 'Stop'
      if ($LASTEXITCODE) { throw "extracting $($archive.Name) failed" }
      Set-Content $marker $generation
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

  GCloud storage cp "gs://$bucket/web/*.bat" $Web
  New-Item -ItemType Directory -Force "$Web\cloud" | Out-Null
  GCloud storage cp "gs://$bucket/web/cloud/*" "$Web\cloud"
  GCloud storage cp "gs://$bucket/secrets/turn.env" "$Web\servers\turn.env"
  GCloud storage cp "gs://$bucket/secrets/tunnel-credentials.json" "$Web\servers\tunnel-credentials.json"

  # run-stream.ps1 waits for this before starting the stream, so it never starts on half-synced files.
  Set-Content "$Root\synced.txt" (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString('o')
  Log 'sync done'

  if ($needsReboot) {
    Log 'rebooting for auto-logon'
    Restart-Computer -Force
  }
} catch {
  Log "FAILED: $_"
  throw
}

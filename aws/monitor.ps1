# Diagnostics on the archv3d-stream instance (logon task registered by vm-startup.ps1). Every 2 s appends free RAM,
# the game's memory and the GPU's usage to C:\archv3d\monitor.log, and records each game process's exit code and run
# time. When the game exits it uploads the newest game logs, this log and the gateway log to
# s3://<bucket>/logs/live-<boot>/, so a game that ends without a crash report can be explained right away.
$Root = 'C:\archv3d'
$Web = "$Root\ArchVizWeb"
$out = "$Root\monitor.log"
$gameLogs = "$Root\Packaged\Windows\Movie_Studio\Saved\Logs"
$aws = "$env:ProgramFiles\Amazon\AWSCLIV2\aws.exe"
$bucket = Get-Content "$Root\bucket.txt" -ErrorAction SilentlyContinue
$boot = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString('yyyyMMdd-HHmmss')
$smi = Get-ChildItem 'C:\Windows\System32\nvidia-smi.exe', 'C:\Windows\System32\DriverStore\FileRepository\*\nvidia-smi.exe' `
  -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName

function Write-Line($text) { "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fff') $text" | Out-File -Append -Encoding utf8 $out }

function Send-Logs($why) {
  if (-not $bucket) { return }
  $stamp = Get-Date -Format 'HHmmss'
  $dir = "$env:TEMP\archv3d-live-$stamp"
  New-Item -ItemType Directory -Force $dir | Out-Null
  Get-ChildItem "$gameLogs\*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending |
    Select-Object -First 2 | Copy-Item -Destination $dir -ErrorAction SilentlyContinue
  Copy-Item $out, "$Web\servers\gateway.log" $dir -ErrorAction SilentlyContinue
  $ErrorActionPreference = 'Continue'
  & $aws s3 cp $dir "s3://$bucket/logs/live-$boot/$stamp-$why/" --recursive --region us-west-2 --no-progress 2>&1 | Out-Null
  Write-Line "logs uploaded ($why): exit $LASTEXITCODE"
  Remove-Item -Recurse -Force $dir -ErrorAction SilentlyContinue
}

Write-Line "monitor started (boot $boot, nvidia-smi: $smi)"
if ($smi) { & $smi -q 2>$null | Select-String 'Product Name|License Status|Driver Version' | ForEach-Object { Write-Line "gpu: $($_.Line.Trim())" } }
$game = $null
while ($true) {
  if ($game -and $game.HasExited) {
    Write-Line ('GAME EXITED pid={0} code={1} (0x{2:X8}) after {3:N0} s' -f $game.Id, $game.ExitCode, $game.ExitCode, ((Get-Date) - $game.StartTime).TotalSeconds)
    $game = $null
    Send-Logs 'game-exit'
  }
  if (-not $game) {
    # The packaged build has a small launcher Movie_Studio.exe and the real game under Binaries\Win64, same name.
    $found = Get-Process Movie_Studio -ErrorAction SilentlyContinue | Sort-Object WorkingSet64 -Descending | Select-Object -First 1
    if ($found -and $found.WorkingSet64 -gt 200MB) {
      $null = $found.Handle # a handle now keeps ExitCode readable after the process ends
      $game = $found
      Write-Line "game process pid=$($game.Id) started $($game.StartTime.ToString('HH:mm:ss'))"
    }
  }
  $os = Get-CimInstance Win32_OperatingSystem
  $line = 'freeRAM={0:N0}MB freeCommit={1:N0}MB' -f ($os.FreePhysicalMemory / 1KB), ($os.FreeVirtualMemory / 1KB)
  if ($game -and -not $game.HasExited) {
    $game.Refresh()
    $line += ' game ws={0:N0}MB private={1:N0}MB threads={2} cpu={3:N0}s' -f ($game.WorkingSet64 / 1MB), ($game.PrivateMemorySize64 / 1MB), $game.Threads.Count, $game.TotalProcessorTime.TotalSeconds
  }
  if ($smi) {
    $gpu = & $smi --query-gpu=memory.used,memory.total,utilization.gpu,utilization.encoder,temperature.gpu --format=csv,noheader 2>$null
    $line += " gpu[mem.used,mem.total,util,enc,temp]=$gpu"
  }
  Write-Line $line
  Start-Sleep -Seconds 2
}

# Diagnostics on the archv3d-stream VM (started hidden by stream-session.ps1): every 2 s appends the game's memory,
# free RAM and GPU usage to C:\archv3d\monitor.log, and records each game process's exit code and time, so a game that
# dies without a crash report can be explained. vm-startup.ps1 uploads the file at the next boot.
$out = 'C:\archv3d\monitor.log'
$smi = 'C:\Windows\System32\nvidia-smi.exe'
function Write-Line($text) { "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fff') $text" | Out-File -Append -Encoding utf8 $out }
Write-Line 'monitor started'
$game = $null

while ($true) {
  if (-not $game -or $game.HasExited) {
    if ($game) {
      Write-Line ("GAME EXITED pid={0} code={1} (0x{1:X8}) ran {2:N0} s" -f $game.Id, $game.ExitCode, ((Get-Date) - $game.StartTime).TotalSeconds)
      $game = $null
    }
    $found = Get-Process Movie_Studio-Win64-Shipping, Movie_Studio -ErrorAction SilentlyContinue |
      Where-Object { $_.Path -like '*Binaries*' -or $_.ProcessName -like '*Shipping*' } | Select-Object -First 1
    if (-not $found) { $found = Get-Process Movie_Studio -ErrorAction SilentlyContinue | Select-Object -First 1 }
    if ($found) {
      $null = $found.Handle # keeps a handle so ExitCode is readable after the process ends
      $game = $found
      Write-Line "game process pid=$($game.Id) name=$($game.ProcessName)"
    }
  }
  $os = Get-CimInstance Win32_OperatingSystem
  $line = 'freeRAM={0:N0}MB commitFree={1:N0}MB' -f ($os.FreePhysicalMemory / 1KB), ($os.FreeVirtualMemory / 1KB)
  if ($game -and -not $game.HasExited) {
    $game.Refresh()
    $line += ' game ws={0:N0}MB private={1:N0}MB threads={2}' -f ($game.WorkingSet64 / 1MB), ($game.PrivateMemorySize64 / 1MB), $game.Threads.Count
  }
  if (Test-Path $smi) {
    $gpu = & $smi --query-gpu=memory.used,memory.total,utilization.gpu,utilization.encoder,temperature.gpu --format=csv,noheader 2>$null
    $line += " gpu[used,total,util,enc,temp]=$gpu"
  }
  Write-Line $line
  Start-Sleep -Seconds 2
}

$ok = $false
for ($i = 1; $i -le 40; $i++) {
  try {
    $r = Invoke-WebRequest -Uri http://localhost:7001 -TimeoutSec 3 -UseBasicParsing
    if ($r.StatusCode -eq 200) {
      Write-Host "READY after $($i * 3)s status=$($r.StatusCode)"
      $ok = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 3
  }
}
if (-not $ok) { Write-Host "NOT_READY_YET" }

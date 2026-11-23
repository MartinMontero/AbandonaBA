<#
.SYNOPSIS
  Comprueba que la versión de revisión NO se ve sin iniciar sesión (Cloudflare Access).
.DESCRIPTION
  Pide la URL sin credenciales y sin seguir redirecciones (HttpClient con AllowAutoRedirect = false).
  PASA solo si la respuesta es una redirección al inicio de sesión de Access o un 401/403.
  FALLA ("gate open") si devuelve el sitio (200 con el texto del banner de revisión).
  Si el sitio es alcanzable sin sesión, también muestra X-Robots-Tag.
.EXAMPLE
  .\scripts\check-review-gate.ps1 -Url https://abandonabancoazteca-review.<tu-subdominio>.workers.dev/
#>
param([Parameter(Mandatory = $true)][string]$Url)

$ErrorActionPreference = 'Stop'
$banner = 'VERSIÓN DE REVISIÓN PARA ABOGADOS'

$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$handler.UseCookies = $false
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(30)
try {
  $resp = $client.GetAsync($Url).GetAwaiter().GetResult()
} catch {
  Write-Host "FAIL: no se pudo consultar la URL: $($_.Exception.Message)"
  exit 2
}

$status = [int]$resp.StatusCode
$location = if ($resp.Headers.Location) { $resp.Headers.Location.ToString() } else { '' }
$body = ''
try { $body = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult() } catch { }
$robots = ''
if ($resp.Headers.Contains('X-Robots-Tag')) { $robots = ($resp.Headers.GetValues('X-Robots-Tag') -join ', ') }

Write-Host "Estado HTTP: $status"
if ($location) { Write-Host ("Location: " + $location.Substring(0, [Math]::Min(100, $location.Length)) + '...') }

if ($status -eq 200 -and $body.Contains($banner)) {
  Write-Host 'FAIL "gate open": la URL devolvió el sitio de revisión sin iniciar sesión.'
  if ($robots) { Write-Host "X-Robots-Tag: $robots" } else { Write-Host 'X-Robots-Tag: AUSENTE' }
  exit 1
}
elseif (($status -ge 300 -and $status -lt 400) -and ($location -match 'cloudflareaccess\.com|/cdn-cgi/access/')) {
  Write-Host 'PASS: redirección al inicio de sesión de Cloudflare Access.'
  exit 0
}
elseif ($status -eq 401 -or $status -eq 403) {
  Write-Host "PASS: acceso denegado ($status) sin credenciales."
  exit 0
}
else {
  Write-Host "FAIL: respuesta inesperada ($status). No se puede afirmar que la puerta esté cerrada."
  exit 1
}

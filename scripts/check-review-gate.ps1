<#
.SYNOPSIS
  Comprueba que la versión de revisión NO se ve sin iniciar sesión (Cloudflare Access).
.DESCRIPTION
  Pide la URL sin credenciales y sin seguir redirecciones.
  PASA solo si la respuesta es una redirección al inicio de sesión de Access o un 401/403.
  FALLA ("gate open") si devuelve el sitio (200 con el texto del banner de revisión).
  Si el sitio es alcanzable, también revisa X-Robots-Tag.
.EXAMPLE
  .\scripts\check-review-gate.ps1 -Url https://abandonabancoazteca-review.<tu-subdominio>.workers.dev/
#>
param([Parameter(Mandatory = $true)][string]$Url)

$ErrorActionPreference = 'Stop'
$banner = 'VERSIÓN DE REVISIÓN PARA ABOGADOS'
$result = 'FAIL'

try {
  $r = Invoke-WebRequest -Uri $Url -MaximumRedirection 0 -SkipHttpErrorCheck -UseBasicParsing -TimeoutSec 30
} catch {
  # PowerShell 7 lanza al llegar al límite de redirecciones en algunos casos; se toma la respuesta del error.
  $r = $_.Exception.Response
  if (-not $r) { Write-Host "FAIL: no se pudo consultar la URL: $($_.Exception.Message)"; exit 2 }
}

$status = [int]$r.StatusCode
$location = ''
if ($r.Headers) {
  $h = $r.Headers['Location']
  if ($h) { $location = [string]($h | Select-Object -First 1) }
}
$body = ''
try { $body = [string]$r.Content } catch { }

Write-Host "Estado HTTP: $status"
if ($location) { Write-Host "Location: $location" }

if ($status -eq 200 -and $body.Contains($banner)) {
  Write-Host 'FAIL "gate open": la URL devolvió el sitio de revisión sin iniciar sesión.'
  $robots = $r.Headers['X-Robots-Tag']
  if ($robots) { Write-Host "X-Robots-Tag: $robots" } else { Write-Host 'X-Robots-Tag: AUSENTE' }
  exit 1
}
elseif (($status -ge 300 -and $status -lt 400) -and ($location -match 'cloudflareaccess\.com|/cdn-cgi/access/')) {
  Write-Host 'PASS: redirección al inicio de sesión de Cloudflare Access.'; $result = 'PASS'
}
elseif ($status -eq 401 -or $status -eq 403) {
  Write-Host "PASS: acceso denegado ($status) sin credenciales."; $result = 'PASS'
}
else {
  Write-Host "FAIL: respuesta inesperada ($status). No se puede afirmar que la puerta esté cerrada."
  exit 1
}
if ($result -eq 'PASS') { exit 0 }

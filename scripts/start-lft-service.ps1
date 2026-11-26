# Arranca el servicio lft-rag (services/lft-rag) en 127.0.0.1:8090 para Claude Code y pruebas locales.
# El sitio público YA NO lo usa: /consulta-lft/ corre en Cloudflare (D1 + Vectorize + Workers AI); ver
# scripts/lft-cloudflare-load.ps1. El túnel (-Tunnel) sólo expone esta API local y no hace falta para el sitio.
# Uso (PowerShell, desde la raíz del repositorio):
#
#   .\scripts\start-lft-service.ps1                 # sólo el servicio local (para `npm run preview` con .dev.vars)
#   .\scripts\start-lft-service.ps1 -Tunnel         # servicio + túnel con nombre "lft-legal-rag"
#   .\scripts\start-lft-service.ps1 -Tunnel -TunnelName otro-nombre
#
# El túnel debe existir ya (créalo una vez, revisando antes los túneles y rutas de tu cuenta):
#   npx wrangler tunnel list
#   npx wrangler tunnel create lft-legal-rag
# Luego, en el panel de Cloudflare (Zero Trust → Networks → Tunnels → lft-legal-rag → Public hostnames), apunta un nombre
# público (p. ej. lft-rag.tu-dominio.mx) a http://127.0.0.1:8090. Esa URL va en LFT_RAG_BASE_URL del Worker.
# Este script no crea túneles, no toca rutas DNS ni publica el Worker.
#
# Privacidad: uvicorn corre sin log de accesos; el servicio no guarda preguntas.
param(
  [switch]$Tunnel,
  [string]$TunnelName = 'lft-legal-rag'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$svc = Join-Path $root 'services\lft-rag'
$exe = Join-Path $svc '.venv\Scripts\lft-rag.exe'

if (-not (Test-Path $exe)) {
  Write-Host 'Instalando dependencias del servicio (uv sync)...'
  Push-Location $svc; try { uv sync } finally { Pop-Location }
}
if (-not (Test-Path (Join-Path $svc 'data\index\manifest.json'))) {
  throw "No hay índice. Descarga el PDF oficial a services\lft-rag\data\raw\LFT.pdf y ejecuta: $exe ingest data\raw\LFT.pdf"
}

$server = Start-Process -FilePath $exe -ArgumentList 'serve' -WorkingDirectory $svc -PassThru -NoNewWindow
Write-Host "lft-rag escuchando en http://127.0.0.1:8090 (PID $($server.Id))"

$tunnelProc = $null
try {
  $deadline = (Get-Date).AddSeconds(60)
  do {
    Start-Sleep -Milliseconds 500
    try { $ok = (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8090/health -TimeoutSec 2).StatusCode -eq 200 } catch { $ok = $false }
  } until ($ok -or (Get-Date) -gt $deadline)
  if (-not $ok) { throw 'El servicio no respondió en /health.' }

  if ($Tunnel) {
    Write-Host "Abriendo el túnel '$TunnelName' (wrangler tunnel run usa cloudflared)..."
    # En Windows, 'npx' sin extensión resuelve al script de shell de Unix; Start-Process necesita npx.cmd.
    $npx = (Get-Command npx.cmd -ErrorAction Stop).Source
    $tunnelProc = Start-Process -FilePath $npx -ArgumentList @('wrangler', 'tunnel', 'run', $TunnelName) -WorkingDirectory $root -PassThru -NoNewWindow
  }
  Write-Host 'Ctrl+C para detener.'
  Wait-Process -Id $server.Id
} finally {
  foreach ($p in @($tunnelProc, $server)) { if ($p -and -not $p.HasExited) { taskkill /PID $p.Id /T /F | Out-Null } }
}

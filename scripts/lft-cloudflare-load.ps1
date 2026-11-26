# Carga el índice de «Consulta la LFT» en Cloudflare (D1 + Vectorize). Úsalo cuando la LFT se reforme:
#
#   cd services\lft-rag; .venv\Scripts\lft-rag.exe ingest data\raw\LFT.pdf --force; cd ..\..   # parser determinista
#   $env:CLOUDFLARE_ACCOUNT_ID = '<id de la cuenta>'
#   node scripts\lft-cloudflare-index.mjs                                                       # embeddings bge-m3 + seed
#   powershell -File scripts\lft-cloudflare-load.ps1                                              # este script
#
# Reemplaza por completo la tabla de D1 y vuelve a crear el índice de Vectorize (los ids c0..cN cambian si cambia la ley).
# Mientras corre, la consulta puede devolver «no disponible» o resultados incompletos durante unos minutos.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root '.cache\lft-cf'
foreach ($f in 'seed.sql', 'vectors.ndjson') { if (-not (Test-Path (Join-Path $out $f))) { throw "Falta $f; corre primero node scripts\lft-cloudflare-index.mjs" } }
Push-Location $root
try {
  npx wrangler d1 execute lft-rag --remote -y --file .cache\lft-cf\seed.sql
  npx wrangler vectorize delete lft-articulos --force
  npx wrangler vectorize create lft-articulos --dimensions=1024 --metric=cosine
  npx wrangler vectorize create-metadata-index lft-articulos --property-name=is_transitorio --type=boolean
  npx wrangler vectorize create-metadata-index lft-articulos --property-name=is_derogado --type=boolean
  Write-Host 'Esperando a que los índices de metadatos estén activos (los vectores deben insertarse después)...'
  Start-Sleep -Seconds 30
  npx wrangler vectorize insert lft-articulos --file .cache\lft-cf\vectors.ndjson
  Write-Host 'Listo. Comprueba https://abandonabancoazteca.com/api/lft/estado'
} finally { Pop-Location }

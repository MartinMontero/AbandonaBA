<#
.SYNOPSIS
  Crea en TU cuenta de Cloudflare una aplicación de Access que protege el Worker de revisión, con PIN de un solo uso.
.DESCRIPTION
  *** SIN PROBAR *** Escrito contra la API REST documentada; el esquema exacto de la política
  (decision/include) no se verificó en la documentación. Usa -WhatIf primero. Si falla, usa los pasos del panel
  en docs\REVIEW-DEPLOY.md.
  Lee CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID de variables de entorno y los correos de review-access.local.json
  (archivo que NO se sube a git; ver review-access.example.json).
  Permisos del token: Access: Apps and Policies Write; Access: Organizations, Identity Providers, and Groups Write.
  No hace nada a menos que tú lo ejecutes.
.PARAMETER WorkersDevHost
  Hostname completo del Worker de revisión, p. ej. abandonabancoazteca-review.tusubdominio.workers.dev
.EXAMPLE
  .\scripts\review-access-setup.ps1 -WorkersDevHost abandonabancoazteca-review.tusubdominio.workers.dev -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [Parameter(Mandatory = $true)][string]$WorkersDevHost,
  [string]$ConfigPath = (Join-Path $PSScriptRoot '..\review-access.local.json'),
  [string]$SessionDuration = '24h'
)
$ErrorActionPreference = 'Stop'

$token = $env:CLOUDFLARE_API_TOKEN
$account = $env:CLOUDFLARE_ACCOUNT_ID
if (-not $token -or -not $account) { throw 'Define CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno.' }
if (-not (Test-Path $ConfigPath)) { throw "Falta $ConfigPath. Copia review-access.example.json a review-access.local.json y pon los correos reales." }

$cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$emails = @($cfg.attorneyEmails)
if ($emails.Count -lt 1) { throw 'review-access.local.json no tiene correos en attorneyEmails.' }
if ($emails | Where-Object { $_ -match 'example\.(com|org)$' }) { throw 'Hay correos de ejemplo. Pon correos reales.' }

$base = "https://api.cloudflare.com/client/v4/accounts/$account"
$headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }

Write-Host "Worker: $WorkersDevHost"
Write-Host "Correos permitidos ($($emails.Count)): $($emails -join ', ')"
Write-Host 'Inicio de sesión: PIN de un solo uso enviado al correo (onetimepin).'

$policy = @{
  name     = 'Abogados de revision (permitir por correo)'
  decision = 'allow'
  include  = @($emails | ForEach-Object { @{ email = @{ email = $_ } } })
}

if ($PSCmdlet.ShouldProcess($WorkersDevHost, 'Crear proveedor onetimepin (si falta) y aplicación Access self_hosted')) {
  $idps = (Invoke-RestMethod -Method Get -Uri "$base/access/identity_providers" -Headers $headers).result
  $otp = $idps | Where-Object { $_.type -eq 'onetimepin' } | Select-Object -First 1
  if (-not $otp) {
    $otp = (Invoke-RestMethod -Method Post -Uri "$base/access/identity_providers" -Headers $headers -Body (@{ name = 'One-time PIN login'; type = 'onetimepin'; config = @{} } | ConvertTo-Json -Depth 5)).result
    Write-Host "Proveedor OTP creado: $($otp.id)"
  } else { Write-Host "Proveedor OTP existente: $($otp.id)" }

  $app = @{
    type             = 'self_hosted'
    name             = 'Revision para abogados (abandonabancoazteca-review)'
    domain           = $WorkersDevHost
    session_duration = $SessionDuration
    allowed_idps     = @($otp.id)
    auto_redirect_to_identity = $true
    policies         = @($policy)
  } | ConvertTo-Json -Depth 8
  $res = Invoke-RestMethod -Method Post -Uri "$base/access/apps" -Headers $headers -Body $app
  Write-Host "Aplicación Access creada: $($res.result.id)"
  Write-Host 'Ahora corre scripts\check-review-gate.ps1 contra la URL.'
}
else {
  Write-Host '[WhatIf] Se llamaría: GET/POST /access/identity_providers y POST /access/apps con la política allow por correo. No se creó nada.'
}

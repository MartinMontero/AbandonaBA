# Publicar la versión de revisión para abogados (yo ejecuto)

Todos los pasos son de PowerShell y los ejecutas tú. Nada de esto se ha ejecutado: ni el despliegue ni Access.
Importante: el repositorio de GitHub es público. Access limita **quién puede usar la herramienta en marcha**, no quién puede **leer el código y los textos**.

Antes de empezar: Zero Trust (Access) en el plan gratuito permite 50 usuarios, pero al darlo de alta Cloudflare pide registrar un método de pago aunque no cobra en el plan gratuito (ver `docs/AUDIT.md`). Decide tú si lo aceptas.

## 1. Revisar herramientas (yo ejecuto)
```powershell
node -v
npm -v
cd $HOME\dev\AbandonaBA
npm ci
```
Éxito: versiones impresas y `npm ci` termina sin errores.

## 2. Iniciar sesión en Cloudflare (yo ejecuto)
```powershell
npx wrangler login
npx wrangler whoami
```
Éxito: `whoami` muestra tu cuenta.

## 3. Construir la versión de revisión (yo ejecuto)
```powershell
npm run build:review
```
Éxito: aparece `post-build review: ... páginas` y existe la carpeta `dist-review`.

## 4. Desplegar el Worker de revisión (yo ejecuto, solo cuando des el visto bueno)
```powershell
npx wrangler deploy --env review
```
Éxito: imprime una URL `https://abandonabancoazteca-review.<tu-subdominio>.workers.dev`. **A partir de aquí el sitio es público hasta que completes el paso 5.** Haz el paso 5 de inmediato, o no despliegues hasta tener Access listo. Alternativa más segura: haz el paso 5 antes si tu subdominio de workers.dev ya existe.

## 5. Proteger con Cloudflare Access

### Opción A: panel (recomendada; es el método documentado) (yo ejecuto)
1. Entra a `https://dash.cloudflare.com` › Workers & Pages › `abandonabancoazteca-review`.
2. Abre la pestaña **Access** (o Settings › Domains & Routes) y pulsa **Protect this Worker behind Access**; elige **All traffic**.
3. En Zero Trust › Settings › Authentication, agrega el método **One-time PIN** si no existe.
4. En Zero Trust › Access › Applications, abre la aplicación creada. En la política **Allow**, agrega una regla **Emails** con cada correo de abogado. Quita cualquier regla más amplia (por ejemplo, «Emails ending in»).
5. En la aplicación, en «Login methods», deja solo **One-time PIN**.
Éxito: abrir la URL en una ventana privada te lleva a una pantalla de inicio de sesión de Access.

### Opción B: script (SIN PROBAR) (yo ejecuto)
```powershell
Copy-Item review-access.example.json review-access.local.json
notepad review-access.local.json
$env:CLOUDFLARE_API_TOKEN = Read-Host "Token de API"
$env:CLOUDFLARE_ACCOUNT_ID = Read-Host "ID de cuenta"
.\scripts\review-access-setup.ps1 -WorkersDevHost abandonabancoazteca-review.TUSUBDOMINIO.workers.dev -WhatIf
.\scripts\review-access-setup.ps1 -WorkersDevHost abandonabancoazteca-review.TUSUBDOMINIO.workers.dev
```
`review-access.local.json` no se sube a git. El token necesita: Access: Apps and Policies Write y Access: Organizations, Identity Providers, and Groups Write. Éxito: el modo `-WhatIf` imprime lo que crearía; el real imprime el id de la aplicación. Si falla, usa la Opción A. El esquema de la política no se verificó en la documentación.

## 6. Comprobar que la puerta está cerrada (yo ejecuto)
```powershell
.\scripts\check-review-gate.ps1 -Url https://abandonabancoazteca-review.TUSUBDOMINIO.workers.dev/
```
Éxito: imprime `PASS` (redirección a Access o 401/403). Si imprime `FAIL "gate open"`, el sitio está abierto: pasa al paso 9 (retirar) y revisa Access. Esta comprobación contra un despliegue real con Access está **sin probar**; contra el servidor local (sin Access) se probó que reporta `FAIL "gate open"`.

## 7. Probar a mano (yo ejecuto)
1. Ventana privada, correo **que no está** en la lista: debe ser bloqueado (no llega PIN o dice acceso denegado).
2. Ventana privada, correo **de la lista**: llega un PIN por correo; al escribirlo se ve el sitio con el banner morado «VERSIÓN DE REVISIÓN PARA ABOGADOS».

## 8. Agregar o quitar un abogado (yo ejecuto)
En Zero Trust › Access › Applications › la aplicación › Policies › Allow: agrega o quita el correo en la regla **Emails** y guarda. (Si usaste el script, edita `review-access.local.json` y repite el panel; el script crea una aplicación nueva, no edita.)

## 9. Retirar la versión de revisión (yo ejecuto)
```powershell
npx wrangler delete --env review
```
Después, en Zero Trust › Access › Applications, borra la aplicación de revisión. Éxito: la URL deja de responder.

## Datos para el paquete del abogado
El enlace y el método de acceso se completan en `docs/review-pack/LEEME.es.md` (marcado `[COMPLETAR]`). Genera el paquete con `npm run build:review` y luego `npm run review-pack`.

#!/usr/bin/env bash
# Configura de forma idempotente el túnel nombrado, DNS, Service Token y Access App (Zero Trust) para legal-rag.
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?Define CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Define CLOUDFLARE_ACCOUNT_ID}"
: "${CF_ACCESS_TEAM_NAME:?Define CF_ACCESS_TEAM_NAME (subdominio de cloudflareaccess.com)}"

TUNNEL_NAME="${TUNNEL_NAME:-legal-rag-origin}"
TUNNEL_HOSTNAME="${TUNNEL_HOSTNAME:-legal-rag.abandonabancoazteca.com}"
APP_NAME="${APP_NAME:-Legal RAG Origin}"
TOKEN_NAME="${TOKEN_NAME:-legal-rag-worker-primary}"
API="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}"

cf_api() {
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -fsS -X "$method" "${API}${path}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$body"
  else
    curl -fsS -X "$method" "${API}${path}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
  fi
}

echo "==> 1. Verificando Service Token (${TOKEN_NAME})..."
TOKENS_JSON="$(cf_api GET "/access/service_tokens")"
TOKEN_ID="$(printf '%s' "$TOKENS_JSON" | jq -r --arg n "$TOKEN_NAME" '.result[] | select(.name == $n) | .id' | head -n1)"
CLIENT_ID=""
CLIENT_SECRET=""
if [[ -z "$TOKEN_ID" ]]; then
  CREATED_TOK="$(cf_api POST "/access/service_tokens" "$(jq -nc --arg n "$TOKEN_NAME" '{name: $n, duration: "8760h"}')")"
  TOKEN_ID="$(printf '%s' "$CREATED_TOK" | jq -r '.result.id')"
  CLIENT_ID="$(printf '%s' "$CREATED_TOK" | jq -r '.result.client_id')"
  CLIENT_SECRET="$(printf '%s' "$CREATED_TOK" | jq -r '.result.client_secret')"
  echo "    Service Token creado: id=${TOKEN_ID} client_id=${CLIENT_ID}"
  echo "    IMPORTANTE: guarda CF_ACCESS_CLIENT_SECRET en el Worker con 'wrangler secret bulk' (no se vuelve a mostrar)."
else
  CLIENT_ID="$(printf '%s' "$TOKENS_JSON" | jq -r --arg id "$TOKEN_ID" '.result[] | select(.id == $id) | .client_id')"
  echo "    Service Token existente: id=${TOKEN_ID} client_id=${CLIENT_ID}"
fi

echo "==> 2. Verificando Self-Hosted Access App (${TUNNEL_HOSTNAME})..."
APPS_JSON="$(cf_api GET "/access/apps")"
APP_ID="$(printf '%s' "$APPS_JSON" | jq -r --arg d "$TUNNEL_HOSTNAME" '.result[] | select(.domain == $d) | .id' | head -n1)"
if [[ -z "$APP_ID" ]]; then
  APP_PAYLOAD="$(jq -nc --arg n "$APP_NAME" --arg d "$TUNNEL_HOSTNAME" '{
    name: $n,
    domain: $d,
    type: "self_hosted",
    session_duration: "24h",
    app_launcher_visible: false,
    service_auth_401_redirect: false
  }')"
  CREATED_APP="$(cf_api POST "/access/apps" "$APP_PAYLOAD")"
  APP_ID="$(printf '%s' "$CREATED_APP" | jq -r '.result.id')"
  AUD_TAG="$(printf '%s' "$CREATED_APP" | jq -r '.result.aud')"
else
  AUD_TAG="$(printf '%s' "$APPS_JSON" | jq -r --arg id "$APP_ID" '.result[] | select(.id == $id) | .aud')"
fi
echo "    Access App: id=${APP_ID} CF_ACCESS_AUD=${AUD_TAG}"

echo "==> 3. Verificando política Service Auth..."
POLICIES_JSON="$(cf_api GET "/access/apps/${APP_ID}/policies")"
POL_ID="$(printf '%s' "$POLICIES_JSON" | jq -r '.result[] | select(.decision == "non_identity") | .id' | head -n1)"
if [[ -z "$POL_ID" ]]; then
  POL_PAYLOAD="$(jq -nc --arg tid "$TOKEN_ID" '{
    name: "service: legal-rag-worker",
    decision: "non_identity",
    precedence: 1,
    include: [{ service_token: { token_id: $tid } }]
  }')"
  POL_ID="$(cf_api POST "/access/apps/${APP_ID}/policies" "$POL_PAYLOAD" | jq -r '.result.id')"
fi
echo "    Policy Service Auth: id=${POL_ID}"

echo "==> 4. Verificando túnel nombrado (${TUNNEL_NAME})..."
if command -v cloudflared >/dev/null 2>&1; then
  if ! cloudflared tunnel list --output json | jq -e --arg n "$TUNNEL_NAME" '.[] | select(.name == $n)' >/dev/null 2>&1; then
    cloudflared tunnel create "$TUNNEL_NAME"
  fi
  TUNNEL_UUID="$(cloudflared tunnel list --output json | jq -r --arg n "$TUNNEL_NAME" '.[] | select(.name == $n) | .id' | head -n1)"
  cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$TUNNEL_HOSTNAME" || true
  echo "    Tunnel UUID=${TUNNEL_UUID} -> ${TUNNEL_HOSTNAME}"
else
  echo "    cloudflared no encontrado en PATH; omite creación local del túnel."
fi

echo "==> Listo. Configura en services/lft-rag/.env:"
echo "    CF_ACCESS_TEAM_DOMAIN=${CF_ACCESS_TEAM_NAME}"
echo "    CF_ACCESS_AUD=${AUD_TAG}"
if [[ -n "$CLIENT_SECRET" ]]; then
  printf '{"CF_ACCESS_CLIENT_ID":"%s","CF_ACCESS_CLIENT_SECRET":"%s"}\n' "$CLIENT_ID" "$CLIENT_SECRET" | npx wrangler secret bulk
fi

#!/usr/bin/env bash
# Rotación sin tiempo de inactividad de CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET.
# Uso: ./ops/rotate-service-token.sh [--keep-previous]
set -euo pipefail

: "${CLOUDFLARE_API_TOKEN:?Define CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Define CLOUDFLARE_ACCOUNT_ID}"
: "${TUNNEL_HOSTNAME:?Define TUNNEL_HOSTNAME (ej. legal-rag.abandonabancoazteca.com)}"

KEEP_PREVIOUS=false
for arg in "$@"; do
  case "$arg" in
    --keep-previous) KEEP_PREVIOUS=true ;;
    *) echo "Argumento desconocido: $arg" >&2; exit 2 ;;
  esac
done

GRACE_SECONDS="${GRACE_SECONDS:-60}"
TOKEN_PREFIX="${TOKEN_PREFIX:-legal-rag-worker-}"
API="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
NEW_NAME="${TOKEN_PREFIX}${TS}"

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

echo "==> 1. Creando token solapado: ${NEW_NAME}"
CREATED="$(cf_api POST "/access/service_tokens" "$(jq -nc --arg n "$NEW_NAME" '{name: $n, duration: "8760h"}')")"
NEW_ID="$(printf '%s' "$CREATED" | jq -r '.result.id')"
NEW_CLIENT_ID="$(printf '%s' "$CREATED" | jq -r '.result.client_id')"
NEW_CLIENT_SECRET="$(printf '%s' "$CREATED" | jq -r '.result.client_secret')"

if [[ -n "${CF_ACCESS_APP_ID:-}" && -n "${CF_ACCESS_POLICY_ID:-}" ]]; then
  echo "==> Adjuntando ${NEW_ID} a la política Service Auth existente (solapamiento activo)"
  CUR_POL="$(cf_api GET "/access/apps/${CF_ACCESS_APP_ID}/policies/${CF_ACCESS_POLICY_ID}")"
  UPDATED_POL="$(printf '%s' "$CUR_POL" | jq -c --arg tid "$NEW_ID" '{
    name: .result.name,
    decision: .result.decision,
    precedence: .result.precedence,
    include: (.result.include + [{ service_token: { token_id: $tid } }])
  }')"
  cf_api PUT "/access/apps/${CF_ACCESS_APP_ID}/policies/${CF_ACCESS_POLICY_ID}" "$UPDATED_POL" >/dev/null
fi

echo "==> 2. Sonda previa en el borde: https://${TUNNEL_HOSTNAME}/health"
PROBE_OK=false
for attempt in 1 2 3 4 5; do
  STATUS="$(curl -sS -o /dev/null -w '%{http_code}' \
    -H "CF-Access-Client-Id: ${NEW_CLIENT_ID}" \
    -H "CF-Access-Client-Secret: ${NEW_CLIENT_SECRET}" \
    "https://${TUNNEL_HOSTNAME}/health" || echo "000")"
  if [[ "$STATUS" == "200" ]]; then
    PROBE_OK=true
    break
  fi
  echo "    Intento ${attempt}/5 devolvió HTTP ${STATUS}; esperando propagación..."
  sleep $((attempt * 2))
done

if [[ "$PROBE_OK" != "true" ]]; then
  echo "ERROR: La sonda previa falló. Revocando token nuevo y abortando sin tocar los secretos del Worker." >&2
  cf_api DELETE "/access/service_tokens/${NEW_ID}" >/dev/null || true
  exit 1
fi

echo "==> 3. Actualizando secretos del Worker de forma atómica (stdin, sin archivo en disco)"
WRANGLER_ENV_ARGS=()
if [[ -n "${WRANGLER_ENV:-}" ]]; then
  WRANGLER_ENV_ARGS=(--env "$WRANGLER_ENV")
fi
printf '{"CF_ACCESS_CLIENT_ID":"%s","CF_ACCESS_CLIENT_SECRET":"%s"}\n' "$NEW_CLIENT_ID" "$NEW_CLIENT_SECRET" \
  | npx wrangler secret bulk "${WRANGLER_ENV_ARGS[@]}"

echo "==> 4. Ventana de gracia de ${GRACE_SECONDS}s para propagación..."
sleep "$GRACE_SECONDS"

if [[ -n "${WORKER_HEALTH_URL:-}" ]]; then
  W_CODE="$(curl -sS -o /dev/null -w '%{http_code}' "$WORKER_HEALTH_URL" || echo "000")"
  if [[ "$W_CODE" != "200" ]]; then
    echo "ADVERTENCIA: ${WORKER_HEALTH_URL} devolvió HTTP ${W_CODE}; se omite revocación de tokens previos." >&2
    exit 1
  fi
fi

echo "==> 5. Revocando tokens previos (${TOKEN_PREFIX}*)"
TOKENS_JSON="$(cf_api GET "/access/service_tokens")"
OLD_IDS="$(printf '%s' "$TOKENS_JSON" | jq -r --arg p "$TOKEN_PREFIX" --arg cur "$NEW_ID" '
  [.result[] | select(.name | startswith($p)) | select(.id != $cur)]
  | sort_by(.created_at) | reverse | .[].id
')"

KEPT=0
for oid in $OLD_IDS; do
  if [[ "$KEEP_PREVIOUS" == "true" && "$KEPT" -eq 0 ]]; then
    KEPT=1
    echo "    Conservando token de respaldo previo: ${oid}"
    continue
  fi
  cf_api DELETE "/access/service_tokens/${oid}" >/dev/null
  echo "    Revocado token previo: ${oid}"
done

echo "==> Rotación completada con éxito (token activo: ${NEW_NAME})."

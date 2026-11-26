#!/usr/bin/env bash
# Unified OS daemon controller for Mexican Legal RAG API + Cloudflare Tunnel.
# Supports macOS (launchd LaunchAgents) and Linux (systemd --user units).
# Usage: ops/service-ctl.sh {install|uninstall|start|stop|restart|status|logs|healthcheck}

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
OS_NAME="$(uname -s)"

API_LABEL="com.abandonabancoazteca.legal-rag-api"
TUNNEL_LABEL="com.abandonabancoazteca.legal-rag-tunnel"
HEALTH_URL="${LEGAL_RAG_HEALTH_URL:-http://127.0.0.1:8090/health}"

usage() {
  echo "Usage: $0 {install|uninstall|start|stop|restart|status|logs|healthcheck}" >&2
  exit 1
}

CMD="${1:-}"
[[ -n "${CMD}" ]] || usage

if [[ "${OS_NAME}" != "Darwin" && "${OS_NAME}" != "Linux" ]]; then
  echo "[service-ctl] Unsupported OS '${OS_NAME}'. Daemon management requires macOS (launchd) or Linux (systemd)."
  echo "[service-ctl] On Windows, run manually: services/lft-rag/.venv/Scripts/python.exe -m src.cli serve"
  exit 0
fi

CLOUDFLARED_BIN="$(command -v cloudflared || echo "/usr/local/bin/cloudflared")"

render_template() {
  local src="$1"
  local dst="$2"
  local log_dir="$3"
  sed \
    -e "s|__PROJECT_DIR__|${PROJECT_DIR}|g" \
    -e "s|__CLOUDFLARED_BIN__|${CLOUDFLARED_BIN}|g" \
    -e "s|__HOME__|${HOME}|g" \
    -e "s|__LOG_DIR__|${log_dir}|g" \
    "${src}" > "${dst}"
}

healthcheck() {
  local attempts="${1:-15}"
  local i=1
  while [[ "${i}" -le "${attempts}" ]]; do
    if curl -fsS --max-time 3 "${HEALTH_URL}" >/dev/null 2>&1; then
      echo "[healthcheck] OK: ${HEALTH_URL}"
      curl -fsS --max-time 3 "${HEALTH_URL}"
      echo ""
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "[healthcheck] FAILED: ${HEALTH_URL} did not respond after ${attempts}s" >&2
  return 1
}

if [[ "${OS_NAME}" == "Darwin" ]]; then
  AGENT_DIR="${HOME}/Library/LaunchAgents"
  LOG_DIR="${HOME}/Library/Logs/abandonabancoazteca"
  UID_NUM="$(id -u)"
  API_PLIST="${AGENT_DIR}/${API_LABEL}.plist"
  TUNNEL_PLIST="${AGENT_DIR}/${TUNNEL_LABEL}.plist"

  case "${CMD}" in
    install)
      mkdir -p "${AGENT_DIR}" "${LOG_DIR}"
      render_template "${SCRIPT_DIR}/launchd/${API_LABEL}.plist" "${API_PLIST}" "${LOG_DIR}"
      render_template "${SCRIPT_DIR}/launchd/${TUNNEL_LABEL}.plist" "${TUNNEL_PLIST}" "${LOG_DIR}"
      # Periodic newsyslog / simple size rotation note
      if [[ -d "/etc/newsyslog.d" ]] && [[ -w "/etc/newsyslog.d" ]]; then
        cat > "/etc/newsyslog.d/abandonabancoazteca-legal-rag.conf" <<EOF
${LOG_DIR}/legal-rag-api.out.log     644  5     10240  *     JN
${LOG_DIR}/legal-rag-api.err.log     644  5     10240  *     JN
${LOG_DIR}/legal-rag-tunnel.out.log  644  5     10240  *     JN
${LOG_DIR}/legal-rag-tunnel.err.log  644  5     10240  *     JN
EOF
      fi
      launchctl bootout "gui/${UID_NUM}" "${API_PLIST}" >/dev/null 2>&1 || true
      launchctl bootout "gui/${UID_NUM}" "${TUNNEL_PLIST}" >/dev/null 2>&1 || true
      launchctl bootstrap "gui/${UID_NUM}" "${API_PLIST}"
      if [[ -f "${HOME}/.cloudflared/legal-rag-origin.yml" ]]; then
        launchctl bootstrap "gui/${UID_NUM}" "${TUNNEL_PLIST}"
      else
        echo "[service-ctl] Skipping tunnel bootstrap (~/.cloudflared/legal-rag-origin.yml not found)."
      fi
      healthcheck 15
      ;;
    uninstall)
      launchctl bootout "gui/${UID_NUM}" "${TUNNEL_PLIST}" >/dev/null 2>&1 || true
      launchctl bootout "gui/${UID_NUM}" "${API_PLIST}" >/dev/null 2>&1 || true
      rm -f "${API_PLIST}" "${TUNNEL_PLIST}"
      echo "[service-ctl] Uninstalled launchd agents."
      ;;
    start)
      launchctl kickstart -k "gui/${UID_NUM}/${API_LABEL}"
      [[ -f "${TUNNEL_PLIST}" ]] && launchctl kickstart -k "gui/${UID_NUM}/${TUNNEL_LABEL}" || true
      healthcheck 15
      ;;
    stop)
      launchctl bootout "gui/${UID_NUM}" "${TUNNEL_PLIST}" >/dev/null 2>&1 || true
      launchctl bootout "gui/${UID_NUM}" "${API_PLIST}" >/dev/null 2>&1 || true
      ;;
    restart)
      launchctl kickstart -k "gui/${UID_NUM}/${API_LABEL}"
      [[ -f "${TUNNEL_PLIST}" ]] && launchctl kickstart -k "gui/${UID_NUM}/${TUNNEL_LABEL}" || true
      healthcheck 15
      ;;
    status)
      launchctl print "gui/${UID_NUM}/${API_LABEL}" 2>&1 | head -n 30 || true
      launchctl print "gui/${UID_NUM}/${TUNNEL_LABEL}" 2>&1 | head -n 20 || true
      ;;
    logs)
      tail -n 100 "${LOG_DIR}"/legal-rag-*.log 2>/dev/null || echo "No logs in ${LOG_DIR}"
      ;;
    healthcheck)
      healthcheck 5
      ;;
    *)
      usage
      ;;
  esac
else
  UNIT_DIR="${HOME}/.config/systemd/user"
  API_UNIT="legal-rag-api.service"
  TUNNEL_UNIT="legal-rag-tunnel.service"

  case "${CMD}" in
    install)
      mkdir -p "${UNIT_DIR}"
      render_template "${SCRIPT_DIR}/systemd/${API_UNIT}" "${UNIT_DIR}/${API_UNIT}" "/var/log"
      render_template "${SCRIPT_DIR}/systemd/${TUNNEL_UNIT}" "${UNIT_DIR}/${TUNNEL_UNIT}" "/var/log"
      systemctl --user daemon-reload
      systemctl --user enable --now "${API_UNIT}"
      if [[ -f "${HOME}/.cloudflared/legal-rag-origin.yml" ]]; then
        systemctl --user enable --now "${TUNNEL_UNIT}"
      else
        echo "[service-ctl] Skipping tunnel unit (~/.cloudflared/legal-rag-origin.yml not found)."
      fi
      healthcheck 15
      ;;
    uninstall)
      systemctl --user disable --now "${TUNNEL_UNIT}" >/dev/null 2>&1 || true
      systemctl --user disable --now "${API_UNIT}" >/dev/null 2>&1 || true
      rm -f "${UNIT_DIR}/${API_UNIT}" "${UNIT_DIR}/${TUNNEL_UNIT}"
      systemctl --user daemon-reload
      echo "[service-ctl] Uninstalled systemd user units."
      ;;
    start)
      systemctl --user start "${API_UNIT}"
      [[ -f "${UNIT_DIR}/${TUNNEL_UNIT}" ]] && systemctl --user start "${TUNNEL_UNIT}" || true
      healthcheck 15
      ;;
    stop)
      systemctl --user stop "${TUNNEL_UNIT}" >/dev/null 2>&1 || true
      systemctl --user stop "${API_UNIT}" >/dev/null 2>&1 || true
      ;;
    restart)
      systemctl --user restart "${API_UNIT}"
      [[ -f "${UNIT_DIR}/${TUNNEL_UNIT}" ]] && systemctl --user restart "${TUNNEL_UNIT}" || true
      healthcheck 15
      ;;
    status)
      systemctl --user status "${API_UNIT}" "${TUNNEL_UNIT}" --no-pager || true
      ;;
    logs)
      journalctl --user -u "${API_UNIT}" -u "${TUNNEL_UNIT}" -n 100 --no-pager
      ;;
    healthcheck)
      healthcheck 5
      ;;
    *)
      usage
      ;;
  esac
fi

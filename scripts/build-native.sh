#!/usr/bin/env bash
# ==============================================================================
# ProCam Viewer v4.1 — Кроссплатформенная сборка для Windows и Linux
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
WINDOWS_DIR="${ROOT_DIR}/dist/windows"
LINUX_DIR="${ROOT_DIR}/dist/linux"

echo "================================================================"
echo "  Сборка ProCam Viewer v4.1 (Windows x64 & Linux x64)"
echo "================================================================"

mkdir -p "${LINUX_DIR}" "${WINDOWS_DIR}"

# 1. Сборка бинарника для Linux (ELF 64-bit)
echo "[1/2] Компиляция Linux x64: dist/linux/ProCamViewer_Linux_x64..."
cd "${WINDOWS_DIR}"
GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o "${LINUX_DIR}/ProCamViewer_Linux_x64"
chmod +x "${LINUX_DIR}/ProCamViewer_Linux_x64"
echo "  ✔ Успешно: ${LINUX_DIR}/ProCamViewer_Linux_x64"

# 2. Сборка бинарника для Windows (PE32+ GUI x64 с иконкой)
echo "[2/2] Компиляция Windows x64: dist/windows/ProCamViewer_Windows_x64.exe..."
GOOS=windows GOARCH=amd64 go build -ldflags="-s -w -H=windowsgui" -o "${WINDOWS_DIR}/ProCamViewer_Windows_x64.exe"
echo "  ✔ Успешно: ${WINDOWS_DIR}/ProCamViewer_Windows_x64.exe"

echo "================================================================"
echo "  ✔ Кроссплатформенная сборка успешно завершена!"
echo "================================================================"

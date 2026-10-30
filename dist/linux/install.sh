#!/usr/bin/env bash
# ==============================================================================
# ProCam Viewer v4.1 — Автоматический установщик для Linux (Ubuntu / Debian / Arch)
# ==============================================================================
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/Yeeerniyaz/procam-viewer/main"
REPO_REL="https://github.com/Yeeerniyaz/procam-viewer/releases/latest/download"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" 2>/dev/null && pwd || pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." 2>/dev/null && pwd || pwd)"

echo "================================================================"
echo "  Установка ProCam Viewer v4.1 (Engineering CCTV Suite for Linux)"
echo "================================================================"

if [[ $EUID -ne 0 ]]; then
  echo "[!] Запустите установщик с правами администратора: sudo bash install.sh"
  exit 1
fi

install -d /usr/local/bin \
  /usr/share/pixmaps \
  /usr/share/icons/hicolor/64x64/apps \
  /usr/share/icons/hicolor/256x256/apps \
  /usr/share/icons/hicolor/512x512/apps \
  /usr/share/icons/hicolor/scalable/apps \
  /usr/share/applications

# 1. Главное графическое приложение (ProCamViewer_Linux_x64)
if [[ -f "${SCRIPT_DIR}/ProCamViewer_Linux_x64" ]]; then
  install -m 0755 "${SCRIPT_DIR}/ProCamViewer_Linux_x64" /usr/local/bin/ProCamViewer_Linux_x64
elif [[ -f "${ROOT_DIR}/dist/linux/ProCamViewer_Linux_x64" ]]; then
  install -m 0755 "${ROOT_DIR}/dist/linux/ProCamViewer_Linux_x64" /usr/local/bin/ProCamViewer_Linux_x64
else
  echo "[1/3] Скачивание графического приложения ProCamViewer_Linux_x64..."
  curl -fsSL "${REPO_REL}/ProCamViewer_Linux_x64" -o /usr/local/bin/ProCamViewer_Linux_x64
  chmod 0755 /usr/local/bin/ProCamViewer_Linux_x64
fi
ln -sf /usr/local/bin/ProCamViewer_Linux_x64 /usr/local/bin/procam-viewer-gui
ln -sf /usr/local/bin/ProCamViewer_Linux_x64 /usr/local/bin/procam-viewer

# 2. Фирменная иконка Кибер-Совы
if [[ -f "${ROOT_DIR}/assets/procam-viewer-256.png" ]]; then
  install -m 0644 "${ROOT_DIR}/assets/procam-viewer-256.png" /usr/share/pixmaps/procam-viewer.png
  install -m 0644 "${ROOT_DIR}/assets/procam-viewer-256.png" /usr/share/icons/hicolor/256x256/apps/procam-viewer.png
fi

if [[ -f "${ROOT_DIR}/assets/procam-viewer.png" ]]; then
  install -m 0644 "${ROOT_DIR}/assets/procam-viewer.png" /usr/share/icons/hicolor/512x512/apps/procam-viewer.png
fi
if [[ -f "${ROOT_DIR}/assets/procam-viewer-64.png" ]]; then
  install -m 0644 "${ROOT_DIR}/assets/procam-viewer-64.png" /usr/share/icons/hicolor/64x64/apps/procam-viewer.png
fi
if [[ -f "${ROOT_DIR}/assets/procam-viewer.svg" ]]; then
  install -m 0644 "${ROOT_DIR}/assets/procam-viewer.svg" /usr/share/icons/hicolor/scalable/apps/procam-viewer.svg
fi
gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true

# 3. Ярлык в меню приложений (.desktop)
if [[ -f "${SCRIPT_DIR}/procam-viewer.desktop" ]]; then
  install -m 0644 "${SCRIPT_DIR}/procam-viewer.desktop" /usr/share/applications/procam-viewer.desktop
else
  cat > /usr/share/applications/procam-viewer.desktop << 'EOF'
[Desktop Entry]
Version=4.1
Type=Application
Name=ProCam Viewer
GenericName=Просмотр и диагностика IP-камер
Comment=Инженерный мультиэкранный комплекс просмотра и диагностики видеопотоков IP-камер ProCam
Exec=/usr/local/bin/ProCamViewer_Linux_x64
Icon=/usr/share/pixmaps/procam-viewer.png
Terminal=false
Categories=Network;Utility;Security;AudioVideo;Video;
StartupWMClass=ProCamViewer
EOF
  chmod 0644 /usr/share/applications/procam-viewer.desktop
fi

for id in ProCamViewer 127.0.0.1 crx__127_0_0_1 chrome-http___127.0.0.1_8768_-Default; do
  cat > "/usr/share/applications/${id}.desktop" << EOF
[Desktop Entry]
Version=4.1
Type=Application
Name=ProCam Viewer
Exec=/usr/local/bin/ProCamViewer_Linux_x64
Icon=/usr/share/pixmaps/procam-viewer.png
Terminal=false
NoDisplay=true
StartupWMClass=${id}
EOF
  chmod 0644 "/usr/share/applications/${id}.desktop"
done

update-desktop-database /usr/share/applications 2>/dev/null || true

echo "================================================================"
echo "  ✔ ProCam Viewer v4.1 успешно установлен!"
echo "  • Запуск из меню приложений:  ProCam Viewer"
echo "  • Запуск из терминала:        ProCamViewer_Linux_x64"
echo "================================================================"

<div align="center">
  <img src="assets/procam-viewer.png" width="110" height="110" alt="ProCam Viewer Cyber-Owl Logo" />
  <h1>ProCam Viewer v4.1 — Engineering Surveillance Suite</h1>
  <p><b>Кроссплатформенный комплекс мультиэкранного просмотра, мониторинга и диагностики IP-камер видеонаблюдения Hikvision, HiWatch, Dahua и ONVIF (Windows & Linux)</b></p>

  <p>
    <a href="https://github.com/Yeeerniyaz/procam-viewer/releases/latest/download/ProCamViewer_Windows_x64.exe">
      <img src="https://img.shields.io/badge/Скачать_для_Windows-ProCamViewer__Windows__x64.exe-09090B?style=for-the-badge&logo=windows&logoColor=10B981" alt="Download Windows" />
    </a>
    <a href="https://github.com/Yeeerniyaz/procam-viewer/releases/latest/download/ProCamViewer_Linux_x64">
      <img src="https://img.shields.io/badge/Скачать_для_Linux-ProCamViewer__Linux__x64-09090B?style=for-the-badge&logo=linux&logoColor=10B981" alt="Download Linux" />
    </a>
    <a href="PROCAM_VIEWER_MANUAL_RU.pdf">
      <img src="https://img.shields.io/badge/Инструкция_(PDF)-На_русском_языке-10B981?style=for-the-badge&logo=adobeacrobatreader&logoColor=09090B" alt="PDF Manual" />
    </a>
  </p>
</div>

---

## 📸 Возможности ProCam Viewer v4.1

1. **Мультиэкранная матрица видеонаблюдения (Video Grid):**
   - Переключение сеток: **1×1**, **2×2**, **3×3**, **4×4** и **Полноэкранный режим (F11)**.
   - Живое отображение видеокадров, наложение AI-детекции (люди, транспорт), OSD-таймстемпы и телеметрия в реальном времени.

2. **Адаптивное переключение Main Stream / Sub Stream:**
   - В каждой ячейке доступен мгновенный переключатель между основным потоком (высокое разрешение 4K/4МП, H.265+) и субпотоком (D1/640×360, 15 FPS) для снижения нагрузки на процессор и сеть.

3. **Инженерная карточка диагностики видеопотока:**
   - Полный анализ выбранного канала: видеокодек (H.265+, H.265, H.264), разрешение, битрейт, порты RTSP (554), ONVIF (80), SDK (8000/37777).
   - Измерение реального сетевого пинга до камеры, джиттера, стабильности соединения и мгновенный тест авторизации по логину/паролю.

4. **Системный терминал логов в реальном времени:**
   - Моноширинный журнал событий с отметками времени `[HH:MM:SS]` и детализацией подключений RTSP, WS-Discovery, смены потоков и скриншотов.

5. **Снятие мгновенных скриншотов и экспорт конфигурации:**
   - Захват стоп-кадров высокого разрешения в 1 клик с сохранением файла на диск.
   - Экспорт и импорт полной конфигурации камер и раскладок в формате JSON, создание M3U8-плейлистов для VLC.

6. **Двухуровневый сетевой сканер и работа с двумя сетями:**
   - Автоматический поиск камер через Hikvision SADP, Dahua DHIP и ONVIF WS-Discovery.
   - Поддержка одновременного подключения по кабелю к PoE-свитчу и по Wi-Fi к интернету без потери связи.

---

## 💻 Установка и запуск

### Windows 10 / 11 (x64)
Портативная версия со встроенной иконкой Кибер-Совы:
1. Скачайте [**ProCamViewer_Windows_x64.exe**](https://github.com/Yeeerniyaz/procam-viewer/releases/latest/download/ProCamViewer_Windows_x64.exe).
2. Запустите файл (для привязки сетевых адаптеров рекомендуется запуск от имени Администратора).

---

### Linux (Ubuntu / Debian / Arch / Mint — x64)

#### Вариант 1: Установка одной командой
```bash
curl -fsSL https://raw.githubusercontent.com/Yeeerniyaz/procam-viewer/main/dist/linux/install.sh | sudo bash
```
Установщик:
* Добавляет бинарник `ProCamViewer_Linux_x64` в `/usr/local/bin/`.
* Устанавливает иконки в `/usr/share/pixmaps/` и `/usr/share/icons/hicolor/`.
* Создает ярлык **ProCam Viewer** в системном меню приложений (`procam-viewer.desktop`).

#### Вариант 2: Запуск из папки проекта
```bash
chmod +x dist/linux/ProCamViewer_Linux_x64
./dist/linux/ProCamViewer_Linux_x64
```

---

## 🛠️ Сборка из исходников

```bash
# 1. Установка npm-зависимостей и сборка веб-интерфейса
npm install
npm run build:web

# 2. Компиляция нативных бинарников для Linux и Windows
bash scripts/build-native.sh
```

---

## 📞 Техническая поддержка и монтаж видеонаблюдения — ProCam (Алматы)
* **Телефон / WhatsApp:** [+7 (706) 606-63-23](https://wa.me/77066066323) · `+7 (776) 606-63-23`
* **Оборудование:** Hikvision, HiWatch, Dahua, Uniview, Tiandy
* **Полное руководство (PDF):** [PROCAM_VIEWER_MANUAL_RU.pdf](PROCAM_VIEWER_MANUAL_RU.pdf)

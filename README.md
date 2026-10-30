<div align="center">
  <img src="assets/procam-viewer.png" width="110" height="110" alt="ProCam Viewer Cyber-Owl Logo" />
  <h1>ProCam Viewer v4.1 — Engineering Surveillance Suite</h1>
  <p><b>Кроссплатформенный комплекс мультиэкранного просмотра, мониторинга и диагностики IP-камер и многоканальных NVR-видеорегистраторов Hikvision, HiWatch, Dahua и ONVIF (Windows & Linux)</b></p>

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

1. **Реальная поддержка Hikvision ISAPI & Digest Authentication:**
   - Полная совместимость со строгой аутентификацией Digest (RFC 2617 / RFC 7616).
   - Опрос системной информации устройства через `/ISAPI/System/deviceInfo` (модель, серийный номер, версия прошивки).
   - Автоматический опрос каналов NVR через `/ISAPI/Streaming/channels` и `/ISAPI/ContentMgmt/InputProxy/channels`.
   - Захват живых стоп-кадров (снапшотов) через `/ISAPI/Streaming/channels/${ID}/picture` с сохранением на диск.

2. **Работа с многоканальными NVR / Регистраторами (4 / 8 / 16 / 32 канала):**
   - Автоматическая генерация RTSP-потоков Hikvision:
     * **Основной поток (Main):** `rtsp://user:pass@IP:554/Streaming/Channels/${N}01`
     * **Субпоток (Sub):** `rtsp://user:pass@IP:554/Streaming/Channels/${N}02`
   - Иерархическое отображение NVR в виде раскрывающейся группы в боковой панели.
   - Быстрая кнопка **«Заполнить сетку каналами NVR»** — автоматический подбор раскладки (`2x2`, `3x3`, `4x4`) под количество активных камер регистратора.

3. **Мультиэкранная матрица видеонаблюдения (Video Grid):**
   - Раскладки: **1×1**, **2×2**, **3×3**, **4×4** и **Полноэкранный режим (F11)**.
   - Независимое переключение между Main Stream и Sub Stream для каждого канала.
   - Разворот выбранной камеры в 1x1 с автоматическим переходом на максимальный битрейт и качество.

4. **Персистентность и чистый рабочий процесс:**
   - Никаких захардкоженных демо-камер или фейковых логов.
   - Автоматическое сохранение добавленных устройств на диск в `~/.config/procam-viewer/devices.json` (Linux) и `%APPDATA%\procam-viewer\devices.json` (Windows) с зеркалированием в `localStorage`.
   - Информативное состояние «Парк устройств пуст» с быстрым добавлением камер.

5. **Инженерная карточка диагностики видеопотока:**
   - Телеметрия выбранного канала: видеокодек (H.265+, H.265, H.264), разрешение, битрейт, порты RTSP (554), ISAPI/HTTP (80).
   - Измерение реального сетевого пинга до узла, статуса портов и мгновенная проверка Digest-авторизации.
   - Копирование готовой RTSP-ссылки в один клик.

6. **Системный терминал логов в реальном времени:**
   - Моноширинный журнал реальных сетевых и ISAPI событий с отметками времени `[HH:MM:SS]`.
   - Экспорт журнала в текстовый файл и быстрая очистка.

7. **Экспорт конфигурации и плейлистов:**
   - Экспорт полного профиля устройств в структурированный JSON для резервного копирования и миграции.
   - Генерация M3U8-плейлиста всех активных RTSP-потоков для сторонних видеоплееров (VLC, PotPlayer).

---

## 💻 Установка и запуск

### Windows 10 / 11 (x64)
Портативная версия со встроенной иконкой Кибер-Совы:
1. Скачайте [**ProCamViewer_Windows_x64.exe**](https://github.com/Yeeerniyaz/procam-viewer/releases/latest/download/ProCamViewer_Windows_x64.exe).
2. Запустите файл (для сканирования сети рекомендуется запуск от имени Администратора).

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

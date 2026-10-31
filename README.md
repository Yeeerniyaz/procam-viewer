<div align="center">
  <img src="assets/procam-viewer.png" width="110" height="110" alt="ProCam VMS Cyber-Owl Logo" />
  <h1>ProCam VMS v4.2 — Professional Engineering Surveillance Suite</h1>
  <p><b>Профессиональная кроссплатформенная VMS-система видеонаблюдения для IP-камер и многоканальных NVR (Hikvision ISAPI, Dahua CGI, ONVIF Profile S/G/T) для Windows и Linux</b></p>

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

## 📸 Архитектура рабочих модулей ProCam VMS

ProCam VMS спроектирован по модульному стандарту пультов централизованного наблюдения (VMS) с разделением на 4 ключевых рабочих пространства:

### 1. Модуль «Основной ракурс (Live View)»
* **Максимальная полезная площадь видеостены (85–90% экрана)** с ультратонкими 1px рамками.
* **Сетки до 64 камер:**
  - Стандартные матрицы: `1x1` (1), `2x2` (4), `3x3` (9), `4x4` (16), `5x5` (25), `6x6` (36), `7x7` (49), `8x8` (64).
  - Комбинированные коридорные/акцентные раскладки: `1+5` (6), `1+7` (8), `1+12` (13), `2+8` (10), `1+1+12` (14).
* **Пагинация и Автотур (Patrol):** циклическое перелистывание страниц камер или сохраненных ракурсов с интервалами 5с, 10с, 30с, 60с.
* **Интерактивные ячейки видеостены:**
  - Drag & Drop перетаскивание камер из дерева и обмен ячейками между собой.
  - Двойной клик по ячейке: мгновенный разворот 1x1 с автоматическим переходом на Main Stream (HD), повторный клик — возврат в матрицу на Sub Stream (SD).
  - Цифровой зум (Digital Zoom) колесиком мыши (до 4x) с панорамированием зажатой левой кнопкой мыши.
  - Контекстный оверлей: стоп-кадр, запись отрезка, PTZ, звук, HD/SD, закрыть ячейку.
* **Иерархическое дерево устройств и пользовательские ракурсы:**
  - Двойной клик по NVR заполняет сетку всеми его каналами.
  - Сохранение и быстрый вызов ракурсов («Периметр», «Склад 36 камер», «Кассы»).
* **Складное PTZ-управление:** 8-позиционный джойстик, Зум +/-, Фокус +/-, вызов и запись пресетов через Hikvision ISAPI.

### 2. Модуль «Удаленное воспроизведение (Playback)»
* Синхронный просмотр архива NVR на 1, 4 или 9 каналах.
* Календарь выбора даты и опрос архива NVR по ISAPI (`/ISAPI/ContentMgmt/search`).
* 24-часовая интерактивная шкала времени (Timeline Scrubber) с цветовой индикацией:
  - **Синий:** постоянная запись 24/7.
  - **Желтый/Красный:** детекция движения и тревожные события.
* Мгновенный переход по клику на шкалу, покадровый шаг, регулировка скорости от `0.5x` до `16x`.

### 3. Модуль «Управление устройствами (Device Management)»
* Таблица подключенных устройств с полной телеметрией: IP, тип (NVR/IPC), статус и пинг, порты, протокол, модель, серийный номер, версия прошивки.
* Нижний блок «Онлайн-устройства в сети (Автопоиск / Радар)»: многопротокольный сканер сети (ONVIF WS-Discovery, Hikvision SADP, Dahua DHDiscover, ARP) с кнопкой **«+ Добавить выбранные в VMS»** в 1 клик.

### 4. Модуль «События и консоль (Event Center & Logs)»
* Инженерная карточка диагностики видеопотоков: видеокодек, разрешение/FPS, битрейт, сетевой джиттер и задержка, Digest-авторизация, копирование активной RTSP-ссылки.
* Системный терминал с фильтрами по уровням (INFO, RTSP, ISAPI, NET, WARN), поиском и экспортом в TXT.

---

## 💻 Установка и запуск

### Windows 10 / 11 (x64)
1. Скачайте [**ProCamViewer_Windows_x64.exe**](https://github.com/Yeeerniyaz/procam-viewer/releases/latest/download/ProCamViewer_Windows_x64.exe).
2. Запустите файл (для привязки сетевых адаптеров и L2-радара рекомендуется запуск от имени Администратора).

---

### Linux (Ubuntu / Debian / Arch / Mint — x64)

#### Установка одной командой
```bash
curl -fsSL https://raw.githubusercontent.com/Yeeerniyaz/procam-viewer/main/dist/linux/install.sh | sudo bash
```
Бинарник устанавливается в `/usr/local/bin/`, создаются ярлыки в меню приложений (`procam-viewer.desktop`) и иконки.

#### Запуск из папки проекта
```bash
chmod +x ProCamViewer_Linux_x64
./ProCamViewer_Linux_x64
```

---

## 🛠️ Сборка из исходников

```bash
# 1. Установка npm-зависимостей и сборка веб-пакета
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

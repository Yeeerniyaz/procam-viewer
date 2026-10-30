#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import sys

def generate_pdf(pdf_path):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        KeepTogether,
    )

    font_reg = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    font_bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    font_mono = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

    base_font = "Helvetica"
    bold_font = "Helvetica-Bold"
    mono_font = "Courier"

    if os.path.exists(font_reg):
        pdfmetrics.registerFont(TTFont("DejaVuSans", font_reg))
        base_font = "DejaVuSans"
    if os.path.exists(font_bold):
        pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", font_bold))
        bold_font = "DejaVuSans-Bold"
    if os.path.exists(font_mono):
        pdfmetrics.registerFont(TTFont("DejaVuSansMono", font_mono))
        mono_font = "DejaVuSansMono"

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title="Руководство пользователя ProCam Viewer v4.1",
    )

    styles = getSampleStyleSheet()
    h1_style = ParagraphStyle(
        "ProCamH1",
        parent=styles["Heading1"],
        fontName=bold_font,
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#09090B"),
        spaceAfter=3,
    )
    h2_style = ParagraphStyle(
        "ProCamH2",
        parent=styles["Heading2"],
        fontName=bold_font,
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#09090B"),
        spaceBefore=8,
        spaceAfter=3,
    )
    body_style = ParagraphStyle(
        "ProCamBody",
        parent=styles["Normal"],
        fontName=base_font,
        fontSize=8.6,
        leading=12.2,
        textColor=colors.HexColor("#18181B"),
        spaceAfter=3,
    )
    card_style = ParagraphStyle(
        "ProCamCard",
        parent=styles["Normal"],
        fontName=base_font,
        fontSize=8.4,
        leading=11.8,
        textColor=colors.HexColor("#18181B"),
        backColor=colors.HexColor("#FAFAFA"),
        borderColor=colors.HexColor("#E4E4E7"),
        borderWidth=0.6,
        borderPadding=5,
        spaceAfter=4,
    )

    elements = []

    # Header Table
    header_data = [
        [
            Paragraph("<b>PROCAM VIEWER v4.1</b><br/><font size=7 color='#10B981'><b>СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ · ИНЖЕНЕРНЫЙ КОМПЛЕКС</b></font>", h1_style),
            Paragraph("<font size=7 color='#52525B'>Инженерный комплекс мониторинга, мультиэкранного просмотра и диагностики IP-камер<br/>Windows & Linux (x64) · ProCam Алматы</font>", body_style)
        ]
    ]
    t_head = Table(header_data, colWidths=[100 * mm, 82 * mm])
    t_head.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-1), 1.2, colors.HexColor("#10B981")),
    ]))
    elements.append(t_head)
    elements.append(Spacer(1, 4 * mm))

    # Section 1: Overview
    elements.append(Paragraph("1. НАЗНАЧЕНИЕ И АРХИТЕКТУРА", h2_style))
    elements.append(Paragraph(
        "<b>ProCam Viewer</b> — профессиональный инженерный программный комплекс для мультиэкранного просмотра, оперативного мониторинга и углубленной диагностики видеопотоков IP-камер и сетевых видеорегистраторов (NVR/XVR) <b>Hikvision, HiWatch, Dahua, Uniview, Tiandy и стандартных ONVIF Profile S/G/T</b>.",
        body_style
    ))
    elements.append(Paragraph(
        "<b>Ключевые преимущества:</b><br/>"
        "• <b>Адаптивная видеосетка:</b> режимы 1×1, 2×2, 3×3, 4×4 и режим полного экрана (Fullscreen).<br/>"
        "• <b>Мгновенный выбор Main / Sub:</b> переключение между основным потоком высокого разрешения и экономичным субпотоком на лету.<br/>"
        "• <b>Инженерная карточка диагностики:</b> анализ H.264/H.265+, битрейта, разрешения, открытых портов (554, 80, 8000), пинга и джиттера.<br/>"
        "• <b>Системный журнал в реальном времени:</b> фиксация событий подключения, сбоев потока и скриншотов с таймстемпами [HH:MM:SS].<br/>"
        "• <b>Сетевая интеграция с ProCam Radar:</b> сканирование сети по протоколам SADP, DHIP и WS-Discovery с поддержкой одновременной работы Wi-Fi и кабеля.",
        card_style
    ))

    # Section 2: Layouts & Streams
    elements.append(Paragraph("2. РАСКЛАДКИ СЕТКИ И УПРАВЛЕНИЕ ПОТОКАМИ", h2_style))
    elements.append(Paragraph(
        "В верхней панели управления сеткой доступны переключатели <b>1×1</b>, <b>2×2</b>, <b>3×3</b>, <b>4×4</b>. "
        "Каждая ячейка камеры оборудована независимым оверлеем с отображением имени, IP-адреса, реального FPS и битрейта. "
        "Кнопки ячейки позволяют выполнить:<br/>"
        "1. <b>Main / Sub</b> — переключение профиля RTSP для оптимизации загрузки процессора и сетевого канала.<br/>"
        "2. <b>Снимок (Скриншот)</b> — сохранение кадра в формате PNG со штампом времени.<br/>"
        "3. <b>Перезапуск потока</b> — принудительный сброс и повторная инициализация RTSP-сессии без перезапуска приложения.<br/>"
        "4. <b>1×1 (Развернуть)</b> — фокус на выбранной камере в крупном масштабе.",
        body_style
    ))

    # Section 3: Diagnostics
    elements.append(Paragraph("3. ИНЖЕНЕРНАЯ КАРТОЧКА ДИАГНОСТИКИ ПОТОКА", h2_style))
    elements.append(Paragraph(
        "В нижней левой панели отображаются технические характеристики активной камеры:<br/>"
        "• <b>Видеокодек:</b> H.265+ (Smart HEVC) / H.264 High Profile, GOP-структура и битрейт.<br/>"
        "• <b>Сетевые порты:</b> RTSP (554), ONVIF / HTTP (80), Hikvision SDK (8000), Dahua Config (37777).<br/>"
        "• <b>Качество канала:</b> время отклика ICMP (RTT), джиттер, процент потерь пакетов.<br/>"
        "• <b>Быстрая авторизация:</b> проверка пароля камеры по протоколам Digest ISAPI, Dahua CGI и ONVIF.",
        card_style
    ))

    # Section 4: Hotkeys & Tech Support
    elements.append(Paragraph("4. ТЕХНИЧЕСКАЯ ПОДДЕРЖКА И МОНТАЖ В АЛМАТЫ", h2_style))
    elements.append(Paragraph(
        "Комплекс разработан инженерной службой <b>ProCam</b> (Алматы, Казахстан). "
        "Поставка официального оборудования видеонаблюдения, расчет жестких дисков и профессиональный монтаж «под ключ»:<br/>"
        "• <b>Телефон / WhatsApp:</b> +7 (706) 606-63-23 · +7 (776) 606-63-23<br/>"
        "• <b>Экосистема:</b> ProCam Web, ProCam Radar v4.1, ProCam Viewer v4.1",
        body_style
    ))

    doc.build(elements)
    print(f"[✔] Сгенерирован PDF: {pdf_path}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "PROCAM_VIEWER_MANUAL_RU.pdf"
    generate_pdf(out)

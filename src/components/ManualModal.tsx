import React from 'react';
import { X, FileText, ExternalLink, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">// ИНЖЕНЕРНОЕ РУКОВОДСТВО</span>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px' }}>
              Инструкция по эксплуатации ProCam Viewer v4.1
            </h3>
          </div>
          <button className="btn-pill" style={{ padding: '6px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Content sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', lineHeight: 1.6, color: 'var(--muted)', maxHeight: '60vh', overflowY: 'auto', paddingRight: '6px' }}>
          <div style={{ background: 'var(--surface-card)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
              1. Мультиэкранная матрица видеонаблюдения (1×1, 2×2, 3×3, 4×4)
            </h4>
            <p>
              Переключайте сетки в верхней панели рабочей области. Каждая ячейка выводит живой видеопоток, имя канала,
              IP-адрес, кодек и маркеры AI-детекции (люди, транспорт). Кнопка <b>1×1</b> позволяет сфокусироваться на любой камере.
            </p>
          </div>

          <div style={{ background: 'var(--surface-card)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
              2. Мгновенное переключение Main Stream (Основной) и Sub Stream (Субпоток)
            </h4>
            <p>
              В нижней панели каждой ячейки доступен переключатель <b>Main / Sub</b>. В режиме мультиэкрана рекомендуется включать
              Sub Stream для оптимизации нагрузки на процессор и пропускную способность сетевого коммутатора.
              Кнопки «Все Main» и «Все Sub» позволяют применить настройку сразу ко всей сетке.
            </p>
          </div>

          <div style={{ background: 'var(--surface-card)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
              3. Инженерная диагностика потока и задержек
            </h4>
            <p>
              Кликните по любой камере в списке слева или в ячейке сетки. В нижнем блоке появится «Карточка диагностики»:
              видеокодек (H.265+, H.264), разрешение, сетевой отклик (пинг), открытые порты (554, 80, 8000) и готовая
              RTSP-строка с кнопкой быстрого копирования в буфер обмена.
            </p>
          </div>

          <div style={{ background: 'var(--surface-card)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
              4. Захват стоп-кадров и экспорт плейлистов для VLC
            </h4>
            <p>
              Кнопка с иконкой фотоаппарата мгновенно сохраняет стоп-кадр высокого разрешения на локальный диск.
              Кнопка «Экспорт конфигурации» позволяет выгрузить резервную копию JSON или сформировать файл M3U8 для воспроизведения в плеере VLC.
            </p>
          </div>

          <div style={{ background: 'var(--surface-card)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
              5. Поставка оборудования, монтаж и разработка — ProCam Алматы
            </h4>
            <p style={{ marginBottom: '8px' }}>
              Официальное оборудование Hikvision, HiWatch, Dahua, Uniview. Инженерный расчет кабельных трасс, PoE-бюджета и емкости дисков:
              <br />
              <b style={{ color: 'var(--emerald)' }}>Телефон / WhatsApp:</b> +7 (706) 606-63-23 · +7 (776) 606-63-23
              <br />
              <b style={{ color: '#60A5FA' }}>Электронная почта:</b> yeeerniyaz@gmail.com
              <br />
              <b style={{ color: '#F59E0B' }}>Сайт разработчика:</b>{' '}
              <a href="https://yeee.kz" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--emerald)', textDecoration: 'underline' }}>
                yeee.kz
              </a>
            </p>
            <div style={{ fontSize: '12px', color: '#71717A', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '6px', marginTop: '6px' }}>
              Автор и инженер: Ернияз Талғатулы · Проекты: ProCam CCTV, ProCam Radar, ProCam Viewer, Royal Banners (royalbanners.yeee.kz), TezTap, Justice Company.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
          <a
            className="btn-pill btn-pill-emerald-outline"
            href="/download/manual"
            target="_blank"
            style={{ textDecoration: 'none' }}
          >
            <FileText size={14} />
            Открыть фирменный PDF (A4)
          </a>

          <button className="btn-pill" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  FolderGit2,
  User,
  Video,
  Radar,
  Monitor,
  Globe,
  Briefcase,
  Cpu,
  Phone,
  Mail,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  MapPin,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthorProjectsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'about' | 'projects'>('about');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const projects = [
    {
      id: 'procam-cctv',
      title: 'ProCam CCTV',
      badge: 'Алматы · Сервис',
      category: 'IP-Видеонаблюдение',
      icon: Video,
      color: '#10B981',
      description:
        'Проектирование и чистый монтаж систем видеонаблюдения Hikvision, HiWatch и Dahua в Алматы. PoE-питание, 4K ColorVu и круглосуточный мобильный доступ.',
      tags: ['Hikvision', 'HiWatch', 'Dahua', 'PoE 802.3af', '4K AcuSense'],
      linkText: 'procam.yeee.kz',
      linkHref: 'https://procam.yeee.kz',
    },
    {
      id: 'procam-radar',
      title: 'ProCam Radar v4.1',
      badge: 'Windows & Linux',
      category: 'Инженерное ПО',
      icon: Radar,
      color: '#34D399',
      description:
        'Десктопный сетевой сканер: поиск IP-камер по кабелю и Wi-Fi одновременно без разрыва интернета (/32), подбор свободных IP (1..245) и PDF-паспорта.',
      tags: ['Desktop GUI', 'Multi-NIC /32', 'Free IP 1..245', 'PDF Passport'],
      linkText: 'procam.yeee.kz/#procam-radar',
      linkHref: 'https://procam.yeee.kz/#procam-radar',
    },
    {
      id: 'procam-viewer',
      title: 'ProCam Viewer v4.1',
      badge: 'Windows & Linux',
      category: 'VMS & Архив NVR',
      icon: Monitor,
      color: '#60A5FA',
      description:
        'Клиентская станция видеонаблюдения: многоканальная видеостена, прямое чтение записей с жесткого диска NVR регистратора и пакетный экспорт через FFmpeg.',
      tags: ['Desktop VMS', 'NVR Playback', 'FFmpeg Engine', 'Live Video Wall'],
      linkText: 'Текущая программа',
      linkHref: '',
    },
    {
      id: 'royal-banners',
      title: 'Royal Banners (UKB)',
      badge: 'Production',
      category: 'Корпоративный Web',
      icon: Briefcase,
      color: '#A78BFA',
      description:
        'Корпоративный портал и рекламная платформа наружной рекламы и полиграфии (royalbanners.yeee.kz) со строгим UI/UX и плавной адаптивностью.',
      tags: ['React', 'Mantine UI', 'Vite', 'Production'],
      linkText: 'royalbanners.yeee.kz',
      linkHref: 'https://royalbanners.yeee.kz/',
    },
    {
      id: 'teztap',
      title: 'TezTap Platform',
      badge: 'SaaS & Web',
      category: 'Веб-платформа',
      icon: Globe,
      color: '#818CF8',
      description:
        'SaaS-сервис для мгновенной генерации микро-лендингов, визиток и каталогов услуг с автоматической маршрутизацией заявок в WhatsApp.',
      tags: ['Next.js 14', 'Prisma', 'Tailwind', 'WhatsApp Business'],
      linkText: '',
      linkHref: '',
    },
    {
      id: 'justice-company',
      title: 'Justice Company',
      badge: 'Production',
      category: 'Юридический Web',
      icon: Briefcase,
      color: '#EAB308',
      description:
        'Минималистичный лендинг для юристов с интегрированной CMS и управлением контентом/заявками через Telegram-бота.',
      tags: ['React', 'Node.js', 'Docker', 'Telegram Bot CMS'],
      linkText: '',
      linkHref: '',
    },
    {
      id: 'smart-iot',
      title: 'Smart Mirror VECTOR & IoT',
      badge: 'Hardware & Linux',
      category: 'Аппаратная разработка',
      icon: Cpu,
      color: '#F59E0B',
      description:
        'Кастомные умные зеркала VECTOR на React/Linux и локальная диспетчеризация умного дома на промышленных контроллерах Wiren Board (MQTT/Modbus).',
      tags: ['Wiren Board', 'Linux / Bash', 'MQTT / Modbus', 'Electron'],
      linkText: '',
      linkHref: '',
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-window"
        style={{
          maxWidth: '820px',
          width: '92vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f131c',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          borderRadius: '16px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px 20px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                fontFamily: 'monospace',
                color: 'var(--emerald)',
                background: 'rgba(16, 185, 129, 0.12)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              // ОБ АВТОРЕ И ПРОЕКТЫ
            </span>
          </div>
          <button
            className="btn-pill"
            style={{ padding: '6px', background: 'transparent', cursor: 'pointer', border: 'none', color: '#A1A1AA' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Author Card Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(12, 15, 22, 0.85) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '22px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                }}
              >
                Y
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF' }}>Ернияз Талғатулы</span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--emerald)',
                      background: 'rgba(16, 185, 129, 0.15)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    Автор & Инженер
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                  Инженер систем безопасности & Fullstack-разработчик
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '11.5px', color: '#71717A' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="#10B981" /> Алматы, Казахстан
                  </span>
                  <span>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Globe size={12} color="#10B981" />
                    <a
                      href="https://yeee.kz"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--emerald)', textDecoration: 'none', fontWeight: 600 }}
                    >
                      yeee.kz
                    </a>
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a
                href="https://wa.me/77066066323"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34D399',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                WhatsApp
              </a>
              <a
                href="https://t.me/yeeeerniyaz"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#E4E4E7',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Telegram
              </a>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '4px',
              borderRadius: '9px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '7px',
                border: activeTab === 'about' ? '1px solid var(--emerald-border)' : '1px solid transparent',
                background: activeTab === 'about' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                color: activeTab === 'about' ? '#FFFFFF' : '#9CA3AF',
                fontWeight: activeTab === 'about' ? 700 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
              }}
            >
              <User size={15} />
              Обо мне и все контакты
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '7px',
                border: activeTab === 'projects' ? '1px solid var(--emerald-border)' : '1px solid transparent',
                background: activeTab === 'projects' ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
                color: activeTab === 'projects' ? '#FFFFFF' : '#9CA3AF',
                fontWeight: activeTab === 'projects' ? 700 : 600,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
              }}
            >
              <FolderGit2 size={15} />
              Все проекты ({projects.length})
            </button>
          </div>

          {/* TAB 1: ABOUT & ALL CONTACTS */}
          {activeTab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '13px',
                  color: '#9CA3AF',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                  Инженерный стандарт разработки ProCam
                </div>
                <p style={{ margin: '0 0 8px' }}>
                  Я объединяю физическую инженерию слаботочных систем с разработкой надежного программного обеспечения.
                  ProCam Viewer и ProCam Radar созданы для того, чтобы монтажники и заказчики не тратили часы на настройку
                  сетей и выгрузку архивов.
                </p>
                <p style={{ margin: 0, color: '#71717A', fontSize: '12px' }}>
                  Личная ответственность за каждый объект, аккуратная кабельная разводка и круглосуточная поддержка.
                </p>
              </div>

              {/* Direct Contacts Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                {/* Phone 1 */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#71717A' }}>Основной / WhatsApp</div>
                    <a
                      href="tel:+77066066323"
                      style={{ color: '#FFFFFF', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}
                    >
                      +7 (706) 606-63-23
                    </a>
                  </div>
                  <button
                    onClick={() => copyToClipboard('+77066066323', 'p1')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedKey === 'p1' ? 'var(--emerald)' : '#A1A1AA' }}
                  >
                    {copiedKey === 'p1' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Phone 2 */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#71717A' }}>Дополнительный номер</div>
                    <a
                      href="tel:+77766066323"
                      style={{ color: '#D4D4D8', fontFamily: 'monospace', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}
                    >
                      +7 (776) 606-63-23
                    </a>
                  </div>
                  <button
                    onClick={() => copyToClipboard('+77766066323', 'p2')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedKey === 'p2' ? 'var(--emerald)' : '#A1A1AA' }}
                  >
                    {copiedKey === 'p2' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Email */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#71717A' }}>Email (ТЗ / Проекты)</div>
                    <a
                      href="mailto:yeeerniyaz@gmail.com"
                      style={{ color: '#FFFFFF', fontFamily: 'monospace', fontWeight: 600, fontSize: '12.5px', textDecoration: 'none' }}
                    >
                      yeeerniyaz@gmail.com
                    </a>
                  </div>
                  <button
                    onClick={() => copyToClipboard('yeeerniyaz@gmail.com', 'email')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedKey === 'email' ? 'var(--emerald)' : '#A1A1AA' }}
                  >
                    {copiedKey === 'email' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Website */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#71717A' }}>Персональный сайт</div>
                    <a
                      href="https://yeee.kz"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--emerald)', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}
                    >
                      yeee.kz
                    </a>
                  </div>
                  <a href="https://yeee.kz" target="_blank" rel="noopener noreferrer" style={{ color: '#A1A1AA' }}>
                    <ExternalLink size={14} />
                  </a>
                </div>

                {/* Telegram */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#71717A' }}>Telegram</div>
                    <a
                      href="https://t.me/yeeeerniyaz"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '12.5px', textDecoration: 'none' }}
                    >
                      @yeeeerniyaz
                    </a>
                  </div>
                  <a href="https://t.me/yeeeerniyaz" target="_blank" rel="noopener noreferrer" style={{ color: '#A1A1AA' }}>
                    <ExternalLink size={14} />
                  </a>
                </div>

                {/* GitHub */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#71717A' }}>GitHub</div>
                    <a
                      href="https://github.com/Yeeerniyaz"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '12.5px', textDecoration: 'none' }}
                    >
                      github.com/Yeeerniyaz
                    </a>
                  </div>
                  <a href="https://github.com/Yeeerniyaz" target="_blank" rel="noopener noreferrer" style={{ color: '#A1A1AA' }}>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ALL PROJECTS */}
          {activeTab === 'projects' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
              {projects.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: p.color,
                          }}
                        >
                          <Icon size={16} />
                        </div>
                        <div>
                          <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '13.5px' }}>{p.title}</div>
                          <div style={{ color: '#71717A', fontSize: '11px' }}>{p.category}</div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#A1A1AA',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {p.badge}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5, margin: '4px 0 10px', flexGrow: 1 }}>
                      {p.description}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: '10px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#D4D4D8',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    {p.linkHref ? (
                      <a
                        href={p.linkHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: 'var(--emerald)',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <span>{p.linkText}</span>
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#71717A' }}>
                        {p.id === 'procam-viewer' ? 'Текущая программа' : 'Внутренняя разработка'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Banner */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--emerald)" />
              <span style={{ fontSize: '12px', color: '#E4E4E7' }}>
                Все проекты, документация и исходный код доступны на сайте разработчика:
              </span>
            </div>
            <a
              href="https://yeee.kz"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--emerald)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>yeee.kz</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0,
          }}
        >
          <button className="btn-pill" onClick={onClose} style={{ padding: '6px 18px', cursor: 'pointer' }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

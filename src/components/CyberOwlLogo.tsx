import React from 'react';

interface Props {
  size?: number;
}

export const CyberOwlLogo: React.FC<Props> = ({ size = 38 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, borderRadius: size * (15 / 64) }}
    >
      {/* ProCam VMS Matrix & Video Wall Emblem */}
      <rect width="64" height="64" rx="15" fill="#09090B" />
      <rect x="9" y="9" width="46" height="46" rx="8" fill="#0D111A" stroke="#27272A" strokeWidth="1.5" />
      {/* Cell 1: Live Lens & REC */}
      <rect x="12" y="12" width="18" height="18" rx="4" fill="#141926" stroke="#3F3F46" strokeWidth="1" />
      <circle cx="21" cy="21" r="5" fill="#09090B" stroke="#E4E4E7" strokeWidth="1.2" />
      <circle cx="21" cy="21" r="2.2" fill="#09090B" stroke="#10B981" strokeWidth="1.2" />
      <circle cx="22" cy="20" r="0.9" fill="#10B981" />
      <circle cx="27" cy="15" r="1.3" fill="#EF4444" />
      {/* Cell 2: AI Bounding Box */}
      <rect x="34" y="12" width="18" height="18" rx="4" fill="#141926" stroke="#3F3F46" strokeWidth="1" />
      <path d="M37 18 V15 H40" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M49 18 V15 H46" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M37 24 V27 H40" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M49 24 V27 H46" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="43" cy="19" r="1.4" fill="#34D399" />
      <path d="M40 25 C40 22.5 46 22.5 46 25" stroke="#34D399" strokeWidth="1.2" strokeLinecap="round" />
      {/* Cell 3: NVR Disk Playback */}
      <rect x="12" y="34" width="18" height="18" rx="4" fill="#141926" stroke="#3F3F46" strokeWidth="1" />
      <circle cx="21" cy="43" r="5.5" fill="#09090B" stroke="#60A5FA" strokeWidth="1.2" />
      <circle cx="21" cy="43" r="2" fill="#09090B" stroke="#E4E4E7" strokeWidth="1" />
      <path d="M21 40 L26 43 L21 46 Z" fill="#10B981" />
      {/* Cell 4: Timeline Waves */}
      <rect x="34" y="34" width="18" height="18" rx="4" fill="#141926" stroke="#3F3F46" strokeWidth="1" />
      <rect x="37" y="42" width="2" height="6" rx="0.8" fill="#10B981" />
      <rect x="40.5" y="39" width="2" height="9" rx="0.8" fill="#34D399" />
      <rect x="44" y="37" width="2" height="11" rx="0.8" fill="#60A5FA" />
      <rect x="47.5" y="40" width="2" height="8" rx="0.8" fill="#10B981" />
      {/* Central Matrix Hub */}
      <circle cx="32" cy="32" r="3" fill="#09090B" stroke="#FFFFFF" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="1.4" fill="#10B981" />
    </svg>
  );
};

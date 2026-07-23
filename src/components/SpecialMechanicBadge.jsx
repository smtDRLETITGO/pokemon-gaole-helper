import React from 'react';

export default function SpecialMechanicBadge({ mechanic }) {
  if (!mechanic) return null;

  let icon = null;
  let label = '';
  let color = '';

  switch (mechanic) {
    case 'z-move':
      label = 'Z 招式';
      color = '#facc15'; // Yellow
      icon = (
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="url(#z-grad)" stroke="#ca8a04" strokeWidth="1.5" />
          <path d="M7 8H17L7 16H17" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="z-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fef08a" />
              <stop offset="1" stopColor="#eab308" />
            </linearGradient>
          </defs>
        </svg>
      );
      break;
    case 'dynamax':
      label = '極巨化';
      color = '#ef4444'; // Red
      icon = (
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="12" cy="7" rx="8" ry="3" fill="#ec4899" opacity="0.8" />
          <ellipse cx="12" cy="12" rx="10" ry="4" fill="#d946ef" opacity="0.9" />
          <ellipse cx="12" cy="17" rx="12" ry="4.5" fill="#a855f7" />
        </svg>
      );
      break;
    case 'mega':
      label = '超級進化';
      color = '#3b82f6'; // Blue
      icon = (
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="url(#mega-grad)" />
          <path d="M12 6C8 6 6 9 6 12C6 15 8 18 12 18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 18C16 18 18 15 18 12C18 9 16 6 12 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="#fff" />
          <defs>
            <linearGradient id="mega-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" />
              <stop offset="0.5" stopColor="#10b981" />
              <stop offset="1" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
      );
      break;
    case 'double':
      label = '雙重招式';
      color = '#10b981'; // Green
      icon = (
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 5L20 5L20 11M20 5L10 15" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 19L4 19L4 13M4 19L14 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        </svg>
      );
      break;
    case 'terastal':
      label = '太晶化';
      color = '#a855f7'; // Purple
      icon = (
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L19 9L12 22L5 9L12 2Z" fill="url(#tera-grad)" stroke="#fff" strokeWidth="1" />
          <path d="M5 9H19" stroke="#fff" strokeWidth="1" />
          <path d="M12 2V22" stroke="#fff" strokeWidth="1" />
          <path d="M12 9L19 2M12 9L5 2" stroke="#fff" strokeWidth="1" />
          <defs>
            <linearGradient id="tera-grad" x1="5" y1="2" x2="19" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f472b6" />
              <stop offset="0.5" stopColor="#a855f7" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
      );
      break;
    case 'super-tag':
      label = '組合招式';
      color = '#f97316'; // Orange
      icon = (
        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="12" r="7" stroke="#fff" strokeWidth="1.5" fill="#f97316" />
          <path d="M2 12H16" stroke="#fff" strokeWidth="1.5" />
          <circle cx="15" cy="12" r="7" stroke="#fff" strokeWidth="1.5" fill="#3b82f6" opacity="0.8" />
          <path d="M8 12H22" stroke="#fff" strokeWidth="1.5" opacity="0.8" />
        </svg>
      );
      break;
    default:
      return null;
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      background: `linear-gradient(90deg, ${color}33 0%, transparent 100%)`,
      border: `1px solid ${color}66`,
      borderRadius: '4px',
      padding: '2px 4px',
      marginTop: '2px'
    }}>
      {icon}
      <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#fff', textShadow: `0 0 4px ${color}` }}>
        {label}
      </span>
    </div>
  );
}

import React from 'react';

export default function SpecialMechanicBadge({ mechanic }) {
  if (!mechanic) return null;

  let imgSrc = '';
  let label = '';
  let color = '';

  switch (mechanic) {
    case 'zmove':
    case 'z-move':
      label = 'Z 招式';
      color = '#facc15'; // Yellow
      imgSrc = 'mechanics/zmove.jpg';
      break;
    case 'dynamax':
      label = '極巨化';
      color = '#ef4444'; // Red
      imgSrc = 'mechanics/dynamax.jpg';
      break;
    case 'giantmax':
      label = '超極巨化';
      color = '#ec4899'; // Pink
      imgSrc = 'mechanics/giantmax.jpg';
      break;
    case 'mega':
      label = '超級進化';
      color = '#3b82f6'; // Blue
      imgSrc = 'mechanics/mega.jpg';
      break;
    case 'double':
    case 'double_attack':
      label = '雙重招式';
      color = '#10b981'; // Green
      imgSrc = 'mechanics/double_attack.jpg';
      break;
    case 'chain':
    case 'chain_attack':
      label = '連擊';
      color = '#06b6d4'; // Cyan
      imgSrc = 'mechanics/chain_attack.jpg';
      break;
    case 'capsule':
    case 'super-tag':
    case 'super_tag':
      label = '組合招式';
      color = '#f97316'; // Orange
      imgSrc = 'mechanics/capsule.jpg';
      break;
    default:
      return null;
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      background: `linear-gradient(90deg, ${color}33 0%, transparent 100%)`,
      border: `1px solid ${color}66`,
      borderRadius: '6px',
      padding: '2px 6px',
      marginTop: '2px',
      boxShadow: `0 0 8px ${color}33`
    }}>
      {imgSrc && (
        <img 
          src={`${import.meta.env.BASE_URL}${imgSrc}`} 
          alt={label}
          style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }}
        />
      )}
      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#fff', textShadow: `0 0 4px ${color}` }}>
        {label}
      </span>
    </div>
  );
}

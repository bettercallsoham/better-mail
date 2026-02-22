import React from 'react';

interface KeyProps {
  name: string;
  width?: string;
  height?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Key: React.FC<KeyProps> = ({
  name,
  width = '2.75rem',
  height = '2.75rem',
  icon,
  className = '',
  onClick,
}) => {
  return (
    <button
      aria-label={name}
      onClick={onClick}
      className={`
        relative flex items-center justify-center
        rounded-lg
        bg-black
        border-2 border-gray-700
        text-gray-100 text-xs font-medium
        shadow-lg shadow-white/50
        hover:border-gray-600
        hover:shadow-lg hover:shadow-black/60
        active:translate-y-0.5 active:shadow-sm
        focus:outline-none focus:border-blue-500 focus:shadow-[0_0_20px_rgba(59,130,246,0.6)]
        transition-all duration-150
        ${className}
      `}
      style={{ width, height }}
    >
      {icon ? (
        <span className="flex items-center justify-center text-gray-100">
          {icon}
        </span>
      ) : (
        <span className="select-none">{name}</span>
      )}
    </button>
  );
};

export default Key;
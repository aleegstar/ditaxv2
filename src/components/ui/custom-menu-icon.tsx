import React from 'react';

interface CustomMenuIconProps {
  className?: string;
  size?: number;
}

export const CustomMenuIcon: React.FC<CustomMenuIconProps> = ({ 
  className = '', 
  size = 24 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      role="img" 
      aria-label="Menü"
      className={className}
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M6 16C4.89543 16 4 15.1046 4 14C4 12.8954 4.89543 12 6 12H42C43.1046 12 44 12.8954 44 14C44 15.1046 43.1046 16 42 16H6ZM4.95 36C4.42533 36 4 35.1046 4 34C4 32.8954 4.42533 32 4.95 32H22.05C22.5747 32 23 32.8954 23 34C23 35.1046 22.5747 36 22.05 36H4.95ZM4 24C4 25.1046 4.60442 26 5.35 26H29.65C30.3956 26 31 25.1046 31 24C31 22.8954 30.3956 22 29.65 22H5.35C4.60442 22 4 22.8954 4 24Z" 
        fill="currentColor"
      />
    </svg>
  );
};

import React from 'react';

interface ElementsIconProps {
  className?: string;
  size?: number;
  color?: string;
}

export const ElementsIcon: React.FC<ElementsIconProps> = ({ 
  className = '', 
  size = 24, 
  color = 'currentColor' 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 44 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M32.9551 14.1608C32.9701 14.1607 32.985 14.1607 33 14.1607C37.9706 14.1607 42 18.1975 42 23.1772C42 27.8182 38.5 31.6403 34 32.1387M32.9551 14.1608C32.9848 13.8308 33 13.4966 33 13.1588C33 7.07257 28.0751 2.13867 22 2.13867C16.2465 2.13867 11.5247 6.56401 11.0408 12.2025M32.9551 14.1608C32.7507 16.4338 31.8572 18.5079 30.4857 20.1717M11.0408 12.2025C5.96796 12.6861 2 16.9665 2 22.1754C2 27.0221 5.43552 31.0651 10 31.9933M11.0408 12.2025C11.3565 12.1724 11.6765 12.157 12 12.157C14.2516 12.157 16.3295 12.9026 18.001 14.1607" 
        stroke={color} 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M22 22.1387L22 38.1387M22 22.1387C20.5995 22.1387 17.9831 26.1273 17 27.1387M22 22.1387C23.4005 22.1387 26.0169 26.1273 27 27.1387" 
        stroke={color} 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
};

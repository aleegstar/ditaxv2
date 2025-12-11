import React from 'react';

interface CustomNotificationIconProps {
  className?: string;
  size?: number;
}

export const CustomNotificationIcon: React.FC<CustomNotificationIconProps> = ({ 
  className = '', 
  size = 20 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M24 44C26.2091 44 28 42.2091 28 40H41.6764C42.0179 40 42.3548 39.9205 42.6603 39.7677C43.747 39.2244 44.1875 37.9029 43.6441 36.8161L40 29.5279V20C40 11.1634 32.8365 4 24 4C15.1634 4 7.99999 11.1634 7.99999 20V29.5279L4.35586 36.8161C4.20312 37.1216 4.1236 37.4585 4.1236 37.8C4.1236 39.015 5.10857 40 6.3236 40H20C20 42.2091 21.7908 44 24 44ZM36 28V20C36 13.3726 30.6274 8 24 8C17.3726 8 12 13.3726 12 20V28H36ZM11.2361 32L9.23606 36H38.7639L36.7639 32H11.2361Z" 
        fill="#8A96A7"
      />
    </svg>
  );
};
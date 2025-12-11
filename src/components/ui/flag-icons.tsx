import React from "react";

// Round Swiss Flag Component
export const SwissFlag: React.FC<{
  className?: string;
}> = ({ className = "w-6 h-6" }) => (
  <div className={`${className} rounded-full overflow-hidden border border-gray-200 flex-shrink-0`}>
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <rect width="32" height="32" fill="#FF0000"/>
      <rect x="13" y="6" width="6" height="20" fill="white"/>
      <rect x="6" y="13" width="20" height="6" fill="white"/>
    </svg>
  </div>
);

// Round American Flag Component
export const AmericanFlag: React.FC<{
  className?: string;
}> = ({ className = "w-6 h-6" }) => (
  <div className={`${className} rounded-full overflow-hidden border border-gray-200 flex-shrink-0`}>
    <svg viewBox="0 0 32 32" className="w-full h-full">
      {/* Blue field */}
      <rect width="32" height="32" fill="#B22234"/>
      {/* Stripes */}
      <rect width="32" height="2.46" y="0" fill="#FFFFFF"/>
      <rect width="32" height="2.46" y="4.92" fill="#FFFFFF"/>
      <rect width="32" height="2.46" y="9.84" fill="#FFFFFF"/>
      <rect width="32" height="2.46" y="14.76" fill="#FFFFFF"/>
      <rect width="32" height="2.46" y="19.68" fill="#FFFFFF"/>
      <rect width="32" height="2.46" y="24.6" fill="#FFFFFF"/>
      <rect width="32" height="2.46" y="29.52" fill="#FFFFFF"/>
      {/* Blue canton */}
      <rect width="12.8" height="17.24" fill="#3C3B6E"/>
      {/* Simplified stars representation */}
      <circle cx="2.5" cy="2.5" r="0.8" fill="white"/>
      <circle cx="6.5" cy="2.5" r="0.8" fill="white"/>
      <circle cx="10.5" cy="2.5" r="0.8" fill="white"/>
      <circle cx="4.5" cy="4.5" r="0.8" fill="white"/>
      <circle cx="8.5" cy="4.5" r="0.8" fill="white"/>
      <circle cx="2.5" cy="6.5" r="0.8" fill="white"/>
      <circle cx="6.5" cy="6.5" r="0.8" fill="white"/>
      <circle cx="10.5" cy="6.5" r="0.8" fill="white"/>
      <circle cx="4.5" cy="8.5" r="0.8" fill="white"/>
      <circle cx="8.5" cy="8.5" r="0.8" fill="white"/>
      <circle cx="2.5" cy="10.5" r="0.8" fill="white"/>
      <circle cx="6.5" cy="10.5" r="0.8" fill="white"/>
      <circle cx="10.5" cy="10.5" r="0.8" fill="white"/>
      <circle cx="4.5" cy="12.5" r="0.8" fill="white"/>
      <circle cx="8.5" cy="12.5" r="0.8" fill="white"/>
      <circle cx="2.5" cy="14.5" r="0.8" fill="white"/>
      <circle cx="6.5" cy="14.5" r="0.8" fill="white"/>
      <circle cx="10.5" cy="14.5" r="0.8" fill="white"/>
    </svg>
  </div>
);
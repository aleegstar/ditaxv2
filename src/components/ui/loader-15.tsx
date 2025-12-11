import React from 'react';

const Loader15 = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <svg className="w-0 h-0">
        <defs>
          <filter id="gegga">
            <feGaussianBlur in="SourceGraphic" stdDeviation={7} result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10" result="inreGegga" />
            <feComposite in="SourceGraphic" in2="inreGegga" operator="atop" />
          </filter>
          <linearGradient id="reflectionGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(229, 100%, 56%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(229, 100%, 56%)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Main loader */}
      <svg 
        style={{filter: 'url(#gegga)'}} 
        width={120} 
        height={120} 
        viewBox="0 0 200 200"
      >
        <defs>
          <linearGradient id="blueGradient">
            <stop offset={0} stopColor="hsl(229, 100%, 56%)" />
            <stop offset={1} stopColor="hsl(229, 100%, 70%)" />
          </linearGradient>
          <linearGradient 
            y2={160} 
            x2={160} 
            y1={40} 
            x1={40} 
            gradientUnits="userSpaceOnUse" 
            id="gradient"
          >
            <stop offset={0} stopColor="hsl(229, 100%, 56%)" />
            <stop offset={1} stopColor="hsl(229, 100%, 70%)" />
          </linearGradient>
        </defs>
        
        <path 
          className="animate-spin-path" 
          d="m 164,100 c 0,-35.346224 -28.65378,-64 -64,-64 -35.346224,0 -64,28.653776 -64,64 0,35.34622 28.653776,64 64,64 35.34622,0 64,-26.21502 64,-64 0,-37.784981 -26.92058,-64 -64,-64 -37.079421,0 -65.267479,26.922736 -64,64 1.267479,37.07726 26.703171,65.05317 64,64 37.29683,-1.05317 64,-64 64,-64" 
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={23}
          strokeLinecap="round"
          strokeDasharray="180 800"
        />
        
        <circle 
          className="animate-spin-circle" 
          cx={100} 
          cy={100} 
          r={64}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={23}
          strokeLinecap="round"
          strokeDasharray="26 54"
        />
      </svg>
      
      {/* Reflection */}
      <svg 
        className="transform -scale-y-100 opacity-30" 
        style={{filter: 'url(#gegga)'}}
        width={120} 
        height={120} 
        viewBox="0 0 200 200"
      >
        <defs>
          <linearGradient 
            y2={160} 
            x2={160} 
            y1={40} 
            x1={40} 
            gradientUnits="userSpaceOnUse" 
            id="gradientReflection"
          >
            <stop offset={0} stopColor="hsl(229, 100%, 56%)" stopOpacity="0.3" />
            <stop offset={1} stopColor="hsl(229, 100%, 70%)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        <path 
          className="animate-spin-path" 
          d="m 164,100 c 0,-35.346224 -28.65378,-64 -64,-64 -35.346224,0 -64,28.653776 -64,64 0,35.34622 28.653776,64 64,64 35.34622,0 64,-26.21502 64,-64 0,-37.784981 -26.92058,-64 -64,-64 -37.079421,0 -65.267479,26.922736 -64,64 1.267479,37.07726 26.703171,65.05317 64,64 37.29683,-1.05317 64,-64 64,-64" 
          fill="none"
          stroke="url(#gradientReflection)"
          strokeWidth={23}
          strokeLinecap="round"
          strokeDasharray="180 800"
        />
        
        <circle 
          className="animate-spin-circle" 
          cx={100} 
          cy={100} 
          r={64}
          fill="none"
          stroke="url(#gradientReflection)"
          strokeWidth={23}
          strokeLinecap="round"
          strokeDasharray="26 54"
        />
      </svg>
    </div>
  );
}

export default Loader15;
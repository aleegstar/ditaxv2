import React, { useRef, useEffect, useMemo, useId } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

// A function to generate a smooth SVG path from data points
const generateSmoothPath = (points: number[], width: number, height: number): string => {
  if (!points || points.length < 2) {
    return `M 0 ${height}`;
  }

  const xStep = width / (points.length - 1);
  const pathData = points.map((point, i) => {
    const x = i * xStep;
    // Scale point to height, with a small padding from top/bottom
    const y = height - (point / 100) * (height * 0.8) - (height * 0.1);
    return [x, y];
  });

  let path = `M ${pathData[0][0]} ${pathData[0][1]}`;

  for (let i = 0; i < pathData.length - 1; i++) {
    const x1 = pathData[i][0];
    const y1 = pathData[i][1];
    const x2 = pathData[i + 1][0];
    const y2 = pathData[i + 1][1];
    const midX = (x1 + x2) / 2;
    path += ` C ${midX},${y1} ${midX},${y2} ${x2},${y2}`;
  }

  return path;
};

interface StatsWidgetProps {
  label: string;
  amount: number;
  prefix?: string;
  suffix?: string;
  change: number;
  chartData: number[];
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({
  label,
  amount,
  prefix = '',
  suffix = '',
  change,
  chartData
}) => {
  const linePathRef = useRef<SVGPathElement>(null);
  const areaPathRef = useRef<SVGPathElement>(null);
  const uniqueId = useId();
  // SVG viewbox dimensions
  const svgWidth = 150;
  const svgHeight = 60;

  // Generate the SVG path for the line, memoized for performance
  const linePath = useMemo(() => generateSmoothPath(chartData, svgWidth, svgHeight), [chartData]);

  // Generate the SVG path for the gradient area
  const areaPath = useMemo(() => {
    if (!linePath.startsWith("M")) return "";
    return `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;
  }, [linePath]);

  // Animate the line graph on change
  useEffect(() => {
    const path = linePathRef.current;
    const area = areaPathRef.current;

    if (path && area) {
      const length = path.getTotalLength();
      // --- Animate Line ---
      path.style.transition = 'none';
      path.style.strokeDasharray = length + ' ' + length;
      path.style.strokeDashoffset = String(length);

      // --- Animate Area ---
      area.style.transition = 'none';
      area.style.opacity = '0';

      // Trigger reflow to apply initial styles before transition
      path.getBoundingClientRect();

      // --- Start Transitions ---
      path.style.transition = 'stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease';
      path.style.strokeDashoffset = '0';

      area.style.transition = 'opacity 0.8s ease-in-out 0.2s, fill 0.5s ease';
      area.style.opacity = '1';
    }
  }, [linePath]);

  const isPositiveChange = change >= 0;
  const changeColorClass = isPositiveChange ? 'text-green-600' : 'text-red-600';
  // Always use green color for the graph
  const graphStrokeColor = '#22C55E';
  const gradientId = `areaGradientSuccess-${uniqueId}`;

  return (
    <div className="relative overflow-hidden w-full bg-card rounded-2xl border border-border/60 p-8 hover:shadow-md transition-shadow duration-300">
      <div className="flex flex-col relative z-10">
        <h3 className="text-base text-muted-foreground font-medium mb-3">
          {label}
        </h3>
        <div className="flex items-baseline gap-3">
          <span className="text-5xl tracking-tight text-foreground font-medium">
            {prefix}{amount}{suffix}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-sm font-semibold flex items-center ${changeColorClass}`}>
            {isPositiveChange ? '+' : ''}{change}%
            {isPositiveChange ? <ArrowUp size={12} className="ml-0.5" /> : <ArrowDown size={12} className="ml-0.5" />}
          </span>
          <span className="text-sm text-muted-foreground/60">vs. letzter Monat</span>
        </div>
      </div>
      {/* Decorative Chart Background */}
      <div className="absolute bottom-0 right-0 w-[60%] h-16 opacity-90">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={graphStrokeColor} stopOpacity={0.2} />
              <stop offset="100%" stopColor={graphStrokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            ref={areaPathRef}
            d={areaPath}
            fill={`url(#${gradientId})`}
          />
          <path
            ref={linePathRef}
            d={linePath}
            fill="none"
            stroke={graphStrokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
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
    <div className="w-full bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-lg transition-all duration-200">
      <div className="flex justify-between items-center">
        {/* Left side content */}
        <div className="flex flex-col w-1/2">
          <div className="flex items-center text-gray-500 text-sm mb-1">
            <span>{label}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {prefix}{amount}{suffix}
          </p>
          <div className={`flex items-center mt-2 text-sm font-semibold ${changeColorClass}`}>
            {isPositiveChange ? '+' : ''}{change}%
            {isPositiveChange ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />}
            <span className="text-gray-400 ml-2 font-normal">vs. letzter Monat</span>
          </div>
        </div>

        {/* Right side chart */}
        <div className="w-1/2 h-16">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
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
              stroke="#22C55E"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
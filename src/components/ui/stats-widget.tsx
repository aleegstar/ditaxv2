import React, { useRef, useEffect, useMemo, useId } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const generateSmoothPath = (points: number[], width: number, height: number): string => {
  if (!points || points.length < 2) return `M 0 ${height}`;
  const xStep = width / (points.length - 1);
  const pathData = points.map((point, i) => {
    const x = i * xStep;
    const y = height - (point / 100) * (height * 0.8) - (height * 0.1);
    return [x, y];
  });
  let path = `M ${pathData[0][0]} ${pathData[0][1]}`;
  for (let i = 0; i < pathData.length - 1; i++) {
    const [x1, y1] = pathData[i];
    const [x2, y2] = pathData[i + 1];
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
  label, amount, prefix = '', suffix = '', change, chartData
}) => {
  const linePathRef = useRef<SVGPathElement>(null);
  const areaPathRef = useRef<SVGPathElement>(null);
  const uniqueId = useId();
  const svgWidth = 150;
  const svgHeight = 60;

  const linePath = useMemo(() => generateSmoothPath(chartData, svgWidth, svgHeight), [chartData]);
  const areaPath = useMemo(() => {
    if (!linePath.startsWith("M")) return "";
    return `${linePath} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;
  }, [linePath]);

  useEffect(() => {
    const path = linePathRef.current;
    const area = areaPathRef.current;
    if (path && area) {
      const length = path.getTotalLength();
      path.style.transition = 'none';
      path.style.strokeDasharray = length + ' ' + length;
      path.style.strokeDashoffset = String(length);
      area.style.transition = 'none';
      area.style.opacity = '0';
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
      path.style.strokeDashoffset = '0';
      area.style.transition = 'opacity 0.8s ease-in-out 0.2s';
      area.style.opacity = '1';
    }
  }, [linePath]);

  const isPositive = change >= 0;
  const strokeColor = 'hsl(var(--primary))';
  const gradientId = `areaGrad-${uniqueId}`;

  return (
    <div className="relative overflow-hidden w-full bg-card rounded-xl border border-border/50 p-6">
      <div className="flex flex-col relative z-10">
        <h3 className="text-[13px] text-muted-foreground font-medium mb-2">{label}</h3>
        <span className="text-3xl tracking-tight text-foreground font-semibold">
          {prefix}{amount}{suffix}
        </span>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={`text-xs font-medium flex items-center ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{change}%
            {isPositive ? <ArrowUp size={10} className="ml-0.5" /> : <ArrowDown size={10} className="ml-0.5" />}
          </span>
          <span className="text-xs text-muted-foreground/50">vs. Vormonat</span>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-[55%] h-14 opacity-60">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path ref={areaPathRef} d={areaPath} fill={`url(#${gradientId})`} />
          <path ref={linePathRef} d={linePath} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

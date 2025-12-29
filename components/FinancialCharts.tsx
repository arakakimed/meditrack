import React, { useMemo } from 'react';

// --- Types ---
interface ChartDataPoint {
    label: string;
    value: number;
    secondaryValue?: number;
}

interface LineChartProps {
    data: ChartDataPoint[];
    color?: string;
    height?: number;
    gradientId?: string;
}

interface DonutChartProps {
    data: { label: string; value: number; color: string }[];
    height?: number;
    totalLabel?: string;
    valueFormatter?: (value: number) => string;
}

// --- Helper Functions ---
const formatCurrencyShort = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toString();
};

// Simple smoothing function for spline interpolation
const getControlPoint = (current: number[], previous: number[], next: number[], reverse?: boolean) => {
    const p = previous || current;
    const n = next || current;
    const smoothing = 0.2; // 0 to 1
    const o = {
        x: n[0] - p[0],
        y: n[1] - p[1],
    };
    const angle = Math.atan2(o.y, o.x) + (reverse ? Math.PI : 0);
    const length = Math.sqrt(Math.pow(o.x, 2) + Math.pow(o.y, 2)) * smoothing;
    return [current[0] + Math.cos(angle) * length, current[1] + Math.sin(angle) * length];
};

const getSmoothPath = (points: number[][]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0][0]},${points[0][1]}`;

    const d = points.reduce((acc, point, i, a) => {
        if (i === 0) return `M ${point[0]},${point[1]}`;
        const [cpsX, cpsY] = getControlPoint(a[i - 1], a[i - 2], point);
        const [cpeX, cpeY] = getControlPoint(point, a[i - 1], a[i + 1], true);
        return `${acc} C ${cpsX},${cpsY} ${cpeX},${cpeY} ${point[0]},${point[1]}`;
    }, '');
    return d;
};

// --- Components ---

export const FinancialLineChart: React.FC<LineChartProps> = ({
    data,
    color = '#10B981', // Emerald 500
    height = 250,
    gradientId = 'revenueGradient'
}) => {
    const padding = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = 1000;

    const maxValue = Math.max(...data.map(d => d.value)) * 1.1 || 100;

    const getX = (index: number) => {
        const step = (width - padding.left - padding.right) / (data.length - 1 || 1);
        return padding.left + (index * step);
    };

    const getY = (value: number) => {
        const workableHeight = height - padding.top - padding.bottom;
        const percent = value / maxValue;
        return height - padding.bottom - (percent * workableHeight);
    };

    const pointsArr = data.map((d, i) => [getX(i), getY(d.value)]);
    const pathD = getSmoothPath(pointsArr);

    // Closed path for area
    const areaPathD = `
        ${pathD} 
        L ${getX(data.length - 1)},${height - padding.bottom} 
        L ${getX(0)},${height - padding.bottom} 
        Z
    `;

    return (
        <div className="w-full h-full min-h-[250px]">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid */}
                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                    const y = getY(maxValue * t);
                    return (
                        <g key={t}>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                            <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">{formatCurrencyShort(maxValue * t)}</text>
                        </g>
                    );
                })}

                {/* Area & Line */}
                <path d={areaPathD} fill={`url(#${gradientId})`} />
                <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {/* Points */}
                {data.map((d, i) => (
                    <g key={i} className="group cursor-pointer">
                        <circle cx={getX(i)} cy={getY(d.value)} r="4" fill="white" stroke={color} strokeWidth="2" className="transition-all duration-300 group-hover:r-6" />
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <rect x={getX(i) - 35} y={getY(d.value) - 45} width="70" height="30" rx="6" fill="#1E293B" />
                            <text x={getX(i)} y={getY(d.value) - 26} textAnchor="middle" fill="white" className="text-[11px] font-bold">R$ {d.value}</text>
                            {/* Little triangle arrow */}
                            <path d={`M ${getX(i)} ${getY(d.value) - 15} L ${getX(i) - 5} ${getY(d.value) - 15} L ${getX(i)} ${getY(d.value) - 10} L ${getX(i) + 5} ${getY(d.value) - 15} Z`} fill="#1E293B" />
                        </g>
                    </g>
                ))}

                {/* X Axis */}
                {data.map((d, i) => (
                    <text key={i} x={getX(i)} y={height - 10} textAnchor="middle" className="text-[10px] md:text-xs fill-slate-500 font-medium">{d.label}</text>
                ))}
            </svg>
        </div>
    );
};

export const FinancialDonutChart: React.FC<DonutChartProps> = ({
    data,
    height = 250,
    totalLabel = 'Total',
    valueFormatter = (val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toString()
}) => {
    const size = 200;
    const center = size / 2;
    const radius = size / 2 - 20;
    const strokeWidth = 18;
    const circumference = 2 * Math.PI * radius;
    const gap = 4; // Gap between segments in pixels

    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

    let accumulatedPercent = 0;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 h-full w-full">
            {/* Chart */}
            <div className="relative aspect-square w-full max-w-[250px]" style={{ maxHeight: height }}>
                {/* Rotated SVG so start point is top */}
                <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full transform -rotate-90">
                    {/* Background Track */}
                    <circle cx={center} cy={center} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />

                    {/* Segments */}
                    {data.map((d, i) => {
                        const percent = d.value / total;
                        // Avoid drawing 0% segments
                        if (percent === 0) return null;

                        const dashLength = (percent * circumference) - gap;
                        // Ensure single segment is full circle minus gap if 100% (or roughly full)
                        const safeDashLength = percent === 1 ? circumference : Math.max(0, dashLength);

                        const dashSpace = circumference - safeDashLength;

                        // Fix initial rotation offset
                        const startAngle = accumulatedPercent * 360;
                        accumulatedPercent += percent;

                        return (
                            <circle
                                key={i}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={d.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={`${safeDashLength} ${dashSpace}`}
                                strokeLinecap="round"
                                style={{
                                    transformOrigin: '50% 50%',
                                    transform: `rotate(${startAngle}deg)`
                                }}
                                className="transition-all duration-500 ease-out hover:opacity-80 hover:stroke-[22px]"
                            />
                        );
                    })}
                </svg>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider text-center line-clamp-1">{totalLabel}</p>
                    <p className="text-xl md:text-3xl font-black text-slate-800 dark:text-white mt-1 text-center scale-90 md:scale-100 transition-transform">
                        {valueFormatter(total === 1 ? 0 : total)}
                    </p>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-row flex-wrap sm:flex-col justify-center gap-3 md:min-w-[120px]">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}></span>
                        <div>
                            <p className="text-xs text-slate-500 font-medium">{d.label}</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                                {valueFormatter(d.value)}
                                <span className="text-xs text-slate-400 font-normal ml-1 hidden lg:inline">({((d.value / total) * 100).toFixed(0)}%)</span>
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

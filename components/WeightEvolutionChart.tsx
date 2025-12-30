import React, { useMemo } from 'react';
// NEW IMPORT (types.ts)
import { Injection, Patient, CLINICAL_ZONES } from '../types';

export interface WeightDataPoint {
    id?: string; // NEW: ID for deletion
    date: Date;
    weight: number;
    source: 'injection' | 'manual' | 'initial';
    label?: string;
}

interface WeightEvolutionChartProps {
    patient: Patient;
    weightHistory: WeightDataPoint[]; // Unified history
    onDeleteWeight?: (point: WeightDataPoint) => void;
    action?: React.ReactNode;
}

const WeightEvolutionChart: React.FC<WeightEvolutionChartProps> = ({ patient, weightHistory, onDeleteWeight, action }) => {
    // ... responsive hook ...
    const [isMobile, setIsMobile] = React.useState(false);
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 1. Prepare Data
    const dataPoints = useMemo(() => {
        // Sort safely by date
        const sorted = [...weightHistory].sort((a, b) => a.date.getTime() - b.date.getTime());

        // Add Initial Weight if not present or earlier than all records
        // (Though typically the caller should handle "Initial" in the unified array logic, 
        //  but adding here for robustness if array matches logic)
        // Let's assume the passed `weightHistory` is ALREADY formatted including initial/manual/injections.
        // Actually, let's just use it directly, ensuring date objs.

        return sorted;
    }, [weightHistory]);

    // 2. Dimensions & Scales
    const width = isMobile ? 350 : 800;
    const height = isMobile ? 250 : 300;
    const padding = isMobile
        ? { top: 30, right: 15, bottom: 30, left: 35 }
        : { top: 40, right: 30, bottom: 30, left: 40 };

    // Safety checks for empty data to prevent crashes before render
    const safeWeights = dataPoints.length > 0 ? dataPoints.map(p => p.weight) : [0];
    const minWeight = Math.min(...safeWeights, patient.targetWeight || 999) - 2;
    const maxWeight = Math.max(...safeWeights, patient.initialWeight || 0) + 2;
    const weightRange = maxWeight - minWeight || 10;

    const minDate = dataPoints.length > 0 ? dataPoints[0].date.getTime() : new Date().getTime();
    const maxDate = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].date.getTime() : new Date().getTime();
    const dateRange = maxDate - minDate || 1;

    // Use useCallback for scale functions
    const getX = React.useCallback((date: Date) => {
        const percent = (date.getTime() - minDate) / dateRange;
        return padding.left + percent * (width - padding.left - padding.right);
    }, [minDate, dateRange, width, padding]);

    const getY = React.useCallback((weight: number) => {
        const percent = (weight - minWeight) / weightRange;
        return height - padding.bottom - percent * (height - padding.top - padding.bottom);
    }, [minWeight, weightRange, height, padding]);

    // 3. Path Generation
    const linePath = dataPoints.reduce((path, point, i) => {
        const x = getX(point.date);
        const y = getY(point.weight);
        if (i === 0) return `M ${x},${y}`;
        return `${path} L ${x},${y}`;
    }, "");

    // Area Path
    const areaPath = dataPoints.length > 0 ? `
        ${linePath}
        L ${getX(dataPoints[dataPoints.length - 1].date)},${height - padding.bottom}
        L ${getX(dataPoints[0].date)},${height - padding.bottom}
        Z
    ` : "";

    // 4. Clinical Target Zone Logic
    // 4. Clinical Target Zone Logic (Using shared constant)
    const targetZonePath = useMemo(() => {
        if (!patient.initialWeight || dataPoints.length === 0) return null;

        const startDate = dataPoints[0].date.getTime();
        const gender = patient.gender === 'Male' ? 'Male' : 'Female';
        const zones = CLINICAL_ZONES[gender];

        const pointsUpper: [number, number][] = [];
        const pointsLower: [number, number][] = [];

        zones.forEach(zone => {
            const date = new Date(startDate + zone.week * 7 * 24 * 60 * 60 * 1000);
            const upperKg = patient.initialWeight! * (1 - (zone.minLoss / 100));
            const lowerKg = patient.initialWeight! * (1 - (zone.maxLoss / 100));

            pointsUpper.push([getX(date), getY(upperKg)]);
            pointsLower.push([getX(date), getY(lowerKg)]);
        });

        const pathOps = [
            `M ${pointsUpper[0][0]},${pointsUpper[0][1]}`,
            ...pointsUpper.map(p => `L ${p[0]},${p[1]}`),
            ...pointsLower.reverse().map(p => `L ${p[0]},${p[1]}`),
            'Z'
        ];

        return pathOps.join(' ');
    }, [dataPoints, patient.initialWeight, patient.gender, getX, getY]);

    // 5. Super Responder Area (Green Fill Logic)
    // Area between Patient Line and Lower Limit of Target Zone (when Patient < Lower Limit)
    const superZonePath = useMemo(() => {
        if (!patient.initialWeight || dataPoints.length === 0) return null;

        const startDate = dataPoints[0].date.getTime();
        const gender = patient.gender === 'Male' ? 'Male' : 'Female';
        const zones = CLINICAL_ZONES[gender];

        // We need to build a polygon that represents the area where the patient is "beating" the chart.
        // Simplified approach: For each point in history, calculate the "Lower Limit" at that specific date.
        // If patient weight < Lower Limit, we draw a segment.

        // Note: exact intersection calculation is complex. We will approximate by checking each data point.
        // Ideally we would interpolate standardized weeks, effectively mapping the "Lower Limit Curve" to the data points' X coordinates.

        const superPointsUpper: [number, number][] = []; // The 'Lower Limit' line (which is effectively the upper bound of this super zone)
        const superPointsLower: [number, number][] = []; // The Patient's actual weight line

        let hasSuperPoints = false;

        dataPoints.forEach(point => {
            const daysSinceStart = (point.date.getTime() - startDate) / (1000 * 60 * 60 * 24);
            const currentWeek = daysSinceStart / 7;

            // Find applicable zone bracket to interpolate limit
            // Simple linear interpolation between known weeks
            // (Assuming zones are ordered by week)
            let w1 = zones[0];
            let w2 = zones[zones.length - 1];

            for (let i = 0; i < zones.length - 1; i++) {
                if (currentWeek >= zones[i].week && currentWeek <= zones[i + 1].week) {
                    w1 = zones[i];
                    w2 = zones[i + 1];
                    break;
                }
            }

            // Interpolate Max Loss % for this specific date
            const weekRange = w2.week - w1.week;
            const progressInBracket = (currentWeek - w1.week) / (weekRange || 1);
            const maxLossPercent = w1.maxLoss + (w2.maxLoss - w1.maxLoss) * progressInBracket;

            const lowerLimitKg = patient.initialWeight! * (1 - (maxLossPercent / 100));

            // Logic: Is patient weight strictly LESS than the lower limit?
            if (point.weight < lowerLimitKg) {
                hasSuperPoints = true;
                superPointsUpper.push([getX(point.date), getY(lowerLimitKg)]); // The limit line (Top)
                superPointsLower.push([getX(point.date), getY(point.weight)]); // The patient line (Bottom)
            } else {
                // Close the gap to avoid artifacts - clamp to limit
                const yLimit = getY(lowerLimitKg);
                superPointsUpper.push([getX(point.date), yLimit]);
                superPointsLower.push([getX(point.date), yLimit]);
            }
        });

        if (!hasSuperPoints || superPointsUpper.length < 2) return null;

        // Build Polygon
        // M firstUpper -> L restUpper -> L lastLower -> L restLower(reversed) -> Z
        const pathOps = [
            `M ${superPointsUpper[0][0]},${superPointsUpper[0][1]}`,
            ...superPointsUpper.map(p => `L ${p[0]},${p[1]}`),
            ...superPointsLower.reverse().map(p => `L ${p[0]},${p[1]}`),
            'Z'
        ];

        return pathOps.join(' ');
    }, [dataPoints, patient.initialWeight, patient.gender, getX, getY]);

    // Trend Line (Linear Regression)
    const trendPoints = React.useMemo(() => {
        if (dataPoints.length < 2) return null;
        // ... (existing trend logic kept but simplified for this diff if needed, assuming it's stable)
        // Actually, let's keep the existing trend logic below, just providing context for replace
        const n = dataPoints.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        dataPoints.forEach(p => {
            const x = p.date.getTime();
            const y = p.weight;
            sumX += x;
            sumY += y;
            sumXY += (x * y);
            sumXX += (x * x);
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate start and end y-values based on date range
        const startY = slope * minDate + intercept;
        const endY = slope * maxDate + intercept;

        return {
            x1: getX(new Date(minDate)),
            y1: getY(startY),
            x2: getX(new Date(maxDate)),
            y2: getY(endY)
        };
    }, [dataPoints, minDate, maxDate, getX, getY]);

    // Error State Render Logic (Moved to end)
    if (dataPoints.length < 2) {
        return (
            <div className="w-full h-64 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400">
                <div className="text-center">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">show_chart</span>
                    <p className="text-sm">Dados insuficientes para gerar o gráfico</p>
                </div>
            </div>
        );
    }


    // Font sizes
    const fontSizeAxis = isMobile ? 10 : 10;
    const fontSizeLabel = isMobile ? 12 : 12;
    const circleRadius = isMobile ? 4 : 5;



    return (
        <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 md:p-6 overflow-visible relative">
            {/* ... header ... */}
            <div className="flex justify-between items-center mb-4 md:mb-6">
                <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">monitoring</span>
                        Evolução do Peso
                    </h3>
                </div>
                {action && (
                    <div className="z-10">
                        {action}
                    </div>
                )}
            </div>

            <div className={`w-full transition-all duration-300 ${isMobile ? 'aspect-[4/3]' : 'aspect-[21/9]'} min-h-[250px] relative`}>

                {/* Action Button (e.g. Add Weight) - Rendered BEHIND SVG but visible, clickable via pointer-events trick */}
                {/* SVG is Z-20, Button is Z-10. SVG has pointer-events-none, so clicks pass through to button unless hitting a chart point. */}
                {/* Tooltip in SVG is Z-auto (inherit Z-20), so it covers button. */}
                <div className="absolute top-0 right-0 z-10">
                    {/* Using a prop for the button allows parent to control logic */}
                    {/* The parent should pass the button via 'action' prop */}
                </div>

                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible relative z-20 pointer-events-none" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                        <clipPath id="chartClip">
                            <rect x={padding.left} y={0} width={width - padding.left - padding.right} height={height} />
                        </clipPath>
                    </defs>

                    {/* 1. Clinical Target Zone (Background Layer) */}
                    {targetZonePath && (
                        <g clipPath="url(#chartClip)">
                            <path
                                d={targetZonePath}
                                fill="#94a3b8" // Slate-400 (Neutral Gray/Blue)
                                className="opacity-20 dark:opacity-30"
                            />
                        </g>
                    )}

                    {/* Grid Lines (Y-Axis) */}
                    {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                        const w = minWeight + tick * weightRange;
                        const y = getY(w);
                        return (
                            <g key={tick}>
                                <line
                                    x1={padding.left}
                                    y1={y}
                                    x2={width - padding.right}
                                    y2={y}
                                    stroke="currentColor"
                                    className="text-slate-100 dark:text-slate-700"
                                    strokeWidth="1"
                                />
                                <text
                                    x={padding.left - 6}
                                    y={y + 3}
                                    textAnchor="end"
                                    style={{ fontSize: fontSizeAxis }}
                                    className="fill-slate-400 font-medium"
                                >
                                    {w.toFixed(0)}
                                </text>
                            </g>
                        );
                    })}

                    {/* 1.5 Super Responder Zone (Green Boost) */}
                    {superZonePath && (
                        <g clipPath="url(#chartClip)">
                            <path
                                d={superZonePath}
                                fill="#10b981" // Emerald-500
                                fillOpacity={0.3}
                                className="transition-all duration-500"
                            />
                        </g>
                    )}

                    {/* Week 16 Annotation (Dynamic) */}
                    {patient.initialWeight && (
                        (() => {
                            const gender = patient.gender === 'Male' ? 'Male' : 'Female';
                            const zones = CLINICAL_ZONES[gender];
                            const w16 = zones.find(z => z.week === 16);
                            if (w16) {
                                const minKg = (patient.initialWeight * (1 - w16.maxLoss / 100)).toFixed(1);
                                const maxKg = (patient.initialWeight * (1 - w16.minLoss / 100)).toFixed(1);
                                // Position at roughly bottom right area or fixed position
                                return (
                                    <text
                                        x={width - padding.right}
                                        y={height - padding.bottom - 10} // Little above X axis
                                        textAnchor="end"
                                        style={{ fontSize: 10 }}
                                        className="fill-slate-400 font-medium opacity-80"
                                    >
                                        Intervalo Esperado (16ª Sem): {minKg}kg - {maxKg}kg
                                    </text>
                                );
                            }
                            return null;
                        })()
                    )}


                    {/* Trend Line */}
                    {trendPoints && (
                        <line
                            x1={trendPoints.x1}
                            y1={trendPoints.y1}
                            x2={trendPoints.x2}
                            y2={trendPoints.y2}
                            stroke="#fb923c"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                            className="opacity-60"
                            clipPath="url(#chartClip)"
                        />
                    )}

                    {/* Main Line Area */}
                    <path d={areaPath} fill="url(#lineGradient)" clipPath="url(#chartClip)" />

                    {/* Main Line */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={isMobile ? 2.5 : 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-sm"
                        clipPath="url(#chartClip)"
                    />

                    {/* Data Points */}
                    {dataPoints.map((point, i) => (
                        <g
                            key={i}
                            className="cursor-pointer"
                            style={{ pointerEvents: 'auto' }}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={() => setHoveredIndex(i === hoveredIndex ? null : i)}
                        >
                            {/* Hit Area (Invisible larger circle for easier hovering) */}
                            <circle
                                cx={getX(point.date)}
                                cy={getY(point.weight)}
                                r={20}
                                fill="transparent"
                            />

                            {/* Visible Point */}
                            <circle
                                cx={getX(point.date)}
                                cy={getY(point.weight)}
                                r={hoveredIndex === i ? circleRadius + 2 : circleRadius}
                                className={`fill-white stroke-blue-500 stroke-[2] md:stroke-[3] transition-all ${hoveredIndex === i ? 'stroke-blue-600' : ''}`}
                            />

                            {/* Tooltip - Only visible if hovered/clicked */}
                            {hoveredIndex === i && (
                                <g className="animate-in fade-in zoom-in-95 duration-200" style={{ pointerEvents: 'auto' }}>
                                    {/* Tooltip Box via foreignObject for better HTML/Button support */}
                                    <foreignObject
                                        x={getX(point.date) - (isMobile ? 50 : 60)}
                                        y={getY(point.weight) - (isMobile ? 55 : 65)}
                                        width={isMobile ? 100 : 120}
                                        height={50}
                                        style={{ overflow: 'visible' }}
                                    >
                                        <div className="relative flex flex-col items-center justify-center bg-slate-800 text-white rounded-lg shadow-xl px-3 py-1.5 text-xs">
                                            {/* Close Button - Only for manual weights */}
                                            {point.source === 'manual' && onDeleteWeight && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteWeight(point);
                                                    }}
                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-sm z-50 cursor-pointer transition-transform hover:scale-110"
                                                    title="Excluir medição"
                                                >
                                                    <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                                                </button>
                                            )}

                                            <span className="font-bold text-sm">{point.weight} kg</span>
                                            <span className="text-[10px] text-slate-300 mt-0.5">
                                                {point.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                            </span>

                                            {/* Little Chevron/Arrow */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-[6px] border-t-slate-800"></div>
                                        </div>
                                    </foreignObject>
                                </g>
                            )}
                        </g>
                    ))}

                    {/* X-Axis Labels */}
                    {dataPoints.length > 0 && (
                        <g>
                            {(() => {
                                const start = dataPoints[0].date;
                                const end = dataPoints[dataPoints.length - 1].date;
                                const isSameYear = start.getFullYear() === end.getFullYear();
                                const isSameMonth = isSameYear && start.getMonth() === end.getMonth();

                                // If range is small (same month), show days. Otherwise show month/year.
                                const formatOpts: Intl.DateTimeFormatOptions = isSameMonth
                                    ? { day: '2-digit', month: 'short' } // '01 dez'
                                    : { month: 'short', year: '2-digit' }; // 'dez. 25'

                                return (
                                    <>
                                        <text
                                            x={getX(start)}
                                            y={height - 5}
                                            textAnchor="start"
                                            style={{ fontSize: fontSizeAxis }}
                                            className="fill-slate-400 font-medium"
                                        >
                                            {start.toLocaleDateString('pt-BR', formatOpts)}
                                        </text>

                                        <text
                                            x={getX(end)}
                                            y={height - 5}
                                            textAnchor="end"
                                            style={{ fontSize: fontSizeAxis }}
                                            className="fill-slate-400 font-medium"
                                        >
                                            {end.toLocaleDateString('pt-BR', formatOpts)}
                                        </text>
                                    </>
                                );
                            })()}
                        </g>
                    )}
                </svg>

            </div>

            {trendPoints && (
                <div className="flex justify-end mt-4">
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
                        <span className="w-4 h-0.5 bg-orange-400 opacity-60"></span>
                        <span>Tendência</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeightEvolutionChart;

import React, { useMemo } from 'react';
import { Injection, Patient } from '../types';

interface WeightEvolutionChartProps {
    patient: Patient;
    injections: Injection[];
}

interface ChartPoint {
    date: Date;
    weight: number;
    label: string;
    type: 'initial' | 'record' | 'current';
}

const WeightEvolutionChart: React.FC<WeightEvolutionChartProps> = ({ patient, injections }) => {
    // Responsive Logic - MOVED TO TOP to avoid hook error
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 1. Prepare Data
    const dataPoints: ChartPoint[] = useMemo(() => {
        const points: ChartPoint[] = [];

        // Initial Weight
        // ... (data prep logic) ...

        // Filter injections with valid weight
        const weightRecords = injections
            .filter(inj => inj.patientWeightAtInjection)
            .map(inj => ({
                date: new Date(inj.applicationDate), // Use simple date part
                weight: inj.patientWeightAtInjection!,
                label: inj.date, // Formatted date
                type: 'record' as const
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        // Add Initial Weight at the beginning
        if (patient.initialWeight) {
            let startDate = new Date();
            if (weightRecords.length > 0) {
                startDate = new Date(weightRecords[0].date);
                startDate.setDate(startDate.getDate() - 7); // Assume started a week before first recorded dose if valid
            } else {
                startDate.setDate(startDate.getDate() - 30); // Default 1 month ago if no data
            }

            points.push({
                date: startDate,
                weight: patient.initialWeight,
                label: 'Início',
                type: 'initial'
            });
        }

        // Add records
        points.push(...weightRecords);

        // Dedup by date (keep latest)
        // Sort by date
        return points.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [patient, injections]);

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

    // 4. Target Line
    const targetY = patient.targetWeight ? getY(patient.targetWeight) : null;

    // 5. Trend Line (Linear Regression)
    const trendPoints = React.useMemo(() => {
        if (dataPoints.length < 2) return null;

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
        <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 md:p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-4 md:mb-6">
                <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">monitoring</span>
                        Evolução do Peso
                    </h3>
                </div>
                {trendPoints && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="w-4 h-0.5 bg-orange-400 opacity-60"></span>
                        <span>Tendência</span>
                    </div>
                )}
            </div>

            <div className={`w-full transition-all duration-300 ${isMobile ? 'aspect-[4/3]' : 'aspect-[21/9]'} min-h-[250px]`}>
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                    </defs>

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
                        />
                    )}

                    {/* Target Line */}
                    {targetY && (
                        <g>
                            <line
                                x1={padding.left}
                                y1={targetY}
                                x2={width - padding.right}
                                y2={targetY}
                                stroke="#a855f7"
                                strokeWidth={isMobile ? 1.5 : 2}
                                strokeDasharray="6 4"
                                className="opacity-80"
                            />
                            <text
                                x={width - padding.right}
                                y={targetY - 6}
                                textAnchor="end"
                                style={{ fontSize: fontSizeAxis }}
                                className="fill-purple-500 font-bold uppercase tracking-wider"
                            >
                                Meta: {patient.targetWeight}kg
                            </text>
                        </g>
                    )}

                    {/* Main Line Area */}
                    <path d={areaPath} fill="url(#lineGradient)" />

                    {/* Main Line */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth={isMobile ? 2.5 : 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-sm"
                    />

                    {/* Data Points */}
                    {dataPoints.map((point, i) => (
                        <g key={i} className="group cursor-pointer">
                            <circle
                                cx={getX(point.date)}
                                cy={getY(point.weight)}
                                r={circleRadius}
                                className="fill-white stroke-blue-500 stroke-[2] md:stroke-[3] transition-all group-hover:r-7 group-hover:stroke-blue-600"
                            />

                            {/* Improved Tooltip logic for Mobile */}
                            {/* Always show label for first, last, and if mobile, maybe alternating? Or just touch interaction */}
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <rect
                                    x={getX(point.date) - (isMobile ? 30 : 40)}
                                    y={getY(point.weight) - (isMobile ? 35 : 45)}
                                    width={isMobile ? 60 : 80}
                                    height={isMobile ? 25 : 35}
                                    rx="6"
                                    className="fill-slate-800 dark:fill-white"
                                />
                                <text
                                    x={getX(point.date)}
                                    y={getY(point.weight) - (isMobile ? 20 : 30)}
                                    textAnchor="middle"
                                    style={{ fontSize: fontSizeLabel }}
                                    className="fill-white dark:fill-slate-900 font-bold"
                                >
                                    {point.weight} kg
                                </text>
                                {!isMobile && (
                                    <text
                                        x={getX(point.date)}
                                        y={getY(point.weight) - 18}
                                        textAnchor="middle"
                                        className="text-[9px] fill-slate-300 dark:fill-slate-500"
                                    >
                                        {point.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </text>
                                )}
                            </g>
                        </g>
                    ))}

                    {/* X-Axis Labels */}
                    {dataPoints.length > 0 && (
                        <g>
                            <text
                                x={getX(dataPoints[0].date)}
                                y={height - 5}
                                textAnchor="start"
                                style={{ fontSize: fontSizeAxis }}
                                className="fill-slate-400 font-medium"
                            >
                                {dataPoints[0].date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                            </text>

                            <text
                                x={getX(dataPoints[dataPoints.length - 1].date)}
                                y={height - 5}
                                textAnchor="end"
                                style={{ fontSize: fontSizeAxis }}
                                className="fill-slate-400 font-medium"
                            >
                                {dataPoints[dataPoints.length - 1].date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                            </text>
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
};

export default WeightEvolutionChart;

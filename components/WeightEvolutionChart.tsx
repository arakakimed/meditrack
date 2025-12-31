import React, { useMemo, useState } from 'react';
import { Patient, CLINICAL_ZONES } from '../types';

export interface WeightDataPoint {
    id?: string;
    date: Date;
    weight: number;
    source: 'injection' | 'manual' | 'initial';
    label?: string;
}

interface WeightEvolutionChartProps {
    patient: Patient;
    weightHistory: WeightDataPoint[];
    onDeleteWeight?: (point: WeightDataPoint) => void;
    action?: React.ReactNode;
}

const WeightEvolutionChart: React.FC<WeightEvolutionChartProps> = ({ patient, weightHistory, onDeleteWeight, action }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close tooltip when clicking outside the chart
    const chartRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (selectedIndex === null) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (chartRef.current && !chartRef.current.contains(event.target as Node)) {
                setSelectedIndex(null);
            }
        };

        // Use a small delay to avoid closing immediately on the same click
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [selectedIndex]);

    const dataPoints = useMemo(() => {
        return [...weightHistory].sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [weightHistory]);

    const width = isMobile ? 350 : 800;
    const height = isMobile ? 250 : 300;
    const padding = isMobile
        ? { top: 40, right: 20, bottom: 30, left: 35 }
        : { top: 50, right: 40, bottom: 30, left: 40 };

    const safeWeights = dataPoints.length > 0 ? dataPoints.map(p => p.weight) : [0];
    const minWeight = Math.min(...safeWeights, patient.targetWeight || 999) - 2;
    const maxWeight = Math.max(...safeWeights, patient.initialWeight || 0) + 2;
    const weightRange = maxWeight - minWeight || 10;

    const minDate = dataPoints.length > 0 ? dataPoints[0].date.getTime() : new Date().getTime();
    const maxDate = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].date.getTime() : new Date().getTime();
    const dateRange = maxDate - minDate || 1;

    const getX = React.useCallback((date: Date) => {
        const percent = (date.getTime() - minDate) / dateRange;
        return padding.left + percent * (width - padding.left - padding.right);
    }, [minDate, dateRange, width, padding]);

    const getY = React.useCallback((weight: number) => {
        const percent = (weight - minWeight) / weightRange;
        return height - padding.bottom - percent * (height - padding.top - padding.bottom);
    }, [minWeight, weightRange, height, padding]);

    const linePath = dataPoints.reduce((path, point, i) => {
        const x = getX(point.date);
        const y = getY(point.weight);
        return i === 0 ? `M ${x},${y}` : `${path} L ${x},${y}`;
    }, "");

    const areaPath = dataPoints.length > 0 ? `
        ${linePath}
        L ${getX(dataPoints[dataPoints.length - 1].date)},${height - padding.bottom}
        L ${getX(dataPoints[0].date)},${height - padding.bottom}
        Z
    ` : "";

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

        return [
            `M ${pointsUpper[0][0]},${pointsUpper[0][1]}`,
            ...pointsUpper.map(p => `L ${p[0]},${p[1]}`),
            ...pointsLower.reverse().map(p => `L ${p[0]},${p[1]}`),
            'Z'
        ].join(' ');
    }, [dataPoints, patient.initialWeight, patient.gender, getX, getY]);

    const superZonePath = useMemo(() => {
        if (!patient.initialWeight || dataPoints.length === 0) return null;
        const startDate = dataPoints[0].date.getTime();
        const gender = patient.gender === 'Male' ? 'Male' : 'Female';
        const zones = CLINICAL_ZONES[gender];
        const superPointsUpper: [number, number][] = [];
        const superPointsLower: [number, number][] = [];
        let hasSuperPoints = false;

        dataPoints.forEach(point => {
            const daysSinceStart = (point.date.getTime() - startDate) / (1000 * 60 * 60 * 24);
            const currentWeek = daysSinceStart / 7;
            let w1 = zones[0], w2 = zones[zones.length - 1];

            for (let i = 0; i < zones.length - 1; i++) {
                if (currentWeek >= zones[i].week && currentWeek <= zones[i + 1].week) {
                    w1 = zones[i]; w2 = zones[i + 1]; break;
                }
            }
            const weekRange = w2.week - w1.week;
            const progress = (currentWeek - w1.week) / (weekRange || 1);
            const maxLossPercent = w1.maxLoss + (w2.maxLoss - w1.maxLoss) * progress;
            const lowerLimitKg = patient.initialWeight! * (1 - (maxLossPercent / 100));

            if (point.weight < lowerLimitKg) {
                hasSuperPoints = true;
                superPointsUpper.push([getX(point.date), getY(lowerLimitKg)]);
                superPointsLower.push([getX(point.date), getY(point.weight)]);
            } else {
                const yLimit = getY(lowerLimitKg);
                superPointsUpper.push([getX(point.date), yLimit]);
                superPointsLower.push([getX(point.date), yLimit]);
            }
        });

        if (!hasSuperPoints || superPointsUpper.length < 2) return null;

        return [
            `M ${superPointsUpper[0][0]},${superPointsUpper[0][1]}`,
            ...superPointsUpper.map(p => `L ${p[0]},${p[1]}`),
            ...superPointsLower.reverse().map(p => `L ${p[0]},${p[1]}`),
            'Z'
        ].join(' ');
    }, [dataPoints, patient.initialWeight, patient.gender, getX, getY]);

    const trendPoints = React.useMemo(() => {
        if (dataPoints.length < 2) return null;
        const n = dataPoints.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        dataPoints.forEach(p => {
            const x = p.date.getTime();
            const y = p.weight;
            sumX += x; sumY += y; sumXY += (x * y); sumXX += (x * x);
        });
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const startY = slope * minDate + intercept;
        const endY = slope * maxDate + intercept;
        return { x1: getX(new Date(minDate)), y1: getY(startY), x2: getX(new Date(maxDate)), y2: getY(endY) };
    }, [dataPoints, minDate, maxDate, getX, getY]);

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

    const fontSizeAxis = isMobile ? 10 : 10;
    const circleRadius = isMobile ? 4 : 5;

    return (
        <div ref={chartRef} className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 md:p-6 overflow-hidden relative">
            <div className="flex justify-between items-center mb-4 md:mb-6">
                <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">monitoring</span>
                        Evolução do Peso
                    </h3>
                </div>
                {action && <div className="z-10">{action}</div>}
            </div>

            <div className={`w-full transition-all duration-300 ${isMobile ? 'aspect-[4/3]' : 'aspect-[21/9]'} min-h-[250px] relative`}>
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible relative z-20 pointer-events-none" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                        <clipPath id="chartClip">
                            <rect x={padding.left} y={0} width={width - padding.left - padding.right} height={height} />
                        </clipPath>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
                        </filter>
                    </defs>

                    {targetZonePath && <path d={targetZonePath} fill="#94a3b8" className="opacity-20 dark:opacity-30" clipPath="url(#chartClip)" />}
                    {superZonePath && <path d={superZonePath} fill="#10b981" fillOpacity={0.3} className="transition-all duration-500" clipPath="url(#chartClip)" />}

                    {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                        const w = minWeight + tick * weightRange;
                        const y = getY(w);
                        return (
                            <g key={tick}>
                                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" className="text-slate-100 dark:text-slate-700" strokeWidth="1" />
                                <text x={padding.left - 6} y={y + 3} textAnchor="end" style={{ fontSize: fontSizeAxis }} className="fill-slate-400 font-medium">{w.toFixed(0)}</text>
                            </g>
                        );
                    })}

                    {trendPoints && <line x1={trendPoints.x1} y1={trendPoints.y1} x2={trendPoints.x2} y2={trendPoints.y2} stroke="#fb923c" strokeWidth="1.5" strokeDasharray="4 2" className="opacity-60" clipPath="url(#chartClip)" />}

                    <path d={areaPath} fill="url(#lineGradient)" clipPath="url(#chartClip)" />
                    <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={isMobile ? 2.5 : 3} strokeLinecap="round" strokeLinejoin="round" clipPath="url(#chartClip)" />

                    {(() => {
                        const start = dataPoints[0].date;
                        const end = dataPoints[dataPoints.length - 1].date;
                        const isSameYear = start.getFullYear() === end.getFullYear();
                        const isSameMonth = isSameYear && start.getMonth() === end.getMonth();
                        const formatOpts: Intl.DateTimeFormatOptions = isSameMonth ? { day: '2-digit', month: 'short' } : { month: 'short', year: '2-digit' };
                        return (
                            <>
                                <text x={getX(start)} y={height - 5} textAnchor="start" style={{ fontSize: fontSizeAxis }} className="fill-slate-400 font-medium">{start.toLocaleDateString('pt-BR', formatOpts)}</text>
                                <text x={getX(end)} y={height - 5} textAnchor="end" style={{ fontSize: fontSizeAxis }} className="fill-slate-400 font-medium">{end.toLocaleDateString('pt-BR', formatOpts)}</text>
                            </>
                        );
                    })()}

                    {dataPoints.map((point, i) => (
                        <g
                            key={i}
                            onClick={(e) => { e.stopPropagation(); setSelectedIndex(selectedIndex === i ? null : i); }}
                            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                        >
                            <circle cx={getX(point.date)} cy={getY(point.weight)} r={20} fill="transparent" />
                            <circle
                                cx={getX(point.date)}
                                cy={getY(point.weight)}
                                r={selectedIndex === i ? circleRadius + 2 : circleRadius}
                                className={`fill-white stroke-blue-500 stroke-[2] transition-all ${selectedIndex === i ? 'stroke-blue-600' : ''}`}
                            />
                        </g>
                    ))}

                    {/* TOOLTIP BLINDADO */}
                    {selectedIndex !== null && dataPoints[selectedIndex] && (() => {
                        const point = dataPoints[selectedIndex];
                        const x = getX(point.date);
                        const y = getY(point.weight);
                        const tipWidth = 110;
                        const tipHeight = 55;
                        const tipX = x - (tipWidth / 2);
                        const tipY = y - tipHeight - 12;
                        const safeX = Math.max(padding.left, Math.min(tipX, width - padding.right - tipWidth));

                        return (
                            <g className="animate-in fade-in zoom-in-95 duration-200" filter="url(#shadow)" style={{ pointerEvents: 'auto' }}>
                                <rect x={safeX} y={tipY} width={tipWidth} height={tipHeight} rx="8" fill="#1e293b" />
                                <path d={`M ${x - 6} ${tipY + tipHeight} L ${x} ${tipY + tipHeight + 6} L ${x + 6} ${tipY + tipHeight} Z`} fill="#1e293b" />
                                <text x={safeX + (tipWidth / 2)} y={tipY + 22} textAnchor="middle" fill="white" fontWeight="bold" fontSize="14">{point.weight} kg</text>
                                <text x={safeX + (tipWidth / 2)} y={tipY + 42} textAnchor="middle" fill="#94a3b8" fontSize="10" className="uppercase">{point.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</text>

                                {point.source === 'manual' && onDeleteWeight && (
                                    <g
                                        onPointerDown={(e) => {
                                            // SOLUÇÃO DA RACE CONDITION:
                                            // 1. Prevenir QUALQUER propagação (pointer é mais confiável que click em SVG)
                                            e.stopPropagation();
                                            e.preventDefault();

                                            // 2. Capturar os dados do ponto ANTES de qualquer mudança de estado
                                            const pointToDelete = { ...point };

                                            // 3. Notificar o PAI PRIMEIRO (síncrono) - Isso garante que setWeightToDelete seja chamado
                                            onDeleteWeight(pointToDelete);

                                            // 4. SÓ DEPOIS fechar o tooltip (próximo tick para garantir que o pai processou)
                                            requestAnimationFrame(() => {
                                                setSelectedIndex(null);
                                            });
                                        }}
                                        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                                    >
                                        <circle cx={safeX + tipWidth} cy={tipY} r={18} fill="transparent" />
                                        <circle cx={safeX + tipWidth} cy={tipY} r={10} fill="#ef4444" stroke="white" strokeWidth="2" />
                                        <path d={`M ${safeX + tipWidth - 3} ${tipY - 3} L ${safeX + tipWidth + 3} ${tipY + 3} M ${safeX + tipWidth + 3} ${tipY - 3} L ${safeX + tipWidth - 3} ${tipY + 3}`} stroke="white" strokeWidth="2" strokeLinecap="round" />
                                    </g>
                                )}
                            </g>
                        );
                    })()}
                </svg>
            </div>
        </div>
    );
};

export default WeightEvolutionChart;
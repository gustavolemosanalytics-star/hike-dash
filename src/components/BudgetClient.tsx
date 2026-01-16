"use client";

import { useMemo, useState } from "react";
import { Transaction, BudgetEntry } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, LabelList
} from "recharts";
import { motion } from "framer-motion";
import { PageLayout, PageContent, PageHeader } from "@/components/ui/PageLayout";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface BudgetClientProps {
    transactions: Transaction[];
    budgetData: BudgetEntry[];
}

// Enhanced Gauge component with compact number display
function BudgetGauge({ value, target, label }: { value: number, target: number, label: string }) {
    const safeValue = isNaN(value) ? 0 : value;
    const safeTarget = isNaN(target) || target === 0 ? 1000000 : target;
    const percentage = Math.min(100, Math.max(-100, (safeValue / safeTarget) * 100));
    const displayPercentage = Math.abs(percentage);

    const radius = 70;
    const strokeWidth = 14;
    const circumference = Math.PI * radius;
    const fillLength = (displayPercentage / 100) * circumference;
    const emptyLength = circumference - fillLength;

    // Use compact format for large numbers to prevent overflow
    const formatCompactValue = (val: number) => {
        const absVal = Math.abs(val);
        if (absVal >= 1000000) {
            return (val < 0 ? '-' : '') + 'R$ ' + (absVal / 1000000).toFixed(1) + ' mi';
        } else if (absVal >= 1000) {
            return (val < 0 ? '-' : '') + 'R$ ' + (absVal / 1000).toFixed(0) + ' mil';
        }
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
    };

    const formatCompact = (val: number) => {
        const absVal = Math.abs(val);
        if (absVal >= 1000000) {
            return 'R$ ' + (absVal / 1000000).toFixed(1) + ' mi';
        } else if (absVal >= 1000) {
            return 'R$ ' + (absVal / 1000).toFixed(0) + ' mil';
        }
        return 'R$ ' + absVal.toFixed(0);
    };

    return (
        <div className="flex flex-col items-center justify-center py-4 px-2">
            <h4 className="text-sm font-semibold text-slate-500 mb-2">{label}</h4>
            <div className="relative">
                <svg width="160" height="90" viewBox="0 0 160 90">
                    {/* Background arc */}
                    <path
                        d="M 15 80 A 65 65 0 0 1 145 80"
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                    {/* Filled arc */}
                    <motion.path
                        d="M 15 80 A 65 65 0 0 1 145 80"
                        fill="none"
                        stroke={percentage >= 0 ? "#22C55E" : "#EF4444"}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={`${circumference}`}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: emptyLength }}
                        transition={{ duration: 1, type: "spring" }}
                    />
                </svg>
                {/* Percentage in center of arc */}
                <div className="absolute inset-0 flex items-center justify-center pt-4">
                    <span className={`text-2xl font-bold ${percentage >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {percentage.toFixed(0)}%
                    </span>
                </div>
            </div>
            {/* Value display below */}
            <div className="text-center mt-1">
                <div className={`text-lg font-bold ${safeValue >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                    {formatCompactValue(safeValue)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                    Meta: {formatCompact(safeTarget)}
                </div>
            </div>
        </div>
    );
}

// BU Header with visual emphasis
function BUHeader({ buName }: { buName: string }) {
    return (
        <div className="flex items-center gap-4 my-5">
            <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-300"></div>
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur-md opacity-20"></div>
                <span className="relative inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-slate-700 to-slate-600 text-white text-sm font-bold uppercase tracking-wider rounded-full shadow-lg">
                    <span className="w-2 h-2 bg-white/80 rounded-full animate-pulse"></span>
                    {buName}
                </span>
            </div>
            <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-slate-200 to-slate-300"></div>
        </div>
    );
}

// Custom XAxis tick component that wraps long text into two lines
function CustomXAxisTick({ x, y, payload }: any) {
    const text = payload?.value || '';
    const maxCharsPerLine = 10;

    // Split text into two lines if longer than maxCharsPerLine
    let line1 = text;
    let line2 = '';

    if (text.length > maxCharsPerLine) {
        // Find a good break point (space or after maxCharsPerLine)
        const breakPoint = text.lastIndexOf(' ', maxCharsPerLine);
        if (breakPoint > 0) {
            line1 = text.substring(0, breakPoint);
            line2 = text.substring(breakPoint + 1);
        } else {
            line1 = text.substring(0, maxCharsPerLine);
            line2 = text.substring(maxCharsPerLine);
        }
        // Truncate line2 if still too long
        if (line2.length > maxCharsPerLine) {
            line2 = line2.substring(0, maxCharsPerLine - 2) + '...';
        }
    }

    return (
        <g transform={`translate(${x},${y})`}>
            <text
                x={0}
                y={0}
                dy={8}
                textAnchor="middle"
                fill="#64748b"
                fontSize={8}
            >
                {line1}
            </text>
            {line2 && (
                <text
                    x={0}
                    y={0}
                    dy={18}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize={8}
                >
                    {line2}
                </text>
            )}
        </g>
    );
}

export function BudgetClient({ transactions, budgetData }: BudgetClientProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Filter transactions
    const filtered = useMemo(() => {
        return transactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;

            if (dateRange?.from && t.date) {
                try {
                    const tDate = parseISO(t.date);
                    const from = startOfDay(dateRange.from);
                    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
                    if (!isWithinInterval(tDate, { start: from, end: to })) return false;
                } catch (e) { return false; }
            }
            return true;
        });
    }, [transactions, selectedBU, dateRange]);

    // Aggregate budget data (Orçado) by BU, Tipo, and MacroCategory
    const budgetByBU = useMemo(() => {
        const map = new Map<string, Map<string, Map<string, number>>>();

        budgetData.forEach(entry => {
            if (!entry.bu || entry.bu === 'N/D') return;

            if (!map.has(entry.bu)) {
                map.set(entry.bu, new Map());
            }

            const buMap = map.get(entry.bu)!;
            const tipo = entry.tipo || 'Outros';

            if (!buMap.has(tipo)) {
                buMap.set(tipo, new Map());
            }

            const tipoMap = buMap.get(tipo)!;
            const macro = entry.macroCategory || 'Outros';

            tipoMap.set(macro, (tipoMap.get(macro) || 0) + entry.valor);
        });

        return map;
    }, [budgetData]);

    // Realized data (Realizado) by BU
    const realizedByBU = useMemo(() => {
        const buMap = new Map<string, {
            name: string;
            recebido: number;
            aReceber: number;
            receita: number;
            despesa: number;
            resultado: number;
            tipoData: Map<string, Map<string, number>>;
        }>();

        filtered.forEach(t => {
            const bu = t.bu || "N/D";
            if (bu === "N/D") return;

            if (!buMap.has(bu)) {
                buMap.set(bu, {
                    name: bu,
                    recebido: 0,
                    aReceber: 0,
                    receita: 0,
                    despesa: 0,
                    resultado: 0,
                    tipoData: new Map()
                });
            }

            const entry = buMap.get(bu)!;
            const tipo = t.type || "Outros";
            const macro = t.macroCategory || "Outros";

            if (!entry.tipoData.has(tipo)) {
                entry.tipoData.set(tipo, new Map());
            }
            const tipoMap = entry.tipoData.get(tipo)!;

            if (t.type === '1. Contas a Receber') {
                entry.receita += t.amount;
                entry.recebido += Math.abs(t.paidAmount || 0);
                entry.aReceber += Math.abs(t.pendingAmount || 0);
                tipoMap.set(macro, (tipoMap.get(macro) || 0) + t.amount);
            }
            if (t.type === '2. Contas a Pagar') {
                entry.despesa += Math.abs(t.amount);
                // Store negative value for Pagar
                tipoMap.set(macro, (tipoMap.get(macro) || 0) - Math.abs(t.amount));
            }

            entry.resultado = entry.receita - entry.despesa;
        });

        return buMap;
    }, [filtered]);

    // Combine budget and realized data for display
    const combinedData = useMemo(() => {
        const result: any[] = [];

        // Specific targets per BU
        const BU_TARGETS: Record<string, number> = {
            'Branding': 100000,
            'Marketing': 300000,
            'HBX': 500000,
            'SG&A': -1000000,
            'Sg&a': -1000000
        };

        // Get all unique BUs from both sources
        const allBUNames = new Set([
            ...Array.from(budgetByBU.keys()),
            ...Array.from(realizedByBU.keys())
        ]);

        Array.from(allBUNames).sort().forEach(buName => {
            if (buName === 'N/D') return;

            // Get maps
            const budgetMap = budgetByBU.get(buName) || new Map();
            const realizedEntry = realizedByBU.get(buName);
            const realizedMap = realizedEntry?.tipoData || new Map();

            // Calculate totals
            let orcadoTotal = 0;
            budgetMap.forEach((tipoMap: Map<string, number>) => {
                tipoMap.forEach((val: number) => orcadoTotal += val);
            });

            // Specific target or calculated budget total
            const meta = BU_TARGETS[buName] !== undefined ? BU_TARGETS[buName] : (orcadoTotal || 1000000);
            const realizadoTotal = realizedEntry?.resultado || 0;

            // Collect all unique MacroCategories
            const allMacros = new Set<string>();

            // From Budget
            budgetMap.forEach((tipoMap: Map<string, number>, tipo: string) => {
                tipoMap.forEach((val: number, macro: string) => allMacros.add(macro));
            });

            // From Realized
            realizedMap.forEach((tipoMap: Map<string, number>, tipo: string) => {
                tipoMap.forEach((val: number, macro: string) => allMacros.add(macro));
            });

            const rows: any[] = [];

            Array.from(allMacros).forEach(macro => {
                let macroOrcado = 0;
                let macroRealizado = 0;
                let macroTipo = '';

                // Sum budget for this macro
                budgetMap.forEach((tipoMap: Map<string, number>, tipo: string) => {
                    const val = tipoMap.get(macro);
                    if (val !== undefined) {
                        macroOrcado += val;
                        if (!macroTipo) macroTipo = tipo;
                    }
                });

                // Sum realized for this macro
                realizedMap.forEach((tipoMap: Map<string, number>, tipo: string) => {
                    const val = tipoMap.get(macro);
                    if (val !== undefined) {
                        macroRealizado += val;
                        if (!macroTipo) macroTipo = tipo;
                    }
                });

                // Determine styling class based on type
                const isReceber = macroTipo.includes('Receber');
                const isPagar = macroTipo.includes('Pagar');

                rows.push({
                    macro,
                    orcado: macroOrcado,
                    realizado: macroRealizado,
                    isReceber,
                    isPagar
                });
            });

            // Sort rows by realized value magnitude (descending)
            rows.sort((a, b) => Math.abs(b.realizado) - Math.abs(a.realizado));

            // Chart Data - Top 5 Categories (Orçado vs Realizado)
            const chartData = rows.slice(0, 5).map(r => ({
                name: r.macro.length > 15 ? r.macro.substring(0, 15) + '...' : r.macro,
                Orçado: Math.abs(r.orcado),
                Realizado: Math.abs(r.realizado),
                rawRealizado: r.realizado // for reference
            }));

            result.push({
                buName,
                meta,
                rows,
                orcadoTotal,
                realizadoTotal,
                chartData
            });
        });

        // Sort BUs by name
        return result.sort((a, b) => a.buName.localeCompare(b.buName));
    }, [budgetByBU, realizedByBU]);

    // Filter by selected BU
    const displayedBUs = selectedBU === "All"
        ? combinedData
        : combinedData.filter(d => d.buName === selectedBU);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const formatCompact = (val: number) => {
        const absVal = Math.abs(val);
        if (absVal >= 1000000) {
            return (val < 0 ? '-' : '') + 'R$ ' + (absVal / 1000000).toFixed(1) + ' mi';
        } else if (absVal >= 1000) {
            return (val < 0 ? '-' : '') + 'R$ ' + (absVal / 1000).toFixed(0) + ' mil';
        }
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <PageLayout>
            <PageHeader
                title="Budget"
                subtitle="Orçado vs Realizado por Unidade de Negócio"
            >
                <div className="flex items-center gap-2">
                    <FilterDropdown
                        label="Business Unit"
                        options={["All", ...combinedData.map(d => d.buName)]}
                        value={selectedBU}
                        onChange={setSelectedBU}
                    />
                    <DateRangePicker
                        date={dateRange}
                        setDate={setDateRange}
                    />
                </div>
            </PageHeader>

            <PageContent>
                {/* 4 Quadrants Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pb-10">
                    {displayedBUs.map((bu, index) => (
                        <motion.div
                            key={bu.buName}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="glass-card rounded-2xl border border-white/40 shadow-sm p-6 flex flex-col h-full bg-white/80"
                        >
                            {/* Header: Name + Total Badge */}
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-700">{bu.buName}</h2>
                                <div className={`px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm ${bu.realizadoTotal >= 0
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : 'bg-rose-50 text-rose-700 border-rose-100'
                                    }`}>
                                    {formatCurrency(bu.realizadoTotal)}
                                </div>
                            </div>

                            {/* Top: Unified Table */}
                            <div className="overflow-x-auto mb-6 flex-grow ">
                                <div className="flex items-center gap-2 mb-3">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        Realizado por Categoria
                                    </h3>
                                </div>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="text-left py-2 font-medium text-slate-500 pl-4">MacroCategoria</th>
                                            <th className="text-right py-2 font-medium text-slate-500">Orçado</th>
                                            <th className="text-right py-2 font-medium text-slate-500">Realizado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bu.rows.length > 0 ? (
                                            bu.rows.slice(0, 5).map((row: any, idx: number) => {
                                                const rowClass = row.isReceber
                                                    ? 'border-l-[4px] border-l-emerald-500 bg-emerald-100/50'
                                                    : row.isPagar
                                                        ? 'border-l-[4px] border-l-rose-500 bg-rose-50/50'
                                                        : 'hover:bg-slate-50/50';

                                                return (
                                                    <tr key={idx} className={`border-b border-slate-50 ${rowClass}`}>
                                                        <td className="py-2.5 pl-4 text-slate-700 font-medium truncate max-w-[150px]">
                                                            {row.macro}
                                                        </td>
                                                        <td className="py-2.5 text-right text-slate-500">
                                                            {row.orcado !== 0 ? formatCurrency(row.orcado) : '-'}
                                                        </td>
                                                        <td className={`py-2.5 text-right font-bold ${row.realizado >= 0 ? 'text-slate-700' : 'text-red-500'}`}>
                                                            {formatCurrency(row.realizado)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="py-6 text-center text-slate-400">Sem dados</td>
                                            </tr>
                                        )}
                                        {/* Total Row */}
                                        <tr className="bg-slate-50 font-bold border-t border-slate-200">
                                            <td className="py-2 pl-4 text-slate-800">Total</td>
                                            <td className="py-2 text-right text-slate-600">{formatCurrency(bu.orcadoTotal)}</td>
                                            <td className={`py-2 text-right ${bu.realizadoTotal >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                                                {formatCurrency(bu.realizadoTotal)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-slate-100 mb-6"></div>

                            {/* Bottom: Gauge + Bar Chart */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-[220px]">
                                {/* Left: Gauge */}
                                <div className="flex items-center justify-center border-r border-slate-100 pr-4">
                                    <BudgetGauge
                                        value={bu.realizadoTotal}
                                        target={bu.meta}
                                        label="% da Meta"
                                    />
                                </div>

                                {/* Right: Bar Chart */}
                                <div className="flex flex-col justify-center h-full pt-4">
                                    <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                                        Orçado vs Realizado (Top 5)
                                    </h4>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={bu.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="name"
                                                tick={<CustomXAxisTick />}
                                                axisLine={false}
                                                tickLine={false}
                                                interval={0}
                                                height={40}
                                            />
                                            <YAxis
                                                hide
                                            />
                                            <Tooltip
                                                cursor={{ fill: '#f1f5f9' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: any) => formatCompact(Number(value || 0))}
                                            />
                                            <Bar dataKey="Orçado" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar dataKey="Realizado" fill="#64748b" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </PageContent>
        </PageLayout>
    );
}

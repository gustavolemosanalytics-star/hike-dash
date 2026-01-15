"use client";

import { useMemo, useState } from "react";
import { Transaction, BudgetEntry } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, LabelList, Cell
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

// Enhanced Gauge component matching the reference image
function BudgetGauge({ value, target, label }: { value: number, target: number, label: string }) {
    const safeValue = isNaN(value) ? 0 : value;
    const safeTarget = isNaN(target) || target === 0 ? 1 : target;
    const percentage = Math.min(100, Math.max(-100, (safeValue / safeTarget) * 100));
    const displayPercentage = Math.abs(percentage);

    const radius = 70;
    const strokeWidth = 14;
    const circumference = Math.PI * radius;
    const fillLength = (displayPercentage / 100) * circumference;
    const emptyLength = circumference - fillLength;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="relative flex flex-col items-center justify-center p-4">
            <h4 className="text-sm font-semibold text-slate-600 mb-3">{label}</h4>
            <svg width="180" height="100" viewBox="0 0 180 100">
                {/* Background arc */}
                <path
                    d="M 15 90 A 75 75 0 0 1 165 90"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                {/* Filled arc */}
                <motion.path
                    d="M 15 90 A 75 75 0 0 1 165 90"
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
            {/* Percentage display */}
            <div className="text-center -mt-4">
                <span className={`text-3xl font-bold ${percentage >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {percentage.toFixed(0)}%
                </span>
            </div>
            {/* Value and target display */}
            <div className="mt-3 text-center">
                <div className={`text-xl font-bold ${safeValue >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                    {formatCurrency(safeValue)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                    Meta: {formatCurrency(safeTarget)}
                </div>
            </div>
        </div>
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

    // Get unique BUs from transactions
    const allBUs = useMemo(() =>
        Array.from(new Set(transactions.map(t => t.bu).filter(bu => bu && bu !== 'N/D'))).sort()
        , [transactions]);

    // Aggregate budget data by BU and macroCategory (primary) and tipo (secondary)
    const budgetByBUAndCategory = useMemo(() => {
        const map = new Map<string, { bu: string, category: string, orcado: number }>();
        console.log('Budget data sample:', budgetData.slice(0, 10));

        budgetData.forEach(entry => {
            // Create keys for both macroCategory and tipo to ensure matching
            const macroCategoryKey = `${entry.bu}_${entry.macroCategory}`;
            const tipoKey = `${entry.bu}_${entry.tipo}`;

            // Add by macroCategory
            if (entry.macroCategory) {
                if (!map.has(macroCategoryKey)) {
                    map.set(macroCategoryKey, { bu: entry.bu, category: entry.macroCategory, orcado: 0 });
                }
                map.get(macroCategoryKey)!.orcado += entry.valor;
            }

            // Also add by tipo if different
            if (entry.tipo && entry.tipo !== entry.macroCategory) {
                if (!map.has(tipoKey)) {
                    map.set(tipoKey, { bu: entry.bu, category: entry.tipo, orcado: 0 });
                }
                map.get(tipoKey)!.orcado += entry.valor;
            }
        });

        console.log('Budget by BU and Category:', Array.from(map.entries()).slice(0, 20));
        return map;
    }, [budgetData]);

    // Budget totals by BU (for meta calculation)
    const metasByBU = useMemo(() => {
        const map: Record<string, number> = {};
        budgetData.forEach(entry => {
            if (!map[entry.bu]) map[entry.bu] = 0;
            map[entry.bu] += entry.valor;
        });
        console.log('Metas by BU:', map);
        return map;
    }, [budgetData]);

    // Realized data by BU - organized by "Tipo" to match the reference image
    const realizedByBU = useMemo(() => {
        const buMap = new Map();

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
                    // Use "tipo" categories to match the reference image layout
                    tipoCategories: new Map()
                });
            }

            const entry = buMap.get(bu);
            // Use the transaction type (e.g., "1. Contas a Receber") as the primary category
            const tipo = t.type || "Outros";
            const macro = t.macroCategory || "Outros";

            // Aggregate by tipo (main category like "1. Contas a Receber", "Pessoas", etc.)
            if (!entry.tipoCategories.has(tipo)) {
                entry.tipoCategories.set(tipo, {
                    name: tipo,
                    realizado: 0,
                    // Also track by macro for sub-categorization
                    macros: new Map()
                });
            }

            const tipoEntry = entry.tipoCategories.get(tipo);

            if (!tipoEntry.macros.has(macro)) {
                tipoEntry.macros.set(macro, { name: macro, realizado: 0 });
            }
            const macroEntry = tipoEntry.macros.get(macro);

            if (t.type === '1. Contas a Receber') {
                entry.receita += t.amount;
                entry.recebido += Math.abs(t.paidAmount || 0);
                entry.aReceber += Math.abs(t.pendingAmount || 0);
                tipoEntry.realizado += t.amount;
                macroEntry.realizado += t.amount;
            }
            if (t.type === '2. Contas a Pagar') {
                entry.despesa += Math.abs(t.amount);
                tipoEntry.realizado -= Math.abs(t.amount);
                macroEntry.realizado -= Math.abs(t.amount);
            }

            entry.resultado = entry.receita - entry.despesa;
        });

        // Convert to array and add budget data
        return Array.from(buMap.values()).map((bu: any) => {
            // Build categories list matching the reference image format
            const categories: any[] = [];

            // Add "1. Contas a Receber" first if exists
            const contasReceber = bu.tipoCategories.get('1. Contas a Receber');
            if (contasReceber) {
                const budgetKey = `${bu.name}_1. Contas a Receber`;
                const budgetEntry = budgetByBUAndCategory.get(budgetKey);
                categories.push({
                    name: '1. Contas a Receber',
                    realizado: contasReceber.realizado,
                    orcado: budgetEntry?.orcado || 0,
                    isPositive: true
                });
            }

            // Add expense categories from macros within "2. Contas a Pagar"
            const contasPagar = bu.tipoCategories.get('2. Contas a Pagar');
            if (contasPagar) {
                Array.from(contasPagar.macros.values()).forEach((macro: any) => {
                    const budgetKey = `${bu.name}_${macro.name}`;
                    const budgetEntry = budgetByBUAndCategory.get(budgetKey);
                    categories.push({
                        name: macro.name,
                        realizado: macro.realizado,
                        orcado: budgetEntry?.orcado || 0,
                        isPositive: false
                    });
                });
            }

            // Sort categories: positive first, then by absolute value
            categories.sort((a, b) => {
                if (a.isPositive && !b.isPositive) return -1;
                if (!a.isPositive && b.isPositive) return 1;
                return Math.abs(b.realizado) - Math.abs(a.realizado);
            });

            return {
                ...bu,
                categories,
                orcadoTotal: metasByBU[bu.name] || 0
            };
        });
    }, [filtered, budgetByBUAndCategory, metasByBU]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const formatCompact = (val: number) =>
        new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(val);

    return (
        <PageLayout>
            <PageHeader
                title="Budget"
                subtitle="Orçamento vs Realizado por BU"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* BU Cards Grid - Main content matching reference image */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {realizedByBU.map((bu: any) => {
                        // Prepare chart data for this BU's categories
                        const chartData = bu.categories.slice(0, 6).map((cat: any) => ({
                            name: cat.name.length > 15 ? cat.name.substring(0, 12) + '...' : cat.name,
                            fullName: cat.name,
                            Realizado: Math.abs(cat.realizado),
                            Budget: Math.abs(cat.orcado),
                            isNegative: cat.realizado < 0
                        }));

                        return (
                            <motion.div
                                key={bu.name}
                                className="glass-card rounded-2xl p-6 border border-white/40"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-slate-800">{bu.name}</h3>
                                    <span className={`text-sm font-semibold px-4 py-1.5 rounded-full ${bu.resultado >= 0
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}>
                                        Resultado: {formatCurrency(bu.resultado)}
                                    </span>
                                </div>

                                {/* Top section: Table + Gauge side by side */}
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
                                    {/* Left: Table - REALIZADO POR CATEGORIA (3 columns) */}
                                    <div className="lg:col-span-3 bg-slate-50 rounded-xl p-4">
                                        <h4 className="text-xs font-semibold text-slate-700 uppercase mb-3 tracking-wide">
                                            Realizado por Categoria
                                        </h4>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-slate-500 border-b border-slate-200">
                                                    <th className="text-left py-2 font-medium">Tipo</th>
                                                    <th className="text-right py-2 font-medium">Valor</th>
                                                    <th className="text-right py-2 font-medium">Budget</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bu.categories.slice(0, 7).map((cat: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-100/50 transition-colors">
                                                        <td className="py-2 text-slate-700 font-medium" title={cat.name}>
                                                            {cat.name.length > 20 ? cat.name.substring(0, 18) + '...' : cat.name}
                                                        </td>
                                                        <td className={`py-2 text-right font-semibold ${cat.realizado >= 0 ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                            {formatCurrency(cat.realizado)}
                                                        </td>
                                                        <td className="py-2 text-right text-slate-500">
                                                            {cat.orcado ? formatCurrency(cat.orcado) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Total row */}
                                                <tr className="border-t-2 border-slate-300 font-bold bg-slate-100/50">
                                                    <td className="py-3 text-slate-800">Total</td>
                                                    <td className={`py-3 text-right ${bu.resultado >= 0 ? 'text-green-700' : 'text-red-600'
                                                        }`}>
                                                        {formatCurrency(bu.resultado)}
                                                    </td>
                                                    <td className="py-3 text-right text-slate-600">
                                                        {bu.orcadoTotal ? formatCurrency(bu.orcadoTotal) : '-'}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Right: Gauge - % da Meta (2 columns) */}
                                    <div className="lg:col-span-2 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-100">
                                        <BudgetGauge
                                            value={bu.resultado}
                                            target={bu.orcadoTotal || 500000}
                                            label="% da Meta"
                                        />
                                    </div>
                                </div>

                                {/* Bottom: Bar Chart comparing Real vs Budget by category */}
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h4 className="text-xs font-semibold text-slate-700 uppercase mb-4 tracking-wide">
                                        Comparativo por Categoria
                                    </h4>
                                    <div className="h-[200px] w-full">
                                        {chartData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={chartData}
                                                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                                                    barCategoryGap="20%"
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                    <XAxis
                                                        dataKey="name"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fill: '#666', fontSize: 10 }}
                                                        interval={0}
                                                        angle={-15}
                                                        textAnchor="end"
                                                        height={50}
                                                    />
                                                    <YAxis
                                                        tickFormatter={(val) => formatCompact(val)}
                                                        tick={{ fontSize: 10 }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                        width={70}
                                                    />
                                                    <Tooltip
                                                        formatter={(val: any) => formatCurrency(Number(val))}
                                                        labelFormatter={(label) => {
                                                            const item = chartData.find((d: any) => d.name === label);
                                                            return item?.fullName || label;
                                                        }}
                                                    />
                                                    <Legend />
                                                    <Bar
                                                        dataKey="Realizado"
                                                        fill="#4A5568"
                                                        radius={[4, 4, 0, 0]}
                                                        name="Realizado"
                                                    >
                                                        {chartData.map((entry: any, index: number) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={entry.isNegative ? '#EF4444' : '#4A5568'}
                                                            />
                                                        ))}
                                                    </Bar>
                                                    <Bar
                                                        dataKey="Budget"
                                                        fill="#9CA3AF"
                                                        radius={[4, 4, 0, 0]}
                                                        name="Budget"
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-400">
                                                Sem dados para exibir
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </PageContent>
        </PageLayout>
    );
}

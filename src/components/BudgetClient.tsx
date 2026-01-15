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
            <div className={`text-lg font-bold mt-1 ${safeValue >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                {formatCompactValue(safeValue)}
            </div>
            {/* Range labels */}
            <div className="flex justify-between w-full mt-2 px-4 text-xs">
                <span className="text-green-500 font-medium">R$ 0</span>
                <span className="text-slate-400 font-medium">{formatCompact(safeTarget)}</span>
            </div>
        </div>
    );
}

// Elegant BU Header - more integrated, less spacing
function BUHeader({ buName }: { buName: string }) {
    return (
        <div className="flex items-center gap-4 mb-4 mt-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-slate-300"></div>
            <h2 className="text-xl font-bold text-slate-700 px-4 py-1.5 bg-slate-100 rounded-lg border border-slate-200 shadow-sm">
                {buName}
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-300 to-slate-300"></div>
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

    // Budget totals by BU (for meta calculation)
    const metasByBU = useMemo(() => {
        const map: Record<string, number> = {};
        budgetData.forEach(entry => {
            if (!entry.bu || entry.bu === 'N/D') return;
            if (!map[entry.bu]) map[entry.bu] = 0;
            map[entry.bu] += entry.valor;
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
                tipoMap.set(macro, (tipoMap.get(macro) || 0) - Math.abs(t.amount));
            }

            entry.resultado = entry.receita - entry.despesa;
        });

        return buMap;
    }, [filtered]);

    // Combine budget and realized data for display
    const combinedData = useMemo(() => {
        const result: any[] = [];

        // Get all unique BUs from both sources
        const allBUNames = new Set([
            ...Array.from(budgetByBU.keys()),
            ...Array.from(realizedByBU.keys())
        ]);

        allBUNames.forEach(buName => {
            const budgetData = budgetByBU.get(buName);
            const realizedData = realizedByBU.get(buName);

            // Build orçado table data
            const orcadoRows: any[] = [];
            let orcadoTotal = 0;

            if (budgetData) {
                // 1. Contas a Receber
                const contasReceber = budgetData.get('1. Contas a Receber');
                if (contasReceber) {
                    contasReceber.forEach((valor, macro) => {
                        orcadoRows.push({
                            tipo: '1. Contas a Receber',
                            macroCategoria: macro,
                            valor: valor,
                            isSubtotal: false
                        });
                        orcadoTotal += valor;
                    });
                    const subtotal = Array.from(contasReceber.values()).reduce((a, b) => a + b, 0);
                    orcadoRows.push({
                        tipo: '1. Contas a Receber Total',
                        macroCategoria: '',
                        valor: subtotal,
                        isSubtotal: true
                    });
                }

                // 2. Contas a Pagar
                const contasPagar = budgetData.get('2. Contas a Pagar');
                if (contasPagar) {
                    contasPagar.forEach((valor, macro) => {
                        orcadoRows.push({
                            tipo: '2. Contas a Pagar',
                            macroCategoria: macro,
                            valor: valor,
                            isSubtotal: false
                        });
                        orcadoTotal += valor;
                    });
                    const subtotal = Array.from(contasPagar.values()).reduce((a, b) => a + b, 0);
                    orcadoRows.push({
                        tipo: '2. Contas a Pagar Total',
                        macroCategoria: '',
                        valor: subtotal,
                        isSubtotal: true
                    });
                }
            }

            // Build realizado table data
            const realizadoRows: any[] = [];
            let realizadoTotal = 0;

            if (realizedData) {
                // 1. Contas a Receber
                const contasReceber = realizedData.tipoData.get('1. Contas a Receber');
                if (contasReceber) {
                    contasReceber.forEach((valor, macro) => {
                        realizadoRows.push({
                            tipo: '1. Contas a Receber',
                            macroCategoria: macro,
                            valor: valor,
                            isSubtotal: false
                        });
                        realizadoTotal += valor;
                    });
                    const subtotal = Array.from(contasReceber.values()).reduce((a, b) => a + b, 0);
                    realizadoRows.push({
                        tipo: '1. Contas a Receber Total',
                        macroCategoria: '',
                        valor: subtotal,
                        isSubtotal: true
                    });
                }

                // 2. Contas a Pagar
                const contasPagar = realizedData.tipoData.get('2. Contas a Pagar');
                if (contasPagar) {
                    contasPagar.forEach((valor, macro) => {
                        realizadoRows.push({
                            tipo: '2. Contas a Pagar',
                            macroCategoria: macro,
                            valor: valor,
                            isSubtotal: false
                        });
                        realizadoTotal += valor;
                    });
                    const subtotal = Array.from(contasPagar.values()).reduce((a, b) => a + b, 0);
                    realizadoRows.push({
                        tipo: '2. Contas a Pagar Total',
                        macroCategoria: '',
                        valor: subtotal,
                        isSubtotal: true
                    });
                }
            }

            result.push({
                buName,
                orcadoRows,
                orcadoTotal,
                realizadoRows,
                realizadoTotal,
                recebido: realizedData?.recebido || 0,
                aReceber: realizedData?.aReceber || 0,
                meta: metasByBU[buName] || 0
            });
        });

        return result.sort((a, b) => a.buName.localeCompare(b.buName));
    }, [budgetByBU, realizedByBU, metasByBU]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);

    const formatCompact = (val: number) =>
        new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(val);

    return (
        <PageLayout>
            <PageHeader
                title="Budget"
                subtitle="Orçado vs Realizado por BU"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* Per-BU Sections */}
                {combinedData.map((bu, index) => (
                    <motion.div
                        key={bu.buName}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                        {/* BU Header */}
                        <BUHeader buName={bu.buName} />

                        {/* Integrated Card: Tables + Charts */}
                        <div className="glass-card rounded-2xl border border-white/40 overflow-hidden mb-4">
                            {/* Top: Two tables side by side */}
                            <div className="grid grid-cols-1 lg:grid-cols-2">
                                {/* Left: Orçado Table */}
                                <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                            Orçado
                                        </h3>
                                    </div>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-1.5 text-slate-500 font-medium">Tipo</th>
                                                <th className="text-left py-1.5 text-slate-500 font-medium">MacroCategoria</th>
                                                <th className="text-right py-1.5 text-slate-500 font-medium">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bu.orcadoRows.length > 0 ? (
                                                <>
                                                    {bu.orcadoRows.slice(0, 8).map((row: any, idx: number) => (
                                                        <tr
                                                            key={idx}
                                                            className={`border-b border-slate-50 ${row.isSubtotal ? 'bg-slate-50 font-semibold' : ''}`}
                                                        >
                                                            <td className="py-1.5 text-slate-700 truncate max-w-[100px]">
                                                                {row.isSubtotal ? '' : '•'} {row.tipo.replace(/^\d\.\s*/, '')}
                                                            </td>
                                                            <td className="py-1.5 text-slate-500 truncate max-w-[100px]">{row.macroCategoria}</td>
                                                            <td className={`py-1.5 text-right font-medium ${row.valor >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                                                                {formatCurrency(row.valor)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-100 font-bold">
                                                        <td className="py-2 text-slate-800" colSpan={2}>Total</td>
                                                        <td className={`py-2 text-right ${bu.orcadoTotal >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                                                            {formatCurrency(bu.orcadoTotal)}
                                                        </td>
                                                    </tr>
                                                </>
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                                                        Sem dados
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Right: Realizado Table */}
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                                        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                            Realizado
                                        </h3>
                                    </div>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-1.5 text-slate-500 font-medium">Tipo</th>
                                                <th className="text-left py-1.5 text-slate-500 font-medium">MacroCategoria</th>
                                                <th className="text-right py-1.5 text-slate-500 font-medium">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bu.realizadoRows.length > 0 ? (
                                                <>
                                                    {bu.realizadoRows.slice(0, 8).map((row: any, idx: number) => (
                                                        <tr
                                                            key={idx}
                                                            className={`border-b border-slate-50 ${row.isSubtotal ? 'bg-slate-50 font-semibold' : ''}`}
                                                        >
                                                            <td className="py-1.5 text-slate-700 truncate max-w-[100px]">
                                                                {row.isSubtotal ? '' : '•'} {row.tipo.replace(/^\d\.\s*/, '')}
                                                            </td>
                                                            <td className="py-1.5 text-slate-500 truncate max-w-[100px]">{row.macroCategoria}</td>
                                                            <td className={`py-1.5 text-right font-medium ${row.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {formatCurrency(row.valor)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-100 font-bold">
                                                        <td className="py-2 text-slate-800" colSpan={2}>Total</td>
                                                        <td className={`py-2 text-right ${bu.realizadoTotal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                            {formatCurrency(bu.realizadoTotal)}
                                                        </td>
                                                    </tr>
                                                </>
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                                                        Sem dados
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-slate-100"></div>

                            {/* Bottom: Gauge + Chart side by side */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 bg-gradient-to-b from-slate-50/50 to-white">
                                {/* Left: Gauge */}
                                <div className="flex items-center justify-center p-4 border-b lg:border-b-0 lg:border-r border-slate-100">
                                    <BudgetGauge
                                        value={bu.realizadoTotal}
                                        target={bu.meta || Math.abs(bu.orcadoTotal) || 1000000}
                                        label="% da Meta"
                                    />
                                </div>

                                {/* Right: Bar chart */}
                                <div className="p-4">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 bg-[#DCEEAA] rounded-full"></span>
                                            <span className="text-xs text-slate-500">Recebido</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 bg-slate-500 rounded-full"></span>
                                            <span className="text-xs text-slate-500">A Receber</span>
                                        </div>
                                    </div>
                                    <div className="h-[140px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={[{
                                                    name: bu.buName,
                                                    Recebido: bu.recebido,
                                                    'A Receber': bu.aReceber
                                                }]}
                                                margin={{ top: 15, right: 10, left: 0, bottom: 0 }}
                                                barCategoryGap="20%"
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#666', fontSize: 11 }}
                                                />
                                                <YAxis
                                                    tickFormatter={(val) => formatCompact(val)}
                                                    tick={{ fontSize: 9 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={55}
                                                />
                                                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                                <Bar dataKey="Recebido" fill="#DCEEAA" radius={[4, 4, 0, 0]} barSize={50}>
                                                    <LabelList
                                                        dataKey="Recebido"
                                                        position="top"
                                                        formatter={(val: any) => formatCompact(Number(val))}
                                                        style={{ fontSize: 10, fill: '#333', fontWeight: 600 }}
                                                    />
                                                </Bar>
                                                <Bar dataKey="A Receber" fill="#4A5568" radius={[4, 4, 0, 0]} barSize={50}>
                                                    <LabelList
                                                        dataKey="A Receber"
                                                        position="top"
                                                        formatter={(val: any) => formatCompact(Number(val))}
                                                        style={{ fontSize: 10, fill: '#333', fontWeight: 600 }}
                                                    />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </PageContent>
        </PageLayout>
    );
}

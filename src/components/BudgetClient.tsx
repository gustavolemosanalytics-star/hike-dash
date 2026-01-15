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

// Enhanced Gauge component matching the reference image
function BudgetGauge({ value, target, label }: { value: number, target: number, label: string }) {
    const safeValue = isNaN(value) ? 0 : value;
    const safeTarget = isNaN(target) || target === 0 ? 1000000 : target;
    const percentage = Math.min(100, Math.max(-100, (safeValue / safeTarget) * 100));
    const displayPercentage = Math.abs(percentage);

    const radius = 80;
    const strokeWidth = 16;
    const circumference = Math.PI * radius;
    const fillLength = (displayPercentage / 100) * circumference;
    const emptyLength = circumference - fillLength;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(val);

    const formatCompact = (val: number) =>
        new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1, style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="relative flex flex-col items-center justify-center p-6">
            <h4 className="text-base font-semibold text-slate-600 mb-4">{label}</h4>
            <svg width="220" height="120" viewBox="0 0 220 120">
                {/* Background arc */}
                <path
                    d="M 20 110 A 90 90 0 0 1 200 110"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                {/* Filled arc */}
                <motion.path
                    d="M 20 110 A 90 90 0 0 1 200 110"
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
            {/* Value display in center */}
            <div className="text-center -mt-6">
                <div className={`text-2xl font-bold ${safeValue >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                    {formatCurrency(safeValue)}
                </div>
            </div>
            {/* Range labels */}
            <div className="flex justify-between w-full mt-3 px-2">
                <span className="text-xs text-green-500 font-medium">R$ 0</span>
                <span className="text-xs text-slate-400 font-medium">{formatCompact(safeTarget)}</span>
            </div>
        </div>
    );
}

// BU Divider component
function BUDivider({ buName }: { buName: string }) {
    return (
        <div className="relative py-8">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center">
                <span className="bg-gradient-to-r from-slate-700 to-slate-500 text-white px-8 py-2 rounded-full text-lg font-semibold shadow-lg">
                    {buName}
                </span>
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
                        {/* BU Divider */}
                        <BUDivider buName={bu.buName} />

                        {/* Two tables side by side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Left: Orçado Table */}
                            <div className="glass-card rounded-2xl p-5 border border-white/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                        Orçado (Base de dados "Budget")
                                    </h3>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200">
                                            <th className="text-left py-2 text-slate-500 font-medium">Tipo</th>
                                            <th className="text-left py-2 text-slate-500 font-medium">MacroCategoria</th>
                                            <th className="text-right py-2 text-slate-500 font-medium">SUM de Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bu.orcadoRows.length > 0 ? (
                                            <>
                                                {bu.orcadoRows.map((row: any, idx: number) => (
                                                    <tr
                                                        key={idx}
                                                        className={`border-b border-slate-100 ${row.isSubtotal ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50/50'}`}
                                                    >
                                                        <td className="py-2 text-slate-700">
                                                            {row.isSubtotal ? '' : (row.tipo.includes('Receber') ? '⊟' : '⊟')} {row.tipo}
                                                        </td>
                                                        <td className="py-2 text-slate-600">{row.macroCategoria}</td>
                                                        <td className={`py-2 text-right font-medium ${row.valor >= 0 ? 'text-slate-700' : 'text-red-600'}`}>
                                                            {formatCurrency(row.valor)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                                                    <td className="py-3 text-slate-800" colSpan={2}>Total geral</td>
                                                    <td className={`py-3 text-right ${bu.orcadoTotal >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                                                        {formatCurrency(bu.orcadoTotal)}
                                                    </td>
                                                </tr>
                                            </>
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="py-8 text-center text-slate-400">
                                                    Sem dados de orçamento
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Right: Realizado Table */}
                            <div className="glass-card rounded-2xl p-5 border border-white/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-5 bg-green-500 rounded-full"></div>
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                        Realizado (Base de dados "Bdados Tratada")
                                    </h3>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200">
                                            <th className="text-left py-2 text-slate-500 font-medium">Tipo</th>
                                            <th className="text-left py-2 text-slate-500 font-medium">MacroCategoria</th>
                                            <th className="text-right py-2 text-slate-500 font-medium">SUM de Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bu.realizadoRows.length > 0 ? (
                                            <>
                                                {bu.realizadoRows.map((row: any, idx: number) => (
                                                    <tr
                                                        key={idx}
                                                        className={`border-b border-slate-100 ${row.isSubtotal ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50/50'}`}
                                                    >
                                                        <td className="py-2 text-slate-700">
                                                            {row.isSubtotal ? '' : (row.tipo.includes('Receber') ? '⊟' : '⊟')} {row.tipo}
                                                        </td>
                                                        <td className="py-2 text-slate-600">{row.macroCategoria}</td>
                                                        <td className={`py-2 text-right font-medium ${row.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {formatCurrency(row.valor)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                                                    <td className="py-3 text-slate-800" colSpan={2}>Total geral</td>
                                                    <td className={`py-3 text-right ${bu.realizadoTotal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                        {formatCurrency(bu.realizadoTotal)}
                                                    </td>
                                                </tr>
                                            </>
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="py-8 text-center text-slate-400">
                                                    Sem dados realizados
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Gauge and Chart for this specific BU */}
                        <div className="glass-card rounded-2xl p-6 border border-white/40 mb-10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left: Gauge for this BU */}
                                <div className="flex items-center justify-center">
                                    <BudgetGauge
                                        value={bu.realizadoTotal}
                                        target={bu.meta || Math.abs(bu.orcadoTotal) || 1000000}
                                        label="% da Meta"
                                    />
                                </div>

                                {/* Right: Bar chart - Recebido vs A Receber for this BU */}
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-600 mb-4 flex items-center gap-2">
                                        <span className="w-3 h-3 bg-[#DCEEAA] rounded-full"></span>
                                        Recebido
                                        <span className="w-3 h-3 bg-slate-500 rounded-full ml-4"></span>
                                        A Receber
                                    </h4>
                                    <div className="h-[180px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={[{
                                                    name: bu.buName,
                                                    Recebido: bu.recebido,
                                                    'A Receber': bu.aReceber
                                                }]}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                                barCategoryGap="30%"
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                <XAxis
                                                    dataKey="name"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: '#666', fontSize: 12 }}
                                                />
                                                <YAxis
                                                    tickFormatter={(val) => formatCompact(val)}
                                                    tick={{ fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={70}
                                                />
                                                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                                <Bar dataKey="Recebido" fill="#DCEEAA" radius={[4, 4, 0, 0]} barSize={60}>
                                                    <LabelList
                                                        dataKey="Recebido"
                                                        position="top"
                                                        formatter={(val: any) => formatCompact(Number(val))}
                                                        style={{ fontSize: 11, fill: '#333', fontWeight: 600 }}
                                                    />
                                                </Bar>
                                                <Bar dataKey="A Receber" fill="#4A5568" radius={[4, 4, 0, 0]} barSize={60}>
                                                    <LabelList
                                                        dataKey="A Receber"
                                                        position="top"
                                                        formatter={(val: any) => formatCompact(Number(val))}
                                                        style={{ fontSize: 11, fill: '#333', fontWeight: 600 }}
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

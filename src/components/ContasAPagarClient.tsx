"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, LineChart, Line, LabelList, Cell
} from "recharts";
import { format, parseISO, getQuarter, getYear, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, Calendar, Filter } from 'lucide-react';
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { KPICard } from "@/components/ui/KPICard";
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { generateInsights } from "@/lib/insight-engine";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { PageLayout, PageHeader, PageContent } from "@/components/ui/PageLayout";
import { useFilters } from "@/lib/filter-context";

interface ContasAPagarProps {
    transactions: Transaction[];
}

export function ContasAPagarClient({ transactions }: ContasAPagarProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [selectedProject, setSelectedProject] = useState<string>("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const [page, setPage] = useState(0);
    const rowsPerPage = 10;

    const filtered = useMemo(() => {
        return transactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;
            if (selectedProject !== "All" && t.project !== selectedProject) return false;

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
    }, [transactions, selectedBU, selectedProject, dateRange]);

    const aggregated = useMemo(() => {
        let despesaTotal = 0;
        let pago = 0;
        let aPagar = 0;

        filtered.forEach(t => {
            if (t.type !== '2. Contas a Pagar') return;
            despesaTotal += Math.abs(t.amount);
            if (t.paidAmount < 0) pago += Math.abs(t.paidAmount);
            else if (t.paidAmount > 0) pago += t.paidAmount;

            if (t.pendingAmount > 0) aPagar += t.pendingAmount;
            else if (t.pendingAmount < 0) aPagar += Math.abs(t.pendingAmount);
        });

        return { despesaTotal, pago, aPagar };
    }, [filtered]);

    const byBU = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            if (t.type !== '2. Contas a Pagar') return;
            const bu = t.bu || "Outros";
            if (!map.has(bu)) map.set(bu, { name: bu, pago: 0, aPagar: 0 });
            const entry = map.get(bu);
            entry.pago += Math.abs(t.paidAmount);
            if (t.pendingAmount !== 0) entry.aPagar += Math.abs(t.pendingAmount);
        });
        return Array.from(map.values()).sort((a: any, b: any) => b.pago - a.pago);
    }, [filtered]);

    const byQuarter = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            if (t.type !== '2. Contas a Pagar') return;
            if (!t.date) return;
            try {
                const d = parseISO(t.date);
                const q = getQuarter(d);
                const y = getYear(d);
                const key = `T${q}, ${y}`;
                const sortKey = `${y}-${q}`;

                if (!map.has(key)) map.set(key, { name: key, pago: 0, aPagar: 0, sortKey });
                const entry = map.get(key);
                entry.pago += Math.abs(t.paidAmount);
                if (t.pendingAmount !== 0) entry.aPagar += Math.abs(t.pendingAmount);
            } catch (e) { }
        });
        return Array.from(map.values()).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));
    }, [filtered]);

    // Valor por Data e MacroCategoria (stacked bar chart)
    const byMacroQuarter = useMemo(() => {
        const quarterMap = new Map();
        const macroSet = new Set<string>();

        filtered.forEach(t => {
            if (t.type !== '2. Contas a Pagar') return;
            if (!t.date) return;
            try {
                const d = parseISO(t.date);
                const q = getQuarter(d);
                const y = getYear(d);
                const quarterKey = `T${q}, ${y}`;
                const sortKey = `${y}-${q}`;
                // Use MacroCategory instead of Category (too granular)
                const macro = t.macroCategory || "Outros";

                macroSet.add(macro);

                if (!quarterMap.has(quarterKey)) {
                    quarterMap.set(quarterKey, { name: quarterKey, sortKey });
                }
                const entry = quarterMap.get(quarterKey);
                if (!entry[macro]) entry[macro] = 0;
                entry[macro] += Math.abs(t.amount);
            } catch (e) { }
        });

        const sorted = Array.from(quarterMap.values()).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));
        return { data: sorted, macros: Array.from(macroSet).sort() };
    }, [filtered]);

    // Color palette for macro categories (despesas)
    const macroColors: Record<string, string> = {
        "Empréstimos": "#F5A623",
        "Pessoas (Terceiros)": "#4A4A4A",
        "Despesas SG&A": "#E91E63",
        "Board": "#9B59B6",
        "Pessoas": "#5D6D7E",
        "Impostos e Taxas": "#95A5A6",
        "Custos da Operação": "#DCEEAA",
        "Outros": "#BDC3C7",
    };

    const getMacroColor = (macro: string, index: number) => {
        if (macroColors[macro]) return macroColors[macro];
        const fallbackColors = ["#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"];
        return fallbackColors[index % fallbackColors.length];
    };

    const trendData = useMemo(() => {
        const map = new Map();
        const buSet = new Set<string>();

        filtered.forEach(t => {
            if (t.type !== '2. Contas a Pagar') return;
            if (!t.date) return;

            const monthKey = t.date.substring(0, 7);
            if (!map.has(monthKey)) map.set(monthKey, { name: monthKey });

            const entry = map.get(monthKey);
            const bu = t.bu || "Outros";
            buSet.add(bu);

            if (!entry[bu]) entry[bu] = 0;
            entry[bu] += Math.abs(t.amount);
        });

        const sorted = Array.from(map.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
        return sorted.map((item: any) => {
            try {
                const d = parseISO(item.name + '-01');
                return {
                    ...item,
                    formattedName: format(d, 'MMM/yy')
                };
            } catch {
                return { ...item, formattedName: item.name };
            }
        });
    }, [filtered]);

    const suppliersData = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            if (t.type !== '2. Contas a Pagar') return;
            const supplier = t.client || "Não Identificado";
            if (!map.has(supplier)) map.set(supplier, { name: supplier, pago: 0, aPagar: 0 });
            const entry = map.get(supplier);
            entry.pago += Math.abs(t.paidAmount);
            if (t.pendingAmount !== 0) entry.aPagar += Math.abs(t.pendingAmount);
        });
        return Array.from(map.values()).sort((a: any, b: any) => b.pago - a.pago);
    }, [filtered]);

    const insights = useMemo(() => {
        const topSupplier = suppliersData.length > 0 ? { name: suppliersData[0].name, value: suppliersData[0].pago + suppliersData[0].aPagar } : undefined;
        const topBU = byBU.length > 0 ? { name: byBU[0].name, value: byBU[0].pago + byBU[0].aPagar } : undefined;

        return generateInsights(
            { pago: aggregated.pago, aPagar: aggregated.aPagar },
            byBU,
            {
                type: 'payable',
                topClients: topSupplier ? [topSupplier] : [],
                topBUs: topBU ? [topBU] : []
            }
        );
    }, [aggregated, byBU, suppliersData]);

    // Removed allBUs and allProjects as they are not needed in this component anymore (Sidebar handles it) but they might be passed to sidebar if we lifted state, but here we just consume context. The Sidebar needs the OPTIONS. We'll deal with Sidebar options later.

    // NOTE: In a real app, Sidebar should fetch options or we should have a global data context.
    // For now, I'll assume the Sidebar has access to data or specific logic.
    // IF Sidebar is in Layout, `children` is page.

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const formatCompact = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact", maximumFractionDigits: 1 }).format(val);

    function getColor(index: number) {
        const colors = ["#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899", "#6366F1"];
        return colors[index % colors.length];
    }

    const allBUs = useMemo(() => Array.from(new Set(transactions.map(t => t.bu || "N/D"))).sort(), [transactions]);
    const allProjects = useMemo(() => Array.from(new Set(transactions.map(t => t.project || "N/D"))).sort(), [transactions]);

    return (
        <PageLayout>
            <PageHeader
                title="Contas a Pagar"
                subtitle="Controle de obrigações e pagamentos"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <FilterDropdown label="Projeto" value={selectedProject} onChange={setSelectedProject} options={allProjects} />
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard title="Despesas (Total)" value={aggregated.despesaTotal} color="bg-[#E4E4E7]" textColor="text-foreground" />
                    <KPICard title="Pago" value={aggregated.pago} color="bg-[#5F6368]" textColor="text-white" />
                    <KPICard title="A Pagar" value={aggregated.aPagar} color="bg-[#E2E0D4]" textColor="text-[#5F6368]" />
                </div>

                {/* Row 1: Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Por BU */}
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <div className="w-1 h-5 bg-[#DCEEAA] rounded-full"></div>
                            Pago vs A Pagar (BU)
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byBU} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <Legend />
                                    <Bar dataKey="pago" name="Pago" fill="#5F6368" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="pago" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                                    </Bar>
                                    <Bar dataKey="aPagar" name="A Pagar" fill="#DCEEAA" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="aPagar" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#3A4A1C', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Por Quarter */}
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <div className="w-1 h-5 bg-[#5F6368] rounded-full"></div>
                            Por Quarter
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byQuarter} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                    <Legend />
                                    <Bar dataKey="pago" name="Pago" fill="#5F6368" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="pago" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                                    </Bar>
                                    <Bar dataKey="aPagar" name="A Pagar" fill="#DCEEAA" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="aPagar" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#3A4A1C', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Valor por Data e MacroCategoria */}
                <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <div className="w-1 h-5 bg-[#E91E63] rounded-full"></div>
                        Valor por Data e MacroCategoria
                    </h3>
                    <div className="h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byMacroQuarter.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                {/* Tooltip disabled as requested */}
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                {byMacroQuarter.macros.map((macro, idx) => (
                                    <Bar
                                        key={macro}
                                        dataKey={macro}
                                        name={macro}
                                        stackId="macro"
                                        fill={getMacroColor(macro, idx)}
                                    >
                                        <LabelList
                                            dataKey={macro}
                                            position="inside"
                                            formatter={(val: any) => val > 50000 ? formatCompact(Number(val)) : ''}
                                            style={{ fontSize: 8, fill: '#fff', fontWeight: 500 }}
                                        />
                                    </Bar>
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Row 2: Trend & Suppliers (Clients) List */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Trend Chart */}
                    <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6">Valor ao longo do tempo por BU</h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="formattedName" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                    <Legend />
                                    {Array.from(new Set(transactions.map(t => t.bu || "Default"))).map((bu, idx) => (
                                        <Line
                                            key={bu}
                                            type="monotone"
                                            dataKey={bu}
                                            name={bu}
                                            stroke={getColor(idx)}
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Suppliers List */}
                    <div className="glass-card rounded-2xl border border-white/40 flex flex-col overflow-hidden h-[478px]">
                        <div className="px-6 py-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-white">
                            <h3 className="text-lg font-semibold text-slate-800">Fornecedores</h3>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <table className="w-full">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-left">Fornecedor</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Pago</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">A Pagar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {suppliersData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((supplier: any, i) => (
                                        <tr key={i} className="group transition-all duration-200 hover:bg-gradient-to-r hover:from-[#DCEEAA]/10 hover:to-transparent">
                                            <td className="px-6 py-3 font-medium text-sm text-slate-700 max-w-[150px] truncate" title={supplier.name}>{supplier.name}</td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">{formatCurrency(supplier.pago)}</td>
                                            <td className="px-4 py-3 text-right text-sm text-slate-500">{formatCurrency(supplier.aPagar)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-2 border-t border-slate-200/50 bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Pg {page + 1}</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                                <button onClick={() => setPage(page + 1)} disabled={(page + 1) * rowsPerPage >= suppliersData.length} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <AnalysisBoard insights={insights} />
            </PageContent>
        </PageLayout>
    );
}

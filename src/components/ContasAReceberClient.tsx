"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, LineChart, Line, LabelList, Cell
} from "recharts";
import { format, parseISO, getQuarter, getYear, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
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

interface ContasAReceberProps {
    transactions: Transaction[];
}

export function ContasAReceberClient({ transactions }: ContasAReceberProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [selectedProject, setSelectedProject] = useState<string>("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const [page, setPage] = useState(0);
    const rowsPerPage = 10;

    // Optimization: Pre-process transactions to parse dates once
    const processedTransactions = useMemo(() => {
        return transactions.map(t => {
            let parsedDate: Date | null = null;
            if (t.date) {
                try {
                    parsedDate = parseISO(t.date);
                } catch (e) {
                    // invalid date
                }
            }
            return { ...t, parsedDate };
        });
    }, [transactions]);

    const filtered = useMemo(() => {
        const fromDate = dateRange?.from ? startOfDay(dateRange.from) : null;
        const toDate = dateRange?.to ? endOfDay(dateRange.to) : (fromDate ? endOfDay(fromDate) : null);

        return processedTransactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;
            // Additional filtering if needed, e.g. Project
            if (selectedProject !== "All" && t.project !== selectedProject) return false;

            if (fromDate && t.parsedDate) {
                if (toDate) {
                    if (t.parsedDate < fromDate || t.parsedDate > toDate) return false;
                } else {
                    if (t.parsedDate < fromDate) return false;
                }
            } else if (fromDate && !t.parsedDate) {
                return false;
            }
            return true;
        });
    }, [processedTransactions, selectedBU, selectedProject, dateRange]);

    const aggregated = useMemo(() => {
        let receTotal = 0;
        let recebido = 0;
        let aReceber = 0;

        filtered.forEach(t => {
            if (t.type !== '1. Contas a Receber') return;
            receTotal += Math.abs(t.amount); // Use absolute for safety, though Receita should be positive
            if (t.paidAmount < 0) recebido += Math.abs(t.paidAmount);
            else if (t.paidAmount > 0) recebido += t.paidAmount;

            if (t.pendingAmount > 0) aReceber += t.pendingAmount;
            else if (t.pendingAmount < 0) aReceber += Math.abs(t.pendingAmount);
        });

        return { receTotal, recebido, aReceber };
    }, [filtered]);

    const byBU = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            if (t.type !== '1. Contas a Receber') return;
            const bu = t.bu || "Outros";
            if (!map.has(bu)) map.set(bu, { name: bu, recebido: 0, aReceber: 0 });
            const entry = map.get(bu);
            entry.recebido += Math.abs(t.paidAmount);
            if (t.pendingAmount !== 0) entry.aReceber += Math.abs(t.pendingAmount);
        });
        return Array.from(map.values()).sort((a: any, b: any) => b.recebido - a.recebido);
    }, [filtered]);

    const byQuarter = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            if (t.type !== '1. Contas a Receber') return;
            // Use pre-parsed date if available
            if (!t.parsedDate) return;

            try {
                const d = t.parsedDate;
                const q = getQuarter(d);
                const y = getYear(d);
                const key = `T${q}, ${y}`;
                const sortKey = `${y}-${q}`;

                if (!map.has(key)) map.set(key, { name: key, recebido: 0, aReceber: 0, sortKey });
                const entry = map.get(key);
                entry.recebido += Math.abs(t.paidAmount);
                if (t.pendingAmount !== 0) entry.aReceber += Math.abs(t.pendingAmount);
            } catch (e) { }
        });
        return Array.from(map.values()).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));
    }, [filtered]);

    // Perfil das Receitas por Quarter (grouped by MacroCategory)
    const byMacroQuarter = useMemo(() => {
        const quarterMap = new Map();
        const macroSet = new Set<string>();

        filtered.forEach(t => {
            if (t.type !== '1. Contas a Receber') return;
            if (!t.parsedDate) return;
            try {
                const d = t.parsedDate;
                const q = getQuarter(d);
                const y = getYear(d);
                const quarterKey = `T${q}, ${y}`;
                const sortKey = `${y}-${q}`;
                const macro = t.category || "Outros"; // Changed from macroCategory to category

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
        // Sort macros by value (descending) across the entire filtered set to determine stack order/legend order consistently or per bar?
        // The user wants "ordenado por valor decrecente".
        // Since it's a stacked bar chart over time (quarters), sorting quarters (X-axis) by value is weird.
        // Assuming they mean the segments within the stack should be ordered by size.
        // Recharts stacks are ordered by the definition order of <Bar /> components.
        // So we need to sort `macros` array based on total value.
        const macroSummaries = Array.from(macroSet).map(m => ({
            name: m,
            total: Array.from(quarterMap.values()).reduce((acc: number, q: any) => acc + (q[m] || 0), 0)
        })).sort((a, b) => b.total - a.total); // Descending total value

        return { data: sorted, macros: macroSummaries.map(m => m.name) };
    }, [filtered]);

    // Color palette for macro categories
    const macroColors: Record<string, string> = {
        "Receitas de Tailor Made": "#E8E8E8",
        "Receitas de Ativações de Marca e Digital": "#4A4A4A",
        "Receitas de Licenciamento": "#9B59B6",
        "Receitas de Eventos": "#3498DB",
        "Receitas de Patrocínios": "#E91E63",
        "Outros": "#95A5A6",
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
            if (t.type !== '1. Contas a Receber') return;
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

    const clientsData = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            if (t.type !== '1. Contas a Receber') return;
            const client = t.client || "Não Identificado";
            if (!map.has(client)) map.set(client, { name: client, recebido: 0, aReceber: 0 });
            const entry = map.get(client);
            entry.recebido += Math.abs(t.paidAmount);
            if (t.pendingAmount !== 0) entry.aReceber += Math.abs(t.pendingAmount);
        });
        return Array.from(map.values()).sort((a: any, b: any) => b.recebido - a.recebido);
    }, [filtered]);

    const insights = useMemo(() => {
        const topClient = clientsData.length > 0 ? { name: clientsData[0].name, value: clientsData[0].recebido + clientsData[0].aReceber } : undefined;
        const topBU = byBU.length > 0 ? { name: byBU[0].name, value: byBU[0].recebido + byBU[0].aReceber } : undefined;

        return generateInsights(
            { recebido: aggregated.recebido, aReceber: aggregated.aReceber },
            byBU,
            {
                type: 'receivable',
                topClients: topClient ? [topClient] : [],
                topBUs: topBU ? [topBU] : []
            }
        );
    }, [aggregated, byBU, clientsData]);


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
                title="Contas a Receber"
                subtitle="Gestão de entradas e previsões"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <FilterDropdown label="Projeto" value={selectedProject} onChange={setSelectedProject} options={allProjects} />
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard title="Receita (Total)" value={aggregated.receTotal} color="bg-[#E4E4E7]" textColor="text-foreground" />
                    <KPICard title="Recebido" value={aggregated.recebido} color="bg-[#DCEEAA]" textColor="text-[#3A4A1C]" />
                    <KPICard title="A Receber" value={aggregated.aReceber} color="bg-[#E2E0D4]" textColor="text-[#5F6368]" />
                </div>

                {/* Row 1: Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Por BU */}
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <div className="w-1 h-5 bg-[#9AB85A] rounded-full"></div>
                            Recebido vs A Receber (BU)
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byBU} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                    <Tooltip
                                        content={({ active, payload, label }: any) => {
                                            if (active && payload && payload.length) {
                                                const sortedPayload = [...payload].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
                                                return (
                                                    <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
                                                        <p className="text-sm font-semibold mb-2">{label}</p>
                                                        {sortedPayload.map((entry: any, index: number) => (
                                                            <div key={index} className="flex items-center gap-2 text-xs mb-1">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                <span className="font-medium text-slate-600">{entry.name}:</span>
                                                                <span className="font-bold" style={{ color: entry.name === 'Recebido' ? '#2D5016' : '#333' }}>
                                                                    {formatCurrency(Number(entry.value))}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="recebido" name="Recebido" fill="#9AB85A" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="recebido" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#2D5016', fontWeight: 600 }} />
                                    </Bar>
                                    <Bar dataKey="aReceber" name="A Receber" fill="#5F6368" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="aReceber" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
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
                                    <Tooltip
                                        content={({ active, payload, label }: any) => {
                                            if (active && payload && payload.length) {
                                                const sortedPayload = [...payload].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
                                                return (
                                                    <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
                                                        <p className="text-sm font-semibold mb-2">{label}</p>
                                                        {sortedPayload.map((entry: any, index: number) => (
                                                            <div key={index} className="flex items-center gap-2 text-xs mb-1">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                                <span className="font-medium text-slate-600">{entry.name}:</span>
                                                                <span className="font-bold" style={{ color: entry.name === 'Recebido' ? '#2D5016' : '#333' }}>
                                                                    {formatCurrency(Number(entry.value))}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="recebido" name="Recebido" fill="#9AB85A" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="recebido" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#2D5016', fontWeight: 600 }} />
                                    </Bar>
                                    <Bar dataKey="aReceber" name="A Receber" fill="#5F6368" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="aReceber" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Perfil das Receitas por Quarter */}
                <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <div className="w-1 h-5 bg-[#8B5CF6] rounded-full"></div>
                        Perfil das Receitas por Quarter
                    </h3>
                    <div className="h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byMacroQuarter.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                <Tooltip
                                    content={({ active, payload, label }: any) => {
                                        if (active && payload && payload.length) {
                                            // Filter out zero values and sort by value descending
                                            const filteredPayload = payload
                                                .filter((entry: any) => entry.value > 0)
                                                .sort((a: any, b: any) => b.value - a.value);

                                            const total = filteredPayload.reduce((sum: number, entry: any) => sum + entry.value, 0);

                                            return (
                                                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg max-w-xs">
                                                    <p className="text-sm font-semibold mb-2 border-b pb-1">{label}</p>
                                                    <p className="text-xs font-bold text-slate-700 mb-2">Total: {formatCurrency(total)}</p>
                                                    <div className="max-h-[200px] overflow-y-auto">
                                                        {filteredPayload.slice(0, 8).map((entry: any, index: number) => (
                                                            <div key={index} className="flex items-center gap-2 text-xs mb-1">
                                                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                                                <span className="font-medium text-slate-600 truncate flex-1" title={entry.name}>
                                                                    {entry.name.length > 25 ? entry.name.substring(0, 25) + '...' : entry.name}
                                                                </span>
                                                                <span className="font-bold text-slate-800 flex-shrink-0">
                                                                    {formatCompact(Number(entry.value))}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {filteredPayload.length > 8 && (
                                                            <p className="text-xs text-slate-400 mt-1">+{filteredPayload.length - 8} mais...</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{ fontSize: '9px', maxHeight: '80px', overflowY: 'auto' }}
                                    formatter={(value: string) => value.length > 20 ? value.substring(0, 20) + '...' : value}
                                />
                                {byMacroQuarter.macros.map((macro, idx) => (
                                    <Bar
                                        key={macro}
                                        dataKey={macro}
                                        name={macro}
                                        stackId="receitas"
                                        fill={getMacroColor(macro, idx)}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Row 2: Trend & Clients List */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Trend Chart */}
                    <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6">Receita ao longo do tempo por BU</h3>
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

                    {/* Clients List */}
                    <div className="glass-card rounded-2xl p-0 border border-white/40 flex flex-col overflow-hidden h-[400px]">
                        <div className="p-5 border-b border-black/5 bg-white/30">
                            <h3 className="font-semibold text-lg">Clientes</h3>
                        </div>
                        <div className="flex-1 overflow-auto bg-white/20">
                            <table className="w-full text-sm">
                                <thead className="bg-black/5 text-xs uppercase font-semibold text-secondary-foreground sticky top-0 backdrop-blur-md">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Cliente</th>
                                        <th className="px-4 py-3 text-right">Recebido</th>
                                        <th className="px-4 py-3 text-right">A Receber</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {clientsData.slice(page * 8, (page + 1) * 8).map((client: any, i) => (
                                        <tr key={i} className="hover:bg-white/40 transition-colors">
                                            <td className="px-4 py-3 font-medium text-xs max-w-[120px] truncate" title={client.name}>{client.name}</td>
                                            <td className="px-4 py-3 text-right text-xs font-semibold text-green-600 bg-green-50/50">{formatCurrency(client.recebido)}</td>
                                            <td className="px-4 py-3 text-right text-xs font-semibold text-amber-600 bg-amber-50/50">{formatCurrency(client.aReceber)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 flex justify-between items-center border-t border-black/5 bg-white/30">
                            <span className="text-xs text-secondary-foreground">Pg {page + 1}</span>
                            <div className="flex gap-1">
                                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1 hover:bg-black/5 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setPage(page + 1)} disabled={(page + 1) * 8 >= clientsData.length} className="p-1 hover:bg-black/5 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <AnalysisBoard insights={insights} />
            </PageContent>
        </PageLayout>
    );
}

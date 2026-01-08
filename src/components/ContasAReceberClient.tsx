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
    const {
        selectedBU,
        selectedProject,
        dateRange
    } = useFilters();

    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        return transactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;
            // Additional filtering if needed, e.g. Project
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
            if (!t.date) return;
            try {
                const d = parseISO(t.date);
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

    return (
        <PageLayout>
            <PageHeader
                title="Contas a Receber"
                subtitle="Gestão de entradas e previsões"
            />

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
                            <div className="w-1 h-5 bg-[#DCEEAA] rounded-full"></div>
                            Recebido vs A Receber (BU)
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byBU} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <Legend />
                                    <Bar dataKey="recebido" name="Recebido" fill="#DCEEAA" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="recebido" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#3A4A1C', fontWeight: 600 }} />
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
                                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                    <Legend />
                                    <Bar dataKey="recebido" name="Recebido" fill="#DCEEAA" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="recebido" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#3A4A1C', fontWeight: 600 }} />
                                    </Bar>
                                    <Bar dataKey="aReceber" name="A Receber" fill="#5F6368" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="aReceber" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
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
                                            <td className="px-4 py-3 text-right text-xs">{formatCurrency(client.recebido)}</td>
                                            <td className="px-4 py-3 text-right text-xs text-secondary-foreground/70">{formatCurrency(client.aReceber)}</td>
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

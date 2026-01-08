"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, Cell, LabelList, ReferenceLine
} from "recharts";
import { ChevronRight, ChevronLeft, Calendar, Filter } from 'lucide-react';
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { generateInsights } from "@/lib/insight-engine";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { PageLayout, PageContent, PageHeader } from "@/components/ui/PageLayout";

interface GrupoProps {
    transactions: Transaction[];
}

export function GrupoClient({ transactions }: GrupoProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [selectedType, setSelectedType] = useState<string>("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        return transactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;
            if (selectedType !== "All" && t.type !== selectedType) return false;
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
    }, [transactions, selectedBU, selectedType, dateRange]);

    const groupData = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            const grp = t.group || "N/D";
            if (!map.has(grp)) map.set(grp, { name: grp, value: 0 });
            map.get(grp).value += t.amount;
        });

        const arr = Array.from(map.values());
        const totalVolume = arr.reduce((acc, item) => acc + Math.abs(item.value), 0);

        return arr.map((item: any) => ({
            ...item,
            percent: totalVolume ? (item.value / totalVolume) * 100 : 0
        })).sort((a: any, b: any) => b.value - a.value);
    }, [filtered]);

    const timelineData = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            if (!t.date) return;
            const monthKey = t.date.substring(0, 7);
            if (!map.has(monthKey)) map.set(monthKey, { name: monthKey });

            const entry = map.get(monthKey);
            const grp = t.group || "N/D";

            if (!entry[grp]) entry[grp] = 0;
            entry[grp] += t.amount;
        });

        const sorted = Array.from(map.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
        return sorted.map((item: any) => {
            // Clean Name
            try {
                const d = parseISO(item.name + '-01');
                return { ...item, formattedName: format(d, 'MMM/yy') };
            } catch {
                return { ...item, formattedName: item.name };
            }
        });
    }, [filtered]);

    const allBUs = useMemo(() => Array.from(new Set(transactions.map(t => t.bu || "N/D"))).sort(), [transactions]);
    const allTypes = useMemo(() => Array.from(new Set(transactions.map(t => t.type || "N/D"))).sort(), [transactions]);

    const insights = useMemo(() => {
        return [{
            id: 'group-info',
            type: 'info' as const,
            title: 'Distribuição por Grupo',
            description: 'Visão consolidada de Fixos e Variáveis no período.'
        }];
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    return (
        <PageLayout>
            <PageHeader
                title="Grupo"
                subtitle="Análise de custos fixos e variáveis"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <FilterDropdown label="Tipo" value={selectedType} onChange={setSelectedType} options={allTypes} />
                <div className="h-8 w-[1px] bg-black/5 mx-1 hidden md:block"></div>
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* Row 1: Horizontal Chart & Table */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Chart */}
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            Valor da Conta por Grupo
                            <div className="ml-auto flex items-center gap-4 text-xs font-normal">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#DCEEAA]"></div>Valor da Conta</div>
                            </div>
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={groupData} margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <ReferenceLine x={0} stroke="#000" strokeOpacity={0.1} />
                                    <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                        {groupData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#DCEEAA" : "#E4E4E7"} />
                                        ))}
                                        <LabelList dataKey="value" position="right" formatter={(val: any) => formatCurrency(Number(val) || 0)} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card rounded-2xl p-0 border border-white/40 flex flex-col overflow-hidden h-[400px]">
                        <div className="p-5 border-b border-black/5 bg-white/30">
                            <h3 className="font-semibold text-lg">Tabela por Grupo</h3>
                        </div>
                        <div className="flex-1 overflow-auto bg-white/20">
                            <table className="w-full text-sm">
                                <thead className="bg-black/5 text-xs uppercase font-semibold text-secondary-foreground sticky top-0 backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Grupo</th>
                                        <th className="px-6 py-3 text-right">Valor da Conta</th>
                                        <th className="px-6 py-3 text-right">% do total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {groupData.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/40 transition-colors">
                                            <td className="px-6 py-4 font-medium text-xs">{row.name}</td>
                                            <td className={`px-6 py-4 text-right font-medium text-xs ${row.value < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(row.value)}</td>
                                            <td className="px-6 py-4 text-right text-xs text-secondary-foreground">{row.percent.toFixed(2)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Row 2: Timeline */}
                <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        Valor da Conta por Data (Ano e mês) e Grupo
                        <div className="ml-4 flex gap-4 text-xs font-normal text-secondary-foreground">
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#1B5E20]"></div>Variável</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#E6EE9C]"></div>Fixo</div>
                        </div>
                    </h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="formattedName" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                <Legend />
                                <Bar dataKey="Variável" fill="#1B5E20" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Variável" position="top" formatter={(val: any) => formatCurrency(Number(val) || 0)} style={{ fontSize: 9, fill: '#333' }} />
                                </Bar>
                                <Bar dataKey="Fixo" fill="#E6EE9C" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Fixo" position="bottom" formatter={(val: any) => formatCurrency(Number(val) || 0)} style={{ fontSize: 9, fill: '#333' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <AnalysisBoard insights={insights} />
            </PageContent>
        </PageLayout >
    );
}

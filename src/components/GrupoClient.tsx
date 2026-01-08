"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, Cell, LabelList
} from "recharts";
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { PageLayout, PageContent, PageHeader } from "@/components/ui/PageLayout";
import { DateRange } from "react-day-picker";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

interface GrupoProps {
    transactions: Transaction[];
}

export function GrupoClient({ transactions }: GrupoProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [selectedType, setSelectedType] = useState<string>("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Pagination
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

    const colors = ["#2E7D32", "#E6EE9C", "#616161", "#F48FB1", "#81C784", "#FFD54F", "#90CAF9"];

    const allBUs = useMemo(() => Array.from(new Set(transactions.map(t => t.bu || "N/D"))).sort(), [transactions]);
    const allTypes = ["1. Contas a Receber", "2. Contas a Pagar"];

    return (
        <PageLayout>
            <PageHeader
                title="Visão por Grupo"
                subtitle="Análise estratégica de agrupamentos"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <FilterDropdown label="Tipo" value={selectedType} onChange={setSelectedType} options={allTypes} />
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* Row 1: Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 text-gray-800">Volume por Grupo</h3>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={groupData} layout="vertical" margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(val: number | undefined) => formatCurrency(val || 0)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                                        {groupData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        ))}
                                        <LabelList dataKey="value" position="right" formatter={(val: any) => formatCurrency(Number(val) || 0)} style={{ fontSize: '11px', fill: '#666' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 text-gray-800">Evolução Mensal</h3>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={timelineData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="formattedName" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => new Intl.NumberFormat('en', { notation: 'compact' }).format(val)} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                    <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} />
                                    <Legend />
                                    <Bar dataKey="value" fill="#DCEEAA" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <AnalysisBoard insights={insights} />
                </div>
            </PageContent>
        </PageLayout>
    );
}

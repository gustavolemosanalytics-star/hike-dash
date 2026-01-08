"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, LineChart, Line, LabelList, ReferenceLine
} from "recharts";
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { parseISO, isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';
import { PageLayout, PageContent, PageHeader } from "@/components/ui/PageLayout";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

interface PessoasProps {
    transactions: Transaction[];
}

export function PessoasClient({ transactions }: PessoasProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [selectedMacro, setSelectedMacro] = useState<string>("All");
    const [dateRange, setDateRange] = useState<any>(); // Type fix pending real DateRange import

    // Filter Data
    const filtered = useMemo(() => {
        return transactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;
            if (selectedMacro !== "All" && t.macroCategory !== selectedMacro) return false;

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
    }, [transactions, selectedBU, selectedMacro, dateRange]);

    // Data Aggregation logic (same as before)
    const buCategoryData = useMemo(() => {
        const buMap = new Map();
        const allCats = new Set<string>();

        filtered.forEach(t => {
            const bu = t.bu || "N/D";
            const cat = t.macroCategory || "Outros";
            allCats.add(cat);

            if (!buMap.has(bu)) buMap.set(bu, { name: bu, total: 0 });
            const entry = buMap.get(bu);

            if (!entry[cat]) entry[cat] = 0;
            entry[cat] += t.amount;
            entry.total += t.amount;
        });

        const data = Array.from(buMap.values());
        return { data, categories: Array.from(allCats).sort() };
    }, [filtered]);

    const peopleCountData = useMemo(() => {
        const map = new Map();
        const buSet = new Set<string>();

        filtered.forEach(t => {
            if (!t.date) return;
            const monthKey = t.date.substring(0, 7);
            if (!map.has(monthKey)) map.set(monthKey, { name: monthKey, counts: {} });

            const entry = map.get(monthKey);
            const bu = t.bu || "N/D";
            buSet.add(bu);

            if (!entry.counts[bu]) entry.counts[bu] = new Set();
            if (t.docId) entry.counts[bu].add(t.docId);
        });

        const sorted = Array.from(map.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));

        return sorted.map((item: any) => {
            const row: any = { formattedName: item.name };
            try {
                const d = parseISO(item.name + '-01');
                row.formattedName = format(d, 'MMM/yy');
            } catch { }

            buSet.forEach(bu => {
                row[bu] = item.counts[bu] ? item.counts[bu].size : 0;
            });
            return row;
        });
    }, [filtered]);

    const allBUs = useMemo(() => Array.from(new Set(transactions.map(t => t.bu || "N/D"))).sort(), [transactions]);
    const allMacros = useMemo(() => Array.from(new Set(transactions.map(t => t.macroCategory || "N/D"))).sort(), [transactions]);

    const insights = useMemo(() => {
        return [{
            id: 'people-trend',
            type: 'info' as const,
            title: 'Análise de Pessoas',
            description: 'Acompanhamento de custos e headcount por BU.'
        }];
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact", maximumFractionDigits: 1 }).format(val);

    const customColors = ["#E4E4E7", "#06B6D4", "#EAB308", "#F472B6", "#6366F1"];

    return (
        <PageLayout>
            <PageHeader
                title="Pessoas"
                subtitle="Gestão de Headcount e Custos de Pessoal"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <FilterDropdown label="Categoria" value={selectedMacro} onChange={setSelectedMacro} options={allMacros} />
                <div className="h-8 w-[1px] bg-black/5 mx-1 hidden md:block"></div>
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* Chart 1: Valor por BU e Categoria */}
                <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 text-center">Valor por BU e Categoria</h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={buCategoryData.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                <ReferenceLine y={0} stroke="#000" strokeOpacity={0.1} />
                                {buCategoryData.categories.map((cat, idx) => (
                                    <Bar key={cat} dataKey={cat} fill={customColors[idx % customColors.length]} radius={[2, 2, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: CNPJ/CPF Over Time */}
                <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 text-center">CNPJ/CPF ao longo do tempo por BU</h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={peopleCountData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="formattedName" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                {allBUs.map((bu, idx) => (
                                    <Line
                                        key={bu}
                                        type="monotone"
                                        dataKey={bu}
                                        name={bu}
                                        stroke={customColors[idx % customColors.length]}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                    >
                                        <LabelList dataKey={bu} position="top" style={{ fontSize: 10, fill: customColors[idx % customColors.length] }} />
                                    </Line>
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <AnalysisBoard insights={insights} />
            </PageContent>
        </PageLayout >
    );
}

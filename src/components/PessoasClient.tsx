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
import { DateRangePicker } from "@/components/ui/DateRangePicker";

import { useFilters } from "@/lib/filter-context";
import { DateRange } from "react-day-picker";
import { FilterDropdown } from "@/components/ui/FilterDropdown";

interface PessoasProps {
    transactions: Transaction[];
}

export function PessoasClient({ transactions }: PessoasProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [selectedMacro, setSelectedMacro] = useState<string>("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

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

    // Filter Data
    const filtered = useMemo(() => {
        // Pre-calculate date range boundaries if they exist
        const fromDate = dateRange?.from ? startOfDay(dateRange.from) : null;
        const toDate = dateRange?.to ? endOfDay(dateRange.to) : (fromDate ? endOfDay(fromDate) : null);

        return processedTransactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;
            if (selectedMacro !== "All" && t.macroCategory !== selectedMacro) return false;

            if (fromDate && t.parsedDate) {
                // Use the pre-parsed date object directly
                if (toDate) {
                    if (t.parsedDate < fromDate || t.parsedDate > toDate) return false;
                } else {
                    if (t.parsedDate < fromDate) return false;
                }
            } else if (fromDate && !t.parsedDate) {
                // If we have a date filter but this transaction has no valid date, exclude it
                return false;
            }

            return true;
        });
    }, [processedTransactions, selectedBU, selectedMacro, dateRange]);

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

    const insights = useMemo(() => {
        return [{
            id: 'people-info',
            type: 'info' as const,
            title: 'Análise de Pessoas',
            description: 'Visão de alocação e custos de pessoal.'
        }];
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const colors = ["#2E7D32", "#E6EE9C", "#616161", "#F48FB1", "#81C784", "#FFD54F", "#90CAF9"];

    const allBUs = useMemo(() => Array.from(new Set(transactions.map(t => t.bu || "N/D"))).sort(), [transactions]);
    const allMacros = useMemo(() => Array.from(new Set(transactions.map(t => t.macroCategory || "N/D"))).sort(), [transactions]);

    return (
        <PageLayout>
            <PageHeader
                title="Pessoas e Custos"
                subtitle="Headcount e despesas de pessoal"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <FilterDropdown label="Categoria" value={selectedMacro} onChange={setSelectedMacro} options={allMacros} />
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            Custo por BU e Categoria
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={buCategoryData.data} margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tickFormatter={(val) => new Intl.NumberFormat('en', { notation: 'compact' }).format(val)} tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(val: number | undefined) => formatCurrency(val || 0)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend />
                                    {buCategoryData.categories.map((cat: string, index: number) => (
                                        <Bar key={cat} dataKey={cat} stackId="a" fill={colors[index % colors.length]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            Evolução de Headcount
                        </h3>
                        {/* Placeholder for Headcount Chart if needed or duplication of others */}
                        <div className="h-[400px] w-full flex items-center justify-center text-gray-500">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={peopleCountData} margin={{ left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="formattedName" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Legend />
                                    {/* Dynamically render lines for each BU? For now just example */}
                                    <Line type="monotone" dataKey="Technology" stroke="#06B6D4" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="Marketing" stroke="#F472B6" strokeWidth={2} dot={false} />
                                </LineChart>
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

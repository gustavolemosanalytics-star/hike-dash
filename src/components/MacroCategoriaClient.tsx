"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, Cell, LabelList, ReferenceLine
} from "recharts";
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { PageLayout, PageContent, PageHeader } from "@/components/ui/PageLayout";
import { FilterDropdown } from "@/components/ui/FilterDropdown";

import { useFilters } from "@/lib/filter-context";

interface MacroCategoriaProps {
    transactions: Transaction[];
}

export function MacroCategoriaClient({ transactions }: MacroCategoriaProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [selectedType, setSelectedType] = useState<string>("All");
    const [selectedMacro, setSelectedMacro] = useState<string>("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Pagination for table
    const [page, setPage] = useState(0);
    const rowsPerPage = 8;

    const filtered = useMemo(() => {
        return transactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;
            // Additional filtering if needed, e.g. Project
            if (selectedType !== "All" && t.type !== selectedType) return false;
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
    }, [transactions, selectedBU, selectedType, selectedMacro, dateRange]);

    const aggregated = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            const key = t.macroCategory || "Outros";
            const val = map.get(key) || 0;
            map.set(key, val + t.amount);
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [filtered]);

    const categoryData = useMemo(() => {
        let arr = [...aggregated]; // Use aggregated directly
        arr.sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value));
        return arr;
    }, [aggregated]);

    const buMacroData = useMemo(() => {
        const buMap = new Map();
        filtered.forEach(t => {
            const bu = t.bu || "N/D";
            const macro = t.macroCategory || "Outros";
            if (!buMap.has(bu)) buMap.set(bu, { name: bu });
            const entry = buMap.get(bu);
            if (!entry[macro]) entry[macro] = 0;
            entry[macro] += t.amount;
        });
        return Array.from(buMap.values());
    }, [filtered]);

    const tableData = useMemo(() => {
        const total = filtered.reduce((acc, t) => acc + t.amount, 0);
        return aggregated
            .map((item: any) => ({
                ...item,
                percent: total ? (item.value / total) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value);
    }, [filtered, aggregated]);

    // Insights
    const insights = useMemo(() => {
        if (aggregated.length === 0) return [];
        const top = [...aggregated].sort((a, b) => b.value - a.value)[0];
        return [{
            id: 'top-cat',
            type: 'info' as const,
            title: 'Maior Categoria',
            description: `A maior categoria é ${top.name} com ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(top.value)}`
        }];
    }, [aggregated]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const colors = ["#2E7D32", "#E6EE9C", "#616161", "#F48FB1", "#81C784", "#FFD54F", "#90CAF9"];


    const allBUs = useMemo(() => Array.from(new Set(transactions.map(t => t.bu || "N/D"))).sort(), [transactions]);
    const allTypes = ["1. Contas a Receber", "2. Contas a Pagar"];
    const allMacros = useMemo(() => Array.from(new Set(transactions.map(t => t.macroCategory || "N/D"))).sort(), [transactions]);

    return (
        <PageLayout>
            <PageHeader
                title="MacroCategoria"
                subtitle="Análise detalhada por categorias macro"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <FilterDropdown label="Tipo" value={selectedType} onChange={setSelectedType} options={allTypes} />
                <FilterDropdown label="Macro" value={selectedMacro} onChange={setSelectedMacro} options={allMacros} />
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Horizontal Bar: Valor por Categoria */}
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">Valor por Categoria</h3>
                        <div className="h-[500px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={categoryData} margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 10 }} interval={0} />
                                    <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <Bar dataKey="value" fill="#DCEEAA" radius={[0, 4, 4, 0]}>
                                        <LabelList dataKey="value" position="right" formatter={(val: any) => formatCurrency(Number(val) || 0)} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Stacked Bar: Valor por BU e Macro */}
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6">Valor por BU e MacroCategoria</h3>
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={buMacroData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} />
                                    <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} />
                                    <Legend />
                                    {Array.from(new Set(transactions.map(t => t.macroCategory || "N/D"))).slice(0, 10).map((macro, idx) => (
                                        <Bar key={macro} dataKey={macro} stackId="a" fill={colors[idx % colors.length]} radius={[0, 0, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Tabela por MacroCategoria */}
                <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <div className="w-1 h-5 bg-[#DCEEAA] rounded-full"></div>
                        Tabela por MacroCategoria
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-black/5 text-xs uppercase font-semibold text-secondary-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left">MacroCategoria</th>
                                    <th className="px-4 py-3 text-right">Valor</th>
                                    <th className="px-4 py-3 text-right">% do total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {tableData.map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/40 transition-colors">
                                        <td className="px-4 py-3 font-medium">{row.name}</td>
                                        <td className="px-4 py-3 text-right">{formatCurrency(row.value)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div
                                                    className="h-3 rounded-sm"
                                                    style={{
                                                        width: `${Math.min(100, Math.abs(row.percent))}px`,
                                                        backgroundColor: row.value >= 0 ? '#DCEEAA' : '#F8BBD9'
                                                    }}
                                                ></div>
                                                <span className={row.value >= 0 ? 'text-green-700' : 'text-red-600'}>
                                                    {row.percent.toFixed(2)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <AnalysisBoard insights={insights} />
            </PageContent>
        </PageLayout >
    );
}

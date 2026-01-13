"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, Cell, LabelList, ReferenceLine
} from "recharts";
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    const rowsPerPage = 10;

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
            // Use CATEGORY (detailed) for the horizontal bar chart "Valor por Categoria"
            const key = t.category || t.macroCategory || "Outros";
            const val = map.get(key) || 0;
            map.set(key, val + t.amount);
        });
        return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }, [filtered]);

    const categoryData = useMemo(() => {
        let arr = [...aggregated]; // Use aggregated directly
        arr.sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value));
        // Limit to Top 20 for readability
        return arr.slice(0, 20);
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
    const allMacros = useMemo(() => {
        const macros = transactions.map(t => t.macroCategory).filter(m => m && m.trim() !== '');
        return Array.from(new Set(macros)).sort();
    }, [transactions]);

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
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">Top 20 Categorias (Valor)</h3>
                        <div className="h-[500px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={categoryData} margin={{ top: 20, right: 100, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 10 }} interval={0} />
                                    <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <ReferenceLine x={0} stroke="#999" strokeWidth={1} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {categoryData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#DCEEAA' : '#F8BBD9'} />
                                        ))}
                                        <LabelList
                                            dataKey="value"
                                            position="right"
                                            content={({ x, y, width, height, value }: any) => {
                                                const isNegative = value < 0;
                                                const labelX = isNegative ? (x as number) - 10 : (x as number) + (width || 0) + 8;
                                                const anchor = isNegative ? 'end' : 'start';
                                                return (
                                                    <text
                                                        x={labelX}
                                                        y={(y as number) + ((height || 0) / 2) + 4}
                                                        textAnchor={anchor}
                                                        fill={isNegative ? '#E11D48' : '#333'}
                                                        fontSize={10}
                                                        fontWeight={600}
                                                    >
                                                        {formatCurrency(value || 0)}
                                                    </text>
                                                );
                                            }}
                                        />
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

                {/* Tabela por Categoria */}
                <div className="glass-card rounded-2xl border border-white/40 flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-white">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <div className="w-1 h-5 bg-[#DCEEAA] rounded-full"></div>
                            Tabela por Categoria
                        </h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gradient-to-r from-slate-100 to-slate-50">
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-left">Categoria</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Valor</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">% do Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tableData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row: any, i: number) => (
                                    <tr key={i} className="group transition-all duration-200 hover:bg-gradient-to-r hover:from-[#DCEEAA]/10 hover:to-transparent">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{row.name}</td>
                                        <td className="px-6 py-4 text-sm text-right font-semibold text-slate-800">{formatCurrency(row.value)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.min(100, Math.abs(row.percent))}%`,
                                                            backgroundColor: row.value >= 0 ? '#DCEEAA' : '#F8BBD9'
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className={`text-sm font-semibold ${row.value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {row.percent.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-3 border-t border-slate-200/50 bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Mostrando <span className="font-semibold text-slate-700">{page * rowsPerPage + 1}</span> a{" "}
                            <span className="font-semibold text-slate-700">{Math.min((page + 1) * rowsPerPage, tableData.length)}</span> de{" "}
                            <span className="font-semibold text-slate-700">{tableData.length}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                            <span className="text-sm font-medium text-slate-600">Pg {page + 1}</span>
                            <button onClick={() => setPage(page + 1)} disabled={(page + 1) * rowsPerPage >= tableData.length} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
                        </div>
                    </div>
                </div>

                <AnalysisBoard insights={insights} />
            </PageContent>
        </PageLayout >
    );
}

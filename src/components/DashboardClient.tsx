"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import { generateInsights } from "@/lib/insight-engine";
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { KPICard } from "@/components/ui/KPICard";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import {
    BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, YAxis,
    CartesianGrid, Legend, LineChart, Line, LabelList, ComposedChart
} from "recharts";
import { motion } from "framer-motion";
import { format, parseISO, getQuarter, getYear, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { PageLayout, PageHeader, PageContent } from "@/components/ui/PageLayout";

interface DashboardClientProps {
    transactions: Transaction[];
}

const META = 1000000;

export function DashboardClient({ transactions }: DashboardClientProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [chartBU, setChartBU] = useState<string>("All"); // Local chart filter
    const [selectedType, setSelectedType] = useState<string>("All"); // Added Type state
    const [selectedProject, setSelectedProject] = useState<string>("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [page, setPage] = useState(0);
    const rowsPerPage = 5;

    console.log('DashboardClient: Rendering with transactions:', transactions?.length || 0);

    const filteredData = useMemo(() => {
        if (!transactions) return [];
        return transactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;
            if (selectedType !== "All" && t.type !== selectedType) return false; // Added Type filter
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
    }, [transactions, selectedBU, selectedProject, selectedType, dateRange]);

    const aggregated = useMemo(() => {
        let sumReceita = 0;
        let sumDespesa = 0;
        let sumReceitaForMargin = 0;

        filteredData.forEach(t => {
            if (t.type === '1. Contas a Receber') {
                sumReceita += t.amount;
                // For margin calculation base
                sumReceitaForMargin += t.amount;
            }
            if (t.type === '2. Contas a Pagar') {
                sumDespesa += Math.abs(t.amount);
            }
        });

        const sumResultado = sumReceita - sumDespesa;
        const margem = sumReceitaForMargin ? (sumResultado / sumReceitaForMargin) * 100 : 0;

        return { receita: sumReceita, despesa: sumDespesa, resultado: sumResultado, margem };
    }, [filteredData]);

    const tableData = useMemo(() => {
        const map = new Map();
        filteredData.forEach(t => {
            const bu = t.bu || "Outros";
            if (!map.has(bu)) map.set(bu, { name: bu, bu, receita: 0, despesa: 0, resultado: 0 });
            const entry = map.get(bu);

            if (t.type === '1. Contas a Receber') {
                entry.receita += t.amount;
                entry.resultado += t.amount;
            }
            if (t.type === '2. Contas a Pagar') {
                entry.despesa += Math.abs(t.amount);
                entry.resultado -= Math.abs(t.amount);
            }
        });
        return Array.from(map.values()).map((item: any) => ({
            ...item,
            margem: item.receita ? (item.resultado / item.receita) * 100 : 0
        })).sort((a, b) => b.receita - a.receita);
    }, [filteredData]);

    const quarterData = useMemo(() => {
        const map = new Map();
        filteredData.forEach(t => {
            if (!t.date) return;
            try {
                const d = parseISO(t.date);
                const q = getQuarter(d);
                const y = getYear(d);
                const key = `T${q}, ${y}`;
                const sortKey = `${y}-${q}`;

                if (!map.has(key)) map.set(key, { name: key, receita: 0, despesa: 0, sortKey });
                const entry = map.get(key);

                if (t.type === '1. Contas a Receber') {
                    entry.receita += t.amount;
                }
                if (t.type === '2. Contas a Pagar') {
                    entry.despesa += Math.abs(t.amount);
                }
            } catch (e) { }
        });
        return Array.from(map.values()).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));
    }, [filteredData]);

    const timeSeriesData = useMemo(() => {
        const map = new Map();
        filteredData.forEach(t => {
            if (!t.date) return;
            const monthKey = t.date.substring(0, 7);
            if (!map.has(monthKey)) map.set(monthKey, { name: monthKey });

            const entry = map.get(monthKey);
            const bu = t.bu || "Outros";

            if (entry[bu] === undefined) entry[bu] = 0;

            if (t.type === '1. Contas a Receber') entry[bu] += t.amount;
            else if (t.type === '2. Contas a Pagar') entry[bu] -= Math.abs(t.amount);
        });

        const sorted = Array.from(map.values()).sort((a: any, b: any) => a.name.localeCompare(b.name));
        return sorted.map((item: any) => {
            try {
                const d = parseISO(item.name + '-01');
                return { ...item, formattedName: format(d, 'MMM/yy') };
            } catch {
                return { ...item, formattedName: item.name };
            }
        });
    }, [filteredData]);

    const allBUs = useMemo(() => Array.from(new Set(filteredData.map(t => t.bu || "Outros"))), [filteredData]);
    const buOptions = useMemo(() => Array.from(new Set(transactions.map(t => t.bu || "N/D"))).sort(), [transactions]);
    const projectOptions = useMemo(() => Array.from(new Set(transactions.map(t => t.project || "N/D"))).sort(), [transactions]);
    const typeOptions = ["1. Contas a Receber", "2. Contas a Pagar"]; // Static options as per data structure

    const insights = useMemo(() => generateInsights(aggregated, tableData, { type: 'dashboard' }), [aggregated, tableData]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
    const formatCompact = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact", maximumFractionDigits: 1 }).format(val);

    const getColor = (index: number) => {
        const colors = ["#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899"];
        return colors[index % colors.length];
    }

    return (
        <PageLayout>
            {/* Debug Indicator - REMOVE IN PROD */}
            {(!transactions || transactions.length === 0) && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                    <p className="font-bold">No Data Loaded</p>
                    <p>Check console logs for Google Sheets errors.</p>
                </div>
            )}
            {transactions && transactions.length > 0 && buOptions.length <= 1 && buOptions[0] === 'N/D' && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
                    <p className="font-bold">Aviso: Coluna BU não detectada</p>
                    <p>Dados carregados, mas a coluna de Business Unit (BU) não foi encontrada ou está vazia. Verifique se o nome da coluna é exatamente "BU" na planilha.</p>
                </div>
            )}

            <PageHeader
                title="Receitas, Despesas e Custos"
                subtitle="Visão geral da performance financeira"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={buOptions} />
                <FilterDropdown label="Tipo" value={selectedType} onChange={setSelectedType} options={typeOptions} />
                <FilterDropdown label="Projeto" value={selectedProject} onChange={setSelectedProject} options={projectOptions} />
                <div className="h-8 w-[1px] bg-black/5 mx-1 hidden md:block"></div>
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <KPICard title="Receita" value={aggregated.receita} color="bg-[#DCEEAA]" textColor="text-[#3A4A1C]" />
                    <KPICard title="Despesas/Custo" value={aggregated.despesa * -1} color="bg-[#B8B8B8]" textColor="text-[#1A1A1A]" />

                    <motion.div
                        whileHover={{ y: -4, scale: 1.01 }}
                        className={`rounded-2xl p-6 bg-white/60 backdrop-blur-md text-foreground shadow-lg shadow-black/5 relative overflow-hidden flex flex-col justify-center h-32 border border-black/5`}
                    >
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                        <span className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Resultado</span>
                        <span className={`text-3xl font-bold tracking-tight ${aggregated.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(aggregated.resultado)}
                        </span>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -4, scale: 1.01 }}
                        className={`rounded-2xl p-6 bg-white/60 backdrop-blur-md text-foreground shadow-lg shadow-black/5 relative overflow-hidden flex flex-col justify-center h-32 border border-black/5`}
                    >
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                        <span className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Margem</span>
                        <span className={`text-3xl font-bold tracking-tight ${aggregated.margem >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {isNaN(aggregated.margem) ? '0.00' : aggregated.margem.toFixed(2)}%
                        </span>
                    </motion.div>
                </div>

                {/* Gauge and Table */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white rounded-2xl p-6 border border-slate-100/50 flex flex-col items-center justify-center relative min-h-[350px] shadow-sm">
                        <h3 className="text-slate-600 font-medium mb-8 absolute top-6 left-6">% da Meta</h3>
                        <GaugeChart value={aggregated.resultado} target={META} />
                        <div className="mt-4 text-center">
                            <div className="text-3xl font-bold text-slate-800">{formatCurrency(aggregated.resultado)}</div>
                            <div className="text-sm font-medium text-slate-500">Meta: {formatCurrency(META)}</div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100/50 flex flex-col shadow-sm min-h-[400px]">
                        <h3 className="text-lg font-semibold mb-4 text-slate-800">Resultado por BU</h3>

                        {/* Interactive BU Buttons */}
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar mask-gradient-right">
                            <button
                                onClick={() => setChartBU("All")}
                                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${chartBU === "All"
                                    ? "bg-slate-800 text-white shadow-md"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                    }`}
                            >
                                Todos
                            </button>
                            {buOptions.map(bu => (
                                <button
                                    key={bu}
                                    onClick={() => setChartBU(bu)}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${chartBU === bu
                                        ? "bg-slate-800 text-white shadow-md"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                                        }`}
                                >
                                    {bu}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={chartBU === 'All' ? tableData : tableData.filter(d => d.bu === chartBU)}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="bu" axisLine={false} tickLine={false} tick={{ fill: '#1A1A1A', fontSize: 11, fontWeight: 500 }} />
                                    <YAxis yAxisId="left" orientation="left" tickFormatter={(val) => new Intl.NumberFormat('en', { notation: "compact" }).format(val)} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${val.toFixed(0)}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(val: any, name: any) => name === 'Margem' ? `${Number(val).toFixed(2)}%` : formatCurrency(Number(val))} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />

                                    <Bar yAxisId="left" dataKey="receita" name="Receita" fill="#166534" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar yAxisId="left" dataKey="despesa" name="Despesa" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Bar yAxisId="left" dataKey="resultado" name="Resultado" fill="#86EFAC" radius={[4, 4, 0, 0]} barSize={20} />
                                    <Line yAxisId="right" type="monotone" dataKey="margem" name="Margem" stroke="#4A5568" strokeWidth={2} dot={{ r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-card rounded-2xl p-6 border border-white/40 min-h-[400px] flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <div className="w-1 h-5 bg-[#DCEEAA] rounded-full"></div>
                            Receita e Despesa/Custo por BU
                        </h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={tableData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="bu" axisLine={false} tickLine={false} tick={{ fill: '#1A1A1A', fontSize: 11, fontWeight: 500 }} />
                                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    <Bar dataKey="receita" name="Receita" fill="#DCEEAA" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="receita" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#3A4A1C', fontWeight: 600 }} />
                                    </Bar>
                                    <Bar dataKey="despesa" name="Despesa_Custo" fill="#5F6368" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="despesa" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#5F6368', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6 border border-white/40 min-h-[400px] flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <div className="w-1 h-5 bg-[#5F6368] rounded-full"></div>
                            Receita e Despesa/Custo por Quarter
                        </h3>
                        <div className="flex-1 w-full min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={quarterData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#1A1A1A', fontSize: 11, fontWeight: 500 }} />
                                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                    <Bar dataKey="receita" name="Receita" fill="#DCEEAA" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="receita" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#3A4A1C', fontWeight: 600 }} />
                                    </Bar>
                                    <Bar dataKey="despesa" name="Despesa_Custo" fill="#5F6368" radius={[4, 4, 0, 0]}>
                                        <LabelList dataKey="despesa" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#5F6368', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                    <h3 className="text-lg font-semibold mb-6">Resultado ao longo do tempo por BU</h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timeSeriesData} margin={{ left: 10, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="formattedName" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 11 }} padding={{ left: 20, right: 20 }} />
                                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                {allBUs.map((bu, idx) => (
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

                <AnalysisBoard insights={insights} />
            </PageContent>
        </PageLayout>
    );
}

// Helper
function GaugeChart({ value, target }: { value: number, target: number }) {
    const safeValue = isNaN(value) ? 0 : value;
    const safeTarget = isNaN(target) || target === 0 ? 1 : target; // Avoid div by zero
    const percentage = Math.min(100, Math.max(0, (safeValue / safeTarget) * 100));
    const rotation = (percentage / 100) * 180;

    return (
        <div className="relative w-64 h-32 overflow-hidden mt-8">
            <div className="absolute top-0 left-0 w-full h-full bg-slate-200 rounded-t-full"></div>
            <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: isNaN(rotation) ? 0 : rotation }}
                transition={{ duration: 1, type: "spring" }}
                className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-green-400 to-green-600 origin-bottom rounded-t-full"
                style={{ transformOrigin: "bottom center" }}
            ></motion.div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-48 h-48 bg-white rounded-full flex items-center justify-center">
            </div>
        </div>
    )
}

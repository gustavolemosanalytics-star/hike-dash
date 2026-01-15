"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, Cell, LabelList, PieChart, Pie, ReferenceLine
} from "recharts";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { KPICard } from "@/components/ui/KPICard";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { PageLayout, PageContent, PageHeader } from "@/components/ui/PageLayout";
import { useFilters } from "@/lib/filter-context";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";

interface ProjetoClusterProps {
    transactions: Transaction[];
}

export function ProjetoClusterClient({ transactions }: ProjetoClusterProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [selectedProject, setSelectedProject] = useState<string>("All");
    const [selectedCluster, setSelectedCluster] = useState<string>("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Pagination for tables
    const [page, setPage] = useState(0);
    const [clusterTablePage, setClusterTablePage] = useState(0);
    const rowsPerPage = 10;

    const filtered = useMemo(() => {
        return transactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;
            if (selectedProject !== "All" && t.project !== selectedProject) return false;
            if (selectedCluster !== "All" && t.cluster !== selectedCluster) return false;

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
    }, [transactions, selectedBU, selectedProject, selectedCluster, dateRange]);

    const kpis = useMemo(() => {
        let rec = 0;
        let desp = 0;
        let res = 0;
        let recForMargin = 0;

        filtered.forEach(t => {
            const isReceita = t.type === '1. Contas a Receber';
            const isDespesa = t.type === '2. Contas a Pagar';

            if (isReceita) {
                rec += t.amount;
                recForMargin += t.amount;
            }
            if (isDespesa) {
                desp += Math.abs(t.amount);
            }

            if (isReceita) res += t.amount;
            else if (isDespesa) res -= Math.abs(t.amount);
        });

        const margem = recForMargin ? (res / recForMargin) * 100 : 0;

        return { rec, desp, res, margem };
    }, [filtered]);

    const projectsData = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            const proj = t.project || "N/D";
            if (!map.has(proj)) map.set(proj, { name: proj, value: 0 });

            if (t.type === '2. Contas a Pagar') map.get(proj).value -= Math.abs(t.amount);
            else map.get(proj).value += t.amount;
        });

        let arr = Array.from(map.values()).sort((a: any, b: any) => b.value - a.value);
        return arr.slice(0, 10);
    }, [filtered]);

    const tableData = useMemo(() => {
        const clusterMap = new Map();
        filtered.forEach(t => {
            const cluster = t.cluster || "N/D";
            if (!clusterMap.has(cluster)) clusterMap.set(cluster, { name: cluster, receita: 0, despesa: 0, resultado: 0 });
            const entry = clusterMap.get(cluster);

            if (t.type === '1. Contas a Receber') {
                entry.receita += t.amount;
                entry.resultado += t.amount;
            } else {
                entry.despesa += Math.abs(t.amount);
                entry.resultado -= Math.abs(t.amount);
            }
        });

        return Array.from(clusterMap.values())
            .map((item: any) => ({
                ...item,
                margem: item.receita ? (item.resultado / item.receita) * 100 : 0
            }))
            .sort((a: any, b: any) => b.resultado - a.resultado);

    }, [filtered]);

    // Insights
    const insights = useMemo(() => {
        return [{
            id: 'proj-1', type: 'info' as const, title: 'Resumo', description: `Resultado total de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.res)}`
        }]
    }, [kpis]);

    // Overview Projetos - full list with pagination
    const overviewProjetos = useMemo(() => {
        const map = new Map();
        filtered.forEach(t => {
            const proj = t.project || "N/D";
            if (!map.has(proj)) map.set(proj, { name: proj, value: 0 });
            map.get(proj).value += t.amount;
        });
        return Array.from(map.values()).sort((a: any, b: any) => b.value - a.value);
    }, [filtered]);

    // Tabela por Cluster with quarter breakdown
    const clusterQuarterData = useMemo(() => {
        const map = new Map();
        const total = filtered.reduce((acc, t) => acc + Math.abs(t.amount), 0);

        filtered.forEach(t => {
            const cluster = t.cluster || "N/D";
            const quarter = t.date ? `T${Math.ceil((parseInt(t.date.substring(5, 7)) / 3))}, ${t.date.substring(0, 4)}` : "N/D";
            const key = `${cluster}-${quarter}`;

            if (!map.has(key)) map.set(key, { cluster, quarter, value: 0, percent: 0 });
            map.get(key).value += t.amount;
        });

        return Array.from(map.values())
            .map((item: any) => ({ ...item, percent: total ? (item.value / total) * 100 : 0 }))
            .sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value));
    }, [filtered]);

    // Pie chart data - Contas a Receber by Category (Valor column)
    const pieReceberData = useMemo(() => {
        const map = new Map();
        let total = 0;

        filtered.forEach(t => {
            if (t.type !== '1. Contas a Receber') return;
            const cat = t.category || t.macroCategory || "Outros";
            if (!map.has(cat)) map.set(cat, { name: cat, value: 0 });
            map.get(cat).value += Math.abs(t.amount);
            total += Math.abs(t.amount);
        });

        return Array.from(map.values())
            .map((item: any) => ({ ...item, percent: total ? (item.value / total) * 100 : 0 }))
            .sort((a: any, b: any) => b.value - a.value);
    }, [filtered]);

    // Pie chart data - Contas a Pagar by MacroCategory
    const piePagarData = useMemo(() => {
        const map = new Map();

        filtered.forEach(t => {
            if (t.type !== '2. Contas a Pagar') return;
            const cat = t.macroCategory || "Outros";
            if (!map.has(cat)) map.set(cat, { name: cat, value: 0 });
            map.get(cat).value += Math.abs(t.amount);
        });

        return Array.from(map.values()).sort((a: any, b: any) => b.value - a.value).slice(0, 10);
    }, [filtered]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const colors = ["#2E7D32", "#E6EE9C", "#616161", "#F48FB1", "#81C784", "#FFD54F", "#90CAF9"];

    const allBUs = useMemo(() => Array.from(new Set(transactions.map(t => t.bu || "N/D"))).sort(), [transactions]);
    const allProjects = useMemo(() => Array.from(new Set(transactions.map(t => t.project || "N/D"))).sort(), [transactions]);
    const allClusters = useMemo(() => Array.from(new Set(transactions.map(t => t.cluster || "N/D"))).sort(), [transactions]);

    return (
        <PageLayout>
            <PageHeader
                title="Projetos e Clusters"
                subtitle="Análise de rentabilidade e desempenho"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <FilterDropdown label="Projeto" value={selectedProject} onChange={setSelectedProject} options={allProjects} />
                <FilterDropdown label="Cluster" value={selectedCluster} onChange={setSelectedCluster} options={allClusters} />
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <KPICard title="Receita Total" value={kpis.rec} color="bg-[#E4E4E7]" textColor="text-foreground" />
                    <KPICard title="Despesa Total" value={kpis.desp} color="bg-[#E2E0D4]" textColor="text-[#5F6368]" />
                    <KPICard title="Resultado" value={kpis.res} color={kpis.res >= 0 ? "bg-[#DCEEAA]" : "bg-red-100"} textColor={kpis.res >= 0 ? "text-[#3A4A1C]" : "text-red-700"} />
                    <KPICard
                        title="Margem"
                        value={kpis.margem.toFixed(1) + "%"}
                        color="bg-[#0F172A]"
                        textColor="text-white"
                    />
                </div>

                {/* Row 1: Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col lg:col-span-2">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            Top 10 Projetos (Resultado)
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={projectsData} margin={{ left: 40, right: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(val: number | undefined) => formatCurrency(val || 0)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <ReferenceLine x={0} stroke="#999" strokeWidth={1} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                        {projectsData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#10B981" : "#EF4444"} />
                                        ))}
                                        <LabelList
                                            dataKey="value"
                                            content={({ x, y, width, height, value }: any) => {
                                                const isNegative = value < 0;
                                                const labelX = isNegative ? (x as number) - 8 : (x as number) + (width || 0) + 8;
                                                const anchor = isNegative ? 'end' : 'start';
                                                return (
                                                    <text
                                                        x={labelX}
                                                        y={(y as number) + ((height || 0) / 2) + 4}
                                                        textAnchor={anchor}
                                                        fill={isNegative ? '#EF4444' : '#666'}
                                                        fontSize={10}
                                                        fontWeight={500}
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

                    {/* Table */}
                    <div className="glass-card rounded-2xl p-0 border border-white/40 flex flex-col overflow-hidden h-[480px]">
                        <div className="p-5 border-b border-black/5 bg-white/30">
                            <h3 className="font-semibold text-lg">Cluster Performance</h3>
                        </div>
                        <div className="flex-1 overflow-auto bg-white/20">
                            <table className="w-full text-sm">
                                <thead className="bg-black/5 text-xs uppercase font-semibold text-secondary-foreground sticky top-0 backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Cluster</th>
                                        <th className="px-6 py-3 text-right">Resultado</th>
                                        <th className="px-6 py-3 text-right">Margem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {tableData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/40 transition-colors">
                                            <td className="px-6 py-4 font-medium text-xs">{row.name}</td>
                                            <td className={`px-6 py-4 text-right font-medium text-xs ${row.resultado < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(row.resultado)}</td>
                                            <td className="px-6 py-4 text-right text-xs text-secondary-foreground">{row.margem.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 flex justify-between items-center border-t border-black/5 bg-white/30">
                            <span className="text-xs text-secondary-foreground">Pg {page + 1} de {Math.ceil(tableData.length / rowsPerPage)}</span>
                            <div className="flex gap-1">
                                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1 hover:bg-black/5 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setPage(page + 1)} disabled={(page + 1) * rowsPerPage >= tableData.length} className="p-1 hover:bg-black/5 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabela por Cluster */}
                <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col mt-8 max-h-[400px] overflow-hidden">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-1 h-5 bg-[#DCEEAA] rounded-full"></div>
                        Tabela por Cluster
                    </h3>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-black/5 text-xs uppercase font-semibold text-secondary-foreground sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left">Cluster</th>
                                    <th className="px-4 py-2 text-left">Data (Ano e trimestre)</th>
                                    <th className="px-4 py-2 text-right">Valor da Conta</th>
                                    <th className="px-4 py-2 text-right">% do total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {clusterQuarterData.slice(clusterTablePage * rowsPerPage, (clusterTablePage + 1) * rowsPerPage).map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/40">
                                        <td className="px-4 py-2 text-xs">{row.cluster}</td>
                                        <td className="px-4 py-2 text-xs">{row.quarter}</td>
                                        <td className="px-4 py-2 text-right text-xs">
                                            <span className={row.value >= 0 ? '' : ''}>
                                                {formatCurrency(row.value)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div
                                                    className="h-2 rounded-sm"
                                                    style={{
                                                        width: `${Math.min(80, Math.abs(row.percent * 2))}px`,
                                                        backgroundColor: row.value >= 0 ? '#DCEEAA' : '#F8BBD9'
                                                    }}
                                                ></div>
                                                <span className={`text-xs ${row.value >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                    {row.percent.toFixed(2)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-2 flex justify-between items-center border-t border-black/5 bg-white/30">
                        <span className="text-xs text-secondary-foreground">Pg {clusterTablePage + 1} de {Math.ceil(clusterQuarterData.length / rowsPerPage)}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setClusterTablePage(Math.max(0, clusterTablePage - 1))} disabled={clusterTablePage === 0} className="p-1 hover:bg-black/5 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                            <button onClick={() => setClusterTablePage(clusterTablePage + 1)} disabled={(clusterTablePage + 1) * rowsPerPage >= clusterQuarterData.length} className="p-1 hover:bg-black/5 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>

                {/* Overview Projetos */}
                <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col mt-8 max-h-[400px] overflow-hidden">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <div className="w-1 h-5 bg-[#5F6368] rounded-full"></div>
                        Overview Projetos
                    </h3>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-black/5 text-xs uppercase font-semibold text-secondary-foreground sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left">Projeto</th>
                                    <th className="px-4 py-2 text-right">Valor da Conta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-black/5">
                                {overviewProjetos.slice(page * 15, (page + 1) * 15).map((row: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/40">
                                        <td className="px-4 py-2 text-xs">{row.name}</td>
                                        <td className="px-4 py-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div
                                                    className="h-2 rounded-sm"
                                                    style={{
                                                        width: `${Math.min(100, Math.abs(row.value / 10000))}px`,
                                                        backgroundColor: row.value >= 0 ? '#DCEEAA' : '#CCC'
                                                    }}
                                                ></div>
                                                <span className="text-xs">{formatCurrency(row.value)}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-black/5">
                        <span className="text-xs text-gray-500">{page * 15 + 1} - {Math.min((page + 1) * 15, overviewProjetos.length)} / {overviewProjetos.length}</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-2 py-1 text-xs rounded hover:bg-black/5 disabled:opacity-30">&lt;</button>
                            <button onClick={() => setPage(page + 1)} disabled={(page + 1) * 15 >= overviewProjetos.length} className="px-2 py-1 text-xs rounded hover:bg-black/5 disabled:opacity-30">&gt;</button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Pie Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {/* Pie Chart - Contas a Receber */}
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6">Categoria por Contas a Receber</h3>
                        <div className="h-[350px] w-full flex items-center">
                            <ResponsiveContainer width="60%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieReceberData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ percent }: { percent?: number }) => percent ? `${(percent * 100).toFixed(1)}%` : ''}
                                        labelLine={false}
                                    >
                                        {pieReceberData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 text-xs space-y-1 overflow-auto max-h-[300px]">
                                {pieReceberData.slice(0, 10).map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                                        <span className="truncate" title={item.name}>{item.name.substring(0, 30)}...</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bar Chart - Contas a Pagar */}
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6">Categoria por Contas a Pagar</h3>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={piePagarData} margin={{ left: 120, right: 80 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 9 }} interval={0} />
                                    <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} />
                                    <ReferenceLine x={0} stroke="#999" strokeWidth={1} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {piePagarData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#DCEEAA' : '#F8BBD9'} />
                                        ))}
                                        <LabelList
                                            dataKey="value"
                                            content={({ x, y, width, height, value }: any) => {
                                                const isNegative = value < 0;
                                                const labelX = isNegative ? (x as number) - 8 : (x as number) + (width || 0) + 8;
                                                const anchor = isNegative ? 'end' : 'start';
                                                return (
                                                    <text
                                                        x={labelX}
                                                        y={(y as number) + ((height || 0) / 2) + 4}
                                                        textAnchor={anchor}
                                                        fill={isNegative ? '#E11D48' : '#333'}
                                                        fontSize={9}
                                                        fontWeight={500}
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
                </div>

                <div className="mt-8">
                    <AnalysisBoard insights={insights} />
                </div>
            </PageContent>
        </PageLayout>
    );
}

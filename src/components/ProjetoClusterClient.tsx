"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, Cell, LabelList
} from "recharts";
import { motion } from "framer-motion";
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

    // Pagination for table
    const [page, setPage] = useState(0);

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

        let arr = Array.from(map.values()).sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value));
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            Top 10 Projetos (Resultado)
                        </h3>
                        <div className="h-[400px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={projectsData} margin={{ left: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(val: number | undefined) => formatCurrency(val || 0)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                        {projectsData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#10B981" : "#EF4444"} />
                                        ))}
                                        <LabelList dataKey="value" position="right" formatter={(val: any) => formatCurrency(Number(val) || 0)} style={{ fontSize: '10px', fill: '#666' }} />
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
                                    {tableData.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/40 transition-colors">
                                            <td className="px-6 py-4 font-medium text-xs">{row.name}</td>
                                            <td className={`px-6 py-4 text-right font-medium text-xs ${row.resultado < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(row.resultado)}</td>
                                            <td className="px-6 py-4 text-right text-xs text-secondary-foreground">{row.margem.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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

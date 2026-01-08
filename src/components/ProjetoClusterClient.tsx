"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, Cell, LabelList, ReferenceLine
} from "recharts";
import { motion } from "framer-motion";
import { ChevronRight, ChevronLeft, Calendar, Filter } from 'lucide-react';
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { AnalysisBoard } from "@/components/AnalysisBoard";
import { KPICard } from "@/components/ui/KPICard";
import { format, parseISO, getQuarter, getYear, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { PageLayout, PageContent, PageHeader } from "@/components/ui/PageLayout";

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
    const rowsPerPage = 8;

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
        const total = filtered.reduce((acc, t) => acc + t.amount, 0) || 1;

        const map = new Map();

        filtered.forEach(t => {
            if (!t.date) return;
            const cluster = t.cluster || "N/D";
            try {
                const d = parseISO(t.date);
                const q = getQuarter(d);
                const y = getYear(d);
                const key = `${cluster}|T${q}, ${y}`;

                if (!map.has(key)) map.set(key, { cluster, period: `T${q}, ${y}`, value: 0, sortKey: `${y}-${q}` });

                if (t.type === '2. Contas a Pagar') map.get(key).value -= Math.abs(t.amount);
                else map.get(key).value += t.amount;

            } catch (e) { }
        });

        return Array.from(map.values()).sort((a: any, b: any) => {
            return a.cluster.localeCompare(b.cluster) || a.sortKey.localeCompare(b.sortKey);
        });
    }, [filtered]);

    const grandTotal = Math.abs(kpis.res) || 1;

    const allBUs = useMemo(() => Array.from(new Set(transactions.map(t => t.bu || "N/D"))).sort(), [transactions]);
    const allProjects = useMemo(() => Array.from(new Set(transactions.map(t => t.project || "N/D"))).sort(), [transactions]);
    const allClusters = useMemo(() => Array.from(new Set(transactions.map(t => t.cluster || "N/D"))).sort(), [transactions]);

    const insights = useMemo(() => {
        const topProject = projectsData.length > 0 ? projectsData[0] : null;
        return [{
            id: 'proj-info',
            type: 'info' as const,
            title: 'Performance de Projetos',
            description: topProject ? `O projeto ${topProject.name} é o mais relevante no período.` : 'Sem dados de projetos.'
        }];
    }, [projectsData]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    return (
        <PageLayout>
            <PageHeader
                title="Projeto e Cluster"
                subtitle="Acompanhamento detalhado por iniciativa"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <FilterDropdown label="Projeto" value={selectedProject} onChange={setSelectedProject} options={allProjects} />
                <FilterDropdown label="Cluster" value={selectedCluster} onChange={setSelectedCluster} options={allClusters} />
                <div className="h-8 w-[1px] bg-black/5 mx-1 hidden md:block"></div>
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <KPICard title="Receita" value={kpis.rec} color="bg-[#DCEEAA]" textColor="text-[#3A4A1C]" />
                    <KPICard title="Despesas/Custo" value={kpis.desp * -1} color="bg-[#B8B8B8]" textColor="text-[#1A1A1A]" />

                    <motion.div
                        whileHover={{ y: -4, scale: 1.01 }}
                        className={`rounded-2xl p-6 bg-[#E2E0D4] text-[#1A1A1A] shadow-lg shadow-black/5 relative overflow-hidden flex flex-col justify-center h-32 border border-black/5`}
                    >
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                        <span className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Resultado</span>
                        <span className="text-3xl font-bold tracking-tight">{formatCurrency(kpis.res)}</span>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -4, scale: 1.01 }}
                        className={`rounded-2xl p-6 bg-white/60 backdrop-blur-md text-foreground shadow-lg shadow-black/5 relative overflow-hidden flex flex-col justify-center h-32 border border-black/5`}
                    >
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                        <span className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Margem</span>
                        <span className={`text-3xl font-bold tracking-tight ${kpis.margem >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {kpis.margem.toFixed(2)}%
                        </span>
                    </motion.div>
                </div>

                {/* Row: Top Projects & Table */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Horizontal Bar: Top 10 Projetos */}
                    <div className="glass-card rounded-2xl p-6 border border-white/40 flex flex-col">
                        <h3 className="text-lg font-semibold mb-6">Top 10 Projetos</h3>
                        <div className="h-[500px] w-full relative">
                            <div className="absolute top-0 left-0 flex items-center gap-2 text-xs text-secondary-foreground mb-2">
                                <div className="w-3 h-3 bg-[#DCEEAA]"></div>
                                <span>Valor da Conta</span>
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={projectsData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" hide width={100} />
                                    <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                                    <ReferenceLine x={0} stroke="#000" strokeOpacity={0.1} />
                                    <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                                        {projectsData.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.value >= 0 ? "#DCEEAA" : "#616161"} />
                                        ))}
                                        <LabelList dataKey="name" position="insideLeft" style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                                        <LabelList dataKey="value" position="right" formatter={(val: any) => formatCurrency(Number(val) || 0)} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card rounded-2xl p-0 border border-white/40 flex flex-col overflow-hidden h-[500px]">
                        <div className="p-5 border-b border-black/5 bg-white/30">
                            <h3 className="font-semibold text-lg">Tabela por Cluster</h3>
                        </div>
                        <div className="flex-1 overflow-auto bg-white/20">
                            <table className="w-full text-sm">
                                <thead className="bg-black/5 text-xs uppercase font-semibold text-secondary-foreground sticky top-0 backdrop-blur-md">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Cluster</th>
                                        <th className="px-6 py-3 text-left">Data</th>
                                        <th className="px-6 py-3 text-right">Valor da Conta</th>
                                        <th className="px-6 py-3 text-right">% do total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {tableData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row, i) => (
                                        <tr key={i} className="hover:bg-white/40 transition-colors">
                                            <td className="px-6 py-4 font-medium text-xs max-w-[120px] truncate">{row.cluster}</td>
                                            <td className="px-6 py-4 text-xs text-secondary-foreground">{row.period}</td>
                                            <td className={`px-6 py-4 text-right font-medium text-xs ${row.value < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(row.value)}</td>
                                            <td className="px-6 py-4 text-right text-xs text-secondary-foreground">
                                                {grandTotal ? ((row.value / grandTotal) * 100).toFixed(2) : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 flex justify-between items-center border-t border-black/5 bg-white/30">
                            <span className="text-xs text-secondary-foreground">Pg {page + 1}</span>
                            <div className="flex gap-1">
                                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1 hover:bg-black/5 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                                <button onClick={() => setPage(page + 1)} disabled={(page + 1) * rowsPerPage >= tableData.length} className="p-1 hover:bg-black/5 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <AnalysisBoard insights={insights} />
            </PageContent>
        </PageLayout >
    );
}

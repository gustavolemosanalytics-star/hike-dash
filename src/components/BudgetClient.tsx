"use client";

import { useMemo, useState } from "react";
import { Transaction } from "@/lib/data";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, LabelList
} from "recharts";
import { motion } from "framer-motion";
import { PageLayout, PageContent, PageHeader } from "@/components/ui/PageLayout";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface BudgetClientProps {
    transactions: Transaction[];
}

// Gauge component for budget visualization
function BudgetGauge({ value, target, label }: { value: number, target: number, label: string }) {
    const safeValue = isNaN(value) ? 0 : value;
    const safeTarget = isNaN(target) || target === 0 ? 1 : target;
    const percentage = Math.min(100, Math.max(-100, (safeValue / safeTarget) * 100));
    const displayPercentage = Math.abs(percentage);

    const radius = 70;
    const strokeWidth = 12;
    const circumference = Math.PI * radius;
    const fillLength = (displayPercentage / 100) * circumference;
    const emptyLength = circumference - fillLength;

    return (
        <div className="relative flex flex-col items-center justify-center">
            <h4 className="text-sm font-semibold text-slate-600 mb-2">{label}</h4>
            <svg width="160" height="90" viewBox="0 0 160 90">
                <path
                    d="M 15 80 A 65 65 0 0 1 145 80"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                <motion.path
                    d="M 15 80 A 65 65 0 0 1 145 80"
                    fill="none"
                    stroke={percentage >= 0 ? "#22C55E" : "#EF4444"}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference}`}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: emptyLength }}
                    transition={{ duration: 1, type: "spring" }}
                />
            </svg>
            <div className="text-center -mt-2">
                <span className={`text-xl font-bold ${percentage >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {percentage.toFixed(0)}%
                </span>
            </div>
        </div>
    );
}

export function BudgetClient({ transactions }: BudgetClientProps) {
    const [selectedBU, setSelectedBU] = useState<string>("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Filter data
    const filtered = useMemo(() => {
        return transactions.filter(t => {
            if (selectedBU !== "All" && t.bu !== selectedBU) return false;

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
    }, [transactions, selectedBU, dateRange]);

    // Get unique BUs
    const allBUs = useMemo(() =>
        Array.from(new Set(transactions.map(t => t.bu).filter(bu => bu && bu !== 'N/D'))).sort()
        , [transactions]);

    // Budget data by BU
    const budgetByBU = useMemo(() => {
        const buMap = new Map();

        filtered.forEach(t => {
            const bu = t.bu || "N/D";
            if (bu === "N/D") return;

            if (!buMap.has(bu)) {
                buMap.set(bu, {
                    name: bu,
                    recebido: 0,
                    aReceber: 0,
                    receita: 0,
                    despesa: 0,
                    resultado: 0,
                    categories: new Map()
                });
            }

            const entry = buMap.get(bu);
            const macro = t.macroCategory || "Outros";

            if (!entry.categories.has(macro)) {
                entry.categories.set(macro, { name: macro, recebido: 0, aReceber: 0, receita: 0, despesa: 0 });
            }

            const catEntry = entry.categories.get(macro);

            if (t.type === '1. Contas a Receber') {
                entry.receita += t.amount;
                entry.recebido += Math.abs(t.paidAmount || 0);
                entry.aReceber += Math.abs(t.pendingAmount || 0);
                catEntry.receita += t.amount;
                catEntry.recebido += Math.abs(t.paidAmount || 0);
                catEntry.aReceber += Math.abs(t.pendingAmount || 0);
            }
            if (t.type === '2. Contas a Pagar') {
                entry.despesa += Math.abs(t.amount);
                catEntry.despesa += Math.abs(t.amount);
            }

            entry.resultado = entry.receita - entry.despesa;
        });

        return Array.from(buMap.values()).map((bu: any) => ({
            ...bu,
            categories: Array.from(bu.categories.values()).sort((a: any, b: any) => b.despesa - a.despesa)
        }));
    }, [filtered]);

    // Chart data for Recebido vs A Receber by BU
    const chartData = useMemo(() => {
        return budgetByBU.map((bu: any) => ({
            name: bu.name,
            Recebido: bu.recebido,
            'A Receber': bu.aReceber
        }));
    }, [budgetByBU]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    const formatCompact = (val: number) =>
        new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(val);

    // Metas por BU (placeholder - should come from budget sheet)
    const metasByBU: Record<string, number> = {
        "HBX": 1000000,
        "Marketing": 800000,
        "Branding": 500000,
        "SG&A": 300000,
    };

    return (
        <PageLayout>
            <PageHeader
                title="Budget"
                subtitle="Orçamento vs Realizado por BU"
            >
                <FilterDropdown label="BU" value={selectedBU} onChange={setSelectedBU} options={allBUs} />
                <DateRangePicker date={dateRange} setDate={setDateRange} />
            </PageHeader>

            <PageContent>
                {/* Main Chart - Recebido vs A Receber by BU */}
                <div className="glass-card rounded-2xl p-6 border border-white/40 mb-8">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <div className="w-1 h-5 bg-[#DCEEAA] rounded-full"></div>
                        Recebido vs A Receber por BU
                    </h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 12 }} />
                                <YAxis tickFormatter={(val) => formatCompact(val)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                <Legend />
                                <Bar dataKey="Recebido" fill="#4A5568" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="Recebido" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                                </Bar>
                                <Bar dataKey="A Receber" fill="#DCEEAA" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="A Receber" position="top" formatter={(val: any) => formatCompact(Number(val))} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* BU Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {budgetByBU.map((bu: any) => (
                        <div key={bu.name} className="glass-card rounded-2xl p-6 border border-white/40">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-800">{bu.name}</h3>
                                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${bu.resultado >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {formatCurrency(bu.resultado)}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Left: Table with categories */}
                                <div className="bg-slate-50 rounded-xl p-4">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Realizado por Categoria</h4>
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-slate-500">
                                                <th className="text-left py-1">Tipo</th>
                                                <th className="text-right py-1">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-t border-slate-200">
                                                <td className="py-1.5 font-medium text-green-700">1. Contas a Receber</td>
                                                <td className="py-1.5 text-right text-green-700">{formatCurrency(bu.receita)}</td>
                                            </tr>
                                            {bu.categories.slice(0, 5).map((cat: any, idx: number) => (
                                                <tr key={idx} className="border-t border-slate-100">
                                                    <td className="py-1 pl-2 text-slate-600">{cat.name.substring(0, 25)}</td>
                                                    <td className="py-1 text-right text-red-600">-{formatCurrency(cat.despesa)}</td>
                                                </tr>
                                            ))}
                                            <tr className="border-t-2 border-slate-300 font-semibold">
                                                <td className="py-2">Total</td>
                                                <td className={`py-2 text-right ${bu.resultado >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                    {formatCurrency(bu.resultado)}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Right: Gauge */}
                                <div className="flex flex-col items-center justify-center">
                                    <BudgetGauge
                                        value={bu.resultado}
                                        target={metasByBU[bu.name] || 500000}
                                        label="% da Meta"
                                    />
                                    <div className="mt-2 text-center">
                                        <div className="text-lg font-bold text-slate-800">{formatCurrency(bu.resultado)}</div>
                                        <div className="text-xs text-slate-500">Meta: {formatCurrency(metasByBU[bu.name] || 500000)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </PageContent>
        </PageLayout>
    );
}

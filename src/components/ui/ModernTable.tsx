"use client";

import { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
    key: keyof T | string;
    label: string;
    align?: "left" | "right" | "center";
    render?: (value: any, row: T) => ReactNode;
}

interface ModernTableProps<T> {
    data: T[];
    columns: Column<T>[];
    page: number;
    rowsPerPage?: number;
    onPageChange: (page: number) => void;
    title?: string;
}

export function ModernTable<T extends Record<string, any>>({
    data,
    columns,
    page,
    rowsPerPage = 10,
    onPageChange,
    title
}: ModernTableProps<T>) {
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const paginatedData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="glass-card rounded-2xl border border-white/40 flex flex-col overflow-hidden h-full">
            {title && (
                <div className="px-6 py-4 border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-white">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <div className="w-1 h-5 bg-[#DCEEAA] rounded-full"></div>
                        {title}
                    </h3>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <table className="w-full">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-gradient-to-r from-slate-100 to-slate-50 backdrop-blur-sm">
                            {columns.map((col, i) => (
                                <th
                                    key={i}
                                    className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                                        }`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedData.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                className="group transition-all duration-200 hover:bg-gradient-to-r hover:from-[#DCEEAA]/10 hover:to-transparent"
                            >
                                {columns.map((col, colIdx) => {
                                    const value = typeof col.key === 'string' ? row[col.key] : undefined;
                                    return (
                                        <td
                                            key={colIdx}
                                            className={`px-6 py-4 text-sm ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                                                }`}
                                        >
                                            {col.render ? col.render(value, row) : (
                                                <span className="text-slate-700 font-medium">
                                                    {typeof value === 'number' && !col.render ? formatCurrency(value) : value}
                                                </span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modern Pagination */}
            <div className="px-6 py-3 border-t border-slate-200/50 bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                    Mostrando <span className="font-semibold text-slate-700">{page * rowsPerPage + 1}</span> a{" "}
                    <span className="font-semibold text-slate-700">{Math.min((page + 1) * rowsPerPage, data.length)}</span> de{" "}
                    <span className="font-semibold text-slate-700">{data.length}</span>
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = i;
                            const isActive = pageNum === page;
                            return (
                                <button
                                    key={i}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${isActive
                                            ? "bg-[#DCEEAA] text-slate-800"
                                            : "bg-transparent text-slate-500 hover:bg-slate-100"
                                        }`}
                                >
                                    {pageNum + 1}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={(page + 1) * rowsPerPage >= data.length}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                </div>
            </div>
        </div>
    );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Layers,
    FolderTree, Users, Box, ChevronLeft, ChevronRight, LogOut, Settings, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from "next/image";
import { useFilters } from "@/lib/filter-context";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

const menuItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "A Receber", href: "/contas-a-receber", icon: ArrowDownCircle },
    { name: "A Pagar", href: "/contas-a-pagar", icon: ArrowUpCircle },
    { name: "Macro", href: "/macrocategoria", icon: Layers },
    { name: "Grupo", href: "/grupo", icon: Box },
    { name: "Projetos", href: "/projeto-cluster", icon: FolderTree },
    { name: "Pessoas", href: "/pessoas", icon: Users },
];

// Internal component for filters to keep main component clean
function SidebarFilters() {
    const {
        selectedBU, setSelectedBU,
        selectedProject, setSelectedProject,
        dateRange, setDateRange
    } = useFilters();

    // Simplified Options (In a real app, these should stream from data or context)
    // For now, hardcoded common options or "All"
    const buOptions = ["All", "Marketing", "Technology", "Sales", "HR"];
    const projectOptions = ["All", "Alpha", "Beta", "Gamma"];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">BU</label>
                <select
                    value={selectedBU}
                    onChange={(e) => setSelectedBU(e.target.value)}
                    className="bg-[#0B1120] text-white text-sm rounded-md border border-white/20 p-2 focus:ring-1 focus:ring-[#DCEEAA] focus:border-[#DCEEAA] outline-none"
                >
                    {buOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Projeto</label>
                <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="bg-[#0B1120] text-white text-sm rounded-md border border-white/20 p-2 focus:ring-1 focus:ring-[#DCEEAA] focus:border-[#DCEEAA] outline-none"
                >
                    {projectOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400">Período</label>
                <div className="bg-[#0B1120] rounded-md border border-white/20 p-1">
                    <DateRangePicker date={dateRange} setDate={setDateRange} />
                </div>
            </div>
        </div>
    )
}

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true);

    return (
        <motion.aside
            initial={{ width: 80 }}
            animate={{ width: isCollapsed ? 80 : 256 }}
            className="bg-[#0F172A] text-white flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0 shadow-xl z-50 transition-all duration-300 relative"
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-12 bg-[#DCEEAA] text-[#1A1A1A] p-1 rounded-full shadow-lg hover:scale-110 transition-transform z-50 border border-white/20"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>

            {/* Header / Logo */}
            <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} transition-all`}>
                <div className={`relative flex-shrink-0 flex items-center justify-center ${isCollapsed ? 'w-10 h-10' : 'w-full h-12'}`}>
                    <Image
                        src="/LOGOS-HIKE_4.png"
                        alt="Hike Logo"
                        fill
                        className="object-contain"
                    />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto scrollbar-hide">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href} className="block relative group">
                            <div className={`
                                relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                                ${isActive ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}
                                ${isCollapsed ? 'justify-center' : ''}
                            `}>
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#DCEEAA]' : ''}`} />
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-sm font-medium whitespace-nowrap"
                                    >
                                        {item.name}
                                    </motion.span>
                                )}
                                {/* Active Indicator for Collapsed Mode */}
                                {isCollapsed && isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#DCEEAA] rounded-r-full" />
                                )}
                            </div>

                            {/* Tooltip for Collapsed */}
                            {isCollapsed && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                                    {item.name}
                                </div>
                            )}
                        </Link>
                    );
                })}

                {/* Filters Section in Sidebar */}
                {!isCollapsed && (
                    <div className="mt-6 px-3 space-y-4">
                        <div className="h-[1px] bg-white/10 w-full mb-4"></div>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filtros Globais</h3>

                        <div className="space-y-3">
                            {/* Add Sidebar specific filters here content */}
                            <SidebarFilters />
                        </div>
                    </div>
                )}
            </nav>



            {/* Footer / Profile */}
            <div className="p-4 mt-2 border-t border-white/10 bg-[#0B1120]">
                <div className={`flex items-center justify-center relative ${isCollapsed ? 'h-10 w-10' : 'h-12 w-full'}`}>
                    <Image
                        src="/LOGOS-HIKE_6.png"
                        alt="Admin Logo"
                        fill
                        className="object-contain"
                    />
                </div>
            </div>
        </motion.aside>
    );
}

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

const menuItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "A Receber", href: "/contas-a-receber", icon: ArrowDownCircle },
    { name: "A Pagar", href: "/contas-a-pagar", icon: ArrowUpCircle },
    { name: "Macro", href: "/macrocategoria", icon: Layers },
    { name: "Grupo", href: "/grupo", icon: Box },
    { name: "Projetos", href: "/projeto-cluster", icon: FolderTree },
    { name: "Pessoas", href: "/pessoas", icon: Users },
];

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
                <div className="w-8 h-8 bg-[#DCEEAA] rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[#1A1A1A] font-bold text-lg">H</span>
                </div>
                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="overflow-hidden whitespace-nowrap"
                    >
                        <h1 className="text-lg font-bold tracking-tight">Hike Dash</h1>
                    </motion.div>
                )}
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
            </nav>



            {/* Footer / Profile */}
            <div className="p-4 mt-2 border-t border-white/10 bg-[#0B1120]">
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-orange-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                                <span className="text-xs font-bold">GL</span>
                            </div>
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0B1120]"></div>
                    </div>

                    {!isCollapsed && (
                        <div className="flex-1 overflow-hidden">
                            <h4 className="text-sm font-medium text-white truncate">Gustavo Lemos</h4>
                            <p className="text-xs text-gray-500 truncate">Admin</p>
                        </div>
                    )}

                    {!isCollapsed && (
                        <button className="text-gray-400 hover:text-white transition-colors">
                            <Settings size={16} />
                        </button>
                    )}
                </div>
            </div>
        </motion.aside>
    );
}

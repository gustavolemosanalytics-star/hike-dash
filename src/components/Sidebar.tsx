"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Layers,
    FolderTree, Users, Box, ChevronLeft, ChevronRight, Menu, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
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

interface SidebarContentProps {
    pathname: string;
    isCollapsed: boolean;
    mobile?: boolean;
}

const SidebarContent = ({ pathname, isCollapsed, mobile = false }: SidebarContentProps) => (
    <div className="flex flex-col h-full">
        {/* Header / Logo */}
        <div className={`p-6 flex items-center ${isCollapsed && !mobile ? 'justify-center' : 'gap-3'} transition-all`}>
            <div className={`relative flex-shrink-0 flex items-center justify-center ${isCollapsed && !mobile ? 'w-10 h-10' : 'w-32 h-12'}`}>
                <Image
                    src="/imagem_topo.png"
                    alt="Hike Logo"
                    fill
                    className="object-contain"
                />
            </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col px-3 gap-6 overflow-y-auto scrollbar-hide py-4">
            <nav className="space-y-1">
                {(!isCollapsed || mobile) && (
                    <div className="mb-2 px-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Menu Principal</span>
                    </div>
                )}

                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href} className="block relative group">
                            <div className={`
                                relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                                ${isActive ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"}
                                ${isCollapsed && !mobile ? 'justify-center' : ''}
                            `}>
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#DCEEAA]' : ''}`} />
                                {(!isCollapsed || mobile) && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-sm font-medium whitespace-nowrap"
                                    >
                                        {item.name}
                                    </motion.span>
                                )}
                                {/* Active Indicator */}
                                {isCollapsed && !mobile && isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#DCEEAA] rounded-r-full" />
                                )}
                            </div>
                            {/* Tooltip */}
                            {isCollapsed && !mobile && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg border border-white/10">
                                    {item.name}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    </div>
);

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu when shifting route
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    return (
        <>
            {/* Mobile Nav Top Bar - CRITICAL: Visible only on mobile */}
            <div className="flex md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0F172A] border-b border-[#1e293b] items-center justify-between px-6 z-[9999]">
                <div className="relative w-32 h-10">
                    <Image
                        src="/imagem_topo.png"
                        alt="Hike Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <button
                    onClick={() => {
                        console.log('Mobile menu button clicked');
                        setIsMobileMenuOpen(!isMobileMenuOpen);
                    }}
                    className="p-3 text-white hover:bg-white/10 rounded-xl transition-all shadow-lg active:scale-95"
                    aria-label="Toggle Menu"
                >
                    {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Menu Backdrop */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Mobile Side Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#0B1120] z-[1001] md:hidden shadow-2xl border-r border-[#1e293b]"
                    >
                        <SidebarContent pathname={pathname} isCollapsed={false} mobile={true} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <motion.aside
                initial={{ width: 80 }}
                animate={{ width: isCollapsed ? 80 : 256 }}
                className="bg-[#0F172A] text-white flex-shrink-0 hidden md:flex flex-col h-screen sticky top-0 shadow-xl z-50 transition-all duration-300 relative border-r border-[#1e293b]"
            >
                {/* Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-12 bg-[#DCEEAA] text-[#1A1A1A] p-1 rounded-full shadow-lg hover:scale-110 transition-transform z-50 border border-white/20"
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>

                <SidebarContent pathname={pathname} isCollapsed={isCollapsed} />
            </motion.aside>
        </>
    );
}

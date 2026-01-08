"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Filter, Calendar } from "lucide-react";

export function PageLayout({ children, className }: { children: ReactNode, className?: string }) {
    return (
        <div className={`flex flex-col h-[100dvh] w-full bg-[#F8FAFC] overflow-hidden pt-16 md:pt-0 ${className || ''}`}>
            {children}
        </div>
    )
}

export function PageHeader({
    title,
    subtitle,
    children,
    className
}: {
    title: string,
    subtitle?: string,
    children?: ReactNode,
    className?: string
}) {
    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`
                flex-shrink-0 relative
                ${className || ''}
            `}
        >
            {/* Main Header Section */}
            <div className="bg-gradient-to-br from-white via-white to-slate-50 border-b border-slate-200/60 backdrop-blur-sm">
                <div className="px-6 py-5">
                    {/* Title Section */}
                    <div className="flex flex-col gap-1 mb-4">
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent tracking-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-sm text-slate-500 font-medium">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {/* Filters Section */}
                    {children && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="flex items-center gap-3 flex-wrap"
                        >
                            {children}
                        </motion.div>
                    )}
                </div>

                {/* Animated Bottom Border */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                    className="h-[2px] bg-gradient-to-r from-[#DCEEAA] via-[#DCEEAA]/50 to-transparent origin-left"
                />
            </div>
        </motion.header>
    )
}

export function PageContent({ children, className }: { children: ReactNode, className?: string }) {
    return (
        <div className={`flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 scroll-smooth ${className || ''}`}>
            <div className="mx-auto w-full max-w-[1920px] flex flex-col gap-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
            </div>
        </div>
    )
}

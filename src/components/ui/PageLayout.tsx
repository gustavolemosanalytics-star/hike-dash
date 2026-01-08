"use client";

import { ReactNode } from "react";

import { motion } from "framer-motion";

// If lib/utils doesn't exist, I'll remove cn or polyfill. I'll check existence or just not use it yet.
// Using standard className combine.

export function PageLayout({ children, className }: { children: ReactNode, className?: string }) {
    return (
        <div className={`flex flex-col h-[100dvh] w-full bg-[#F8FAFC] overflow-hidden ${className || ''}`}>
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
            className={`
                flex-shrink-0 bg-white border-b border-slate-200/60 
                px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 
                z-30 shadow-sm relative
                ${className || ''}
            `}
        >
            <div className="flex flex-col gap-0.5 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight truncate">{title}</h1>
                {subtitle && <p className="text-xs md:text-sm text-slate-500 font-medium truncate">{subtitle}</p>}
            </div>

            {/* Filter Area (The "Navbar" controls) */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
                {children}
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

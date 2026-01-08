import { motion } from "framer-motion";

interface KPICardProps {
    title: string;
    value: number | string;
    color: string;
    textColor: string;
    isPercent?: boolean; // Optional, can be used for styling if needed, currently unused but good for compatibility
}

export function KPICard({ title, value, color, textColor }: KPICardProps) {
    const formatted = typeof value === 'number'
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
        : value;

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.01 }}
            className={`rounded-2xl p-6 ${color} ${textColor} shadow-lg shadow-black/5 relative overflow-hidden flex flex-col justify-center h-32 border border-black/5`}
        >
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <span className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{title}</span>
            <span className="text-3xl font-bold tracking-tight">{formatted}</span>
        </motion.div>
    )
}

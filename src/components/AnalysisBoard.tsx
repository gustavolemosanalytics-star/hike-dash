"use client";

import { Insight } from "@/lib/insight-engine";
import { Lightbulb, AlertTriangle, TrendingUp, Info } from "lucide-react";
import { motion } from "framer-motion";

export function AnalysisBoard({ insights }: { insights: Insight[] }) {
    if (insights.length === 0) return null;

    return (
        <div className="glass-panel rounded-xl p-6 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-6 border-b border-black/5 pb-4">
                <div className="p-2 bg-accent/20 rounded-lg text-accent-foreground">
                    <Lightbulb className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold tracking-tight">Análise Inteligente</h2>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                {insights.map((insight, index) => (
                    <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`
               p-4 rounded-lg border flex gap-3 text-sm
               ${insight.type === 'positive' ? 'bg-green-50/50 border-green-100 text-green-900' : ''}
               ${insight.type === 'negative' ? 'bg-red-50/50 border-red-100 text-red-900' : ''}
               ${insight.type === 'alert' ? 'bg-amber-50/50 border-amber-100 text-amber-900' : ''}
               ${insight.type === 'neutral' ? 'bg-gray-50/50 border-gray-100 text-gray-700' : ''}
               hover:shadow-md transition-shadow cursor-default
             `}
                    >
                        <div className="shrink-0 mt-0.5">
                            {insight.type === 'positive' && <TrendingUp className="w-4 h-4 text-green-600" />}
                            {insight.type === 'negative' && <TrendingDownIcon className="w-4 h-4 text-red-600" />}
                            {insight.type === 'alert' && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                            {insight.type === 'neutral' && <Info className="w-4 h-4 text-gray-500" />}
                        </div>
                        <div>
                            <h4 className="font-semibold mb-1">{insight.title}</h4>
                            <p className="opacity-90 leading-relaxed text-xs">{insight.description}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

function TrendingDownIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
            <polyline points="17 18 23 18 23 12"></polyline>
        </svg>
    )
}

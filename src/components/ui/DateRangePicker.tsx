"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import 'react-day-picker/dist/style.css'; // Basic styles, we will override or wrapper

interface DateRangePickerProps {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    className?: string;
}

export function DateRangePicker({ date, setDate, className }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    // Close on click outside
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    return (
        <div className={`relative ${className}`} ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
            flex items-center gap-2 px-3 py-2 rounded-lg 
            bg-white/60 hover:bg-white/80 transition-colors 
            border border-white/20 text-sm font-medium text-foreground min-w-[240px] justify-start shadow-sm
          `}
            >
                <CalendarIcon className="w-4 h-4 text-secondary-foreground" />
                {date?.from ? (
                    date.to ? (
                        <>
                            {format(date.from, "dd/MM/yyyy")} -{" "}
                            {format(date.to, "dd/MM/yyyy")}
                        </>
                    ) : (
                        format(date.from, "dd/MM/yyyy")
                    )
                ) : (
                    <span className="text-muted-foreground">Selecionar período</span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 right-0 z-50 bg-[#0F172A] border border-white/10 rounded-xl shadow-2xl p-4 animate-in fade-in zoom-in-95 text-white">
                    <style>{`
              .rdp { --rdp-cell-size: 32px; --rdp-accent-color: #DCEEAA; --rdp-background-color: #DCEEAA; margin: 0; }
              .rdp-day_selected:not([disabled]) { font-weight: bold; background-color: #DCEEAA; color: #1A1A1A; }
              .rdp-day_selected:hover:not([disabled]) { background-color: #DCEEAA; color: #1A1A1A; }
              .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(255,255,255,0.1); }
              .rdp-caption_label { color: white; font-weight: 600; font-size: 0.9rem; }
              .rdp-head_cell { color: #9CA3AF; font-size: 0.75rem; font-weight: 500; }
              .rdp-day { color: white; font-size: 0.85rem; }
              .rdp-day_outside { opacity: 0.3; }
              .rdp-nav_button { color: white; }
            `}</style>
                    <DayPicker
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        locale={ptBR}
                        showOutsideDays={false}
                        components={{
                            IconLeft: () => <ChevronLeft className="w-4 h-4" />,
                            IconRight: () => <ChevronRight className="w-4 h-4" />
                        }}
                    />
                </div>
            )}
        </div>
    );
}

import { ChevronDown } from 'lucide-react';

interface FilterDropdownProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
}

export function FilterDropdown({ label, value, onChange, options }: FilterDropdownProps) {
    return (
        <div className="relative group">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {label}
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="
                        appearance-none w-full min-w-[140px]
                        bg-white/80 backdrop-blur-sm
                        hover:bg-white hover:shadow-md
                        px-4 py-2.5 pr-10
                        rounded-xl
                        text-sm font-medium text-slate-700
                        border border-slate-200/60
                        hover:border-[#DCEEAA]/50
                        focus:outline-none focus:ring-2 focus:ring-[#DCEEAA]/30 focus:border-[#DCEEAA]
                        cursor-pointer
                        transition-all duration-200
                        shadow-sm
                    "
                >
                    <option value="All">Todos</option>
                    {options.filter(opt => opt !== "All").map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-[#DCEEAA] transition-colors">
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>
        </div>
    )
}

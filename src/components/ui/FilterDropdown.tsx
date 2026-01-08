import { ChevronRight } from 'lucide-react';

interface FilterDropdownProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
}

export function FilterDropdown({ label, value, onChange, options }: FilterDropdownProps) {
    return (
        <div className="relative group">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="appearance-none bg-transparent hover:bg-black/5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground/80 focus:outline-none cursor-pointer pr-6 transition-colors border border-transparent hover:border-black/5"
            >
                <option value="All">Todos {label}s</option>
                {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                <ChevronRight className="w-3 h-3 rotate-90" />
            </div>
        </div>
    )
}

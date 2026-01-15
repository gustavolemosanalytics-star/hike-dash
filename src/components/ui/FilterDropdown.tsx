"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface FilterDropdownProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
}

export function FilterDropdown({ label, value, onChange, options }: FilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus input when dropdown opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
        const allOptions = ['All', ...options.filter(opt => opt !== 'All')];
        if (!search) return allOptions;
        const searchLower = search.toLowerCase();
        return allOptions.filter(opt =>
            opt.toLowerCase().includes(searchLower) || opt === 'All'
        );
    }, [options, search]);

    const displayValue = value === 'All' ? 'Todos' : value;

    const handleSelect = (opt: string) => {
        onChange(opt);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="relative" ref={ref}>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {label}
            </label>

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="
                    flex items-center justify-between gap-2 w-full min-w-[140px]
                    bg-white/80 backdrop-blur-sm
                    hover:bg-white hover:shadow-md
                    px-4 py-2.5
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
                <span className="truncate">{displayValue}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-full mt-2 left-0 z-50 w-full min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#DCEEAA]/30 focus:border-[#DCEEAA]"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
                                >
                                    <X className="w-3 h-3 text-slate-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-[200px] overflow-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                Nenhum resultado
                            </div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleSelect(opt)}
                                    className={`
                                        w-full px-4 py-2.5 text-left text-sm
                                        hover:bg-[#DCEEAA]/20
                                        transition-colors
                                        ${value === opt ? 'bg-[#DCEEAA]/30 font-medium' : ''}
                                    `}
                                >
                                    {opt === 'All' ? 'Todos' : opt}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

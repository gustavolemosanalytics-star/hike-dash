"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import { DateRange } from 'react-day-picker';

interface FilterContextType {
    selectedBU: string;
    setSelectedBU: (bu: string) => void;
    selectedProject: string;
    setSelectedProject: (proj: string) => void;
    selectedCluster: string;
    setSelectedCluster: (cluster: string) => void;
    selectedType: string;
    setSelectedType: (type: string) => void;
    selectedMacro: string;
    setSelectedMacro: (macro: string) => void;
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;

    // Global options (could be populated by data, but for simplicity we might just hold state here)
    // In a real app, options would likely come from the data source.
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
    const [selectedBU, setSelectedBU] = useState("All");
    const [selectedProject, setSelectedProject] = useState("All");
    const [selectedCluster, setSelectedCluster] = useState("All");
    const [selectedType, setSelectedType] = useState("All");
    const [selectedMacro, setSelectedMacro] = useState("All");
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    return (
        <FilterContext.Provider value={{
            selectedBU, setSelectedBU,
            selectedProject, setSelectedProject,
            selectedCluster, setSelectedCluster,
            selectedType, setSelectedType,
            selectedMacro, setSelectedMacro,
            dateRange, setDateRange
        }}>
            {children}
        </FilterContext.Provider>
    );
}

export function useFilters() {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
}

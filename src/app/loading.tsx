export default function Loading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#0F172A]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#DCEEAA] border-t-transparent"></div>
                <p className="text-sm font-medium text-gray-400 animate-pulse">Carregando dados...</p>
            </div>
        </div>
    );
}

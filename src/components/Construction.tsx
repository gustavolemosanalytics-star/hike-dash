export default function Construction({ title }: { title: string }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            <div className="flex h-[60vh] items-center justify-center border-2 border-dashed border-secondary/20 rounded-xl bg-surface/50">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🚧</span>
                    </div>
                    <h2 className="text-xl font-semibold">Em Desenvolvimento</h2>
                    <p className="text-muted-foreground max-w-sm mx-auto">Esta página faz parte do escopo do projeto e será detalhada nos próximos passos.</p>
                </div>
            </div>
        </div>
    );
}

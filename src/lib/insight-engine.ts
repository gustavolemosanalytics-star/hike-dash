export interface Insight {
    id: string;
    type: 'positive' | 'negative' | 'neutral' | 'alert' | 'info';
    title: string;
    description: string;
}

interface InsightContext {
    type: 'dashboard' | 'receivable' | 'payable';
    topClients?: { name: string; value: number }[];
    topBUs?: { name: string; value: number }[];
    trend?: { direction: 'up' | 'down' | 'flat'; percentage: number };
}

export function generateInsights(
    metrics: { receita?: number; despesa?: number; resultado?: number; margem?: number; recebido?: number; aReceber?: number; pago?: number; aPagar?: number },
    buData: { name: string; receita?: number; despesa?: number; resultado?: number; recebido?: number; aReceber?: number; pago?: number; aPagar?: number }[],
    context: InsightContext = { type: 'dashboard' }
): Insight[] {
    const insights: Insight[] = [];
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

    // 1. Context: DASHBOARD (Receitas vs Despesas)
    if (context.type === 'dashboard' && metrics.margem !== undefined) {
        // Margem Analysis
        if (metrics.margem < 0) {
            insights.push({
                id: 'margin-alert',
                type: 'alert',
                title: 'Margem Negativa',
                description: `A operação apresenta margem negativa de ${metrics.margem.toFixed(2)}%. Necessário revisão imediata de custos.`
            });
        } else if (metrics.margem > 20) {
            insights.push({
                id: 'margin-good',
                type: 'positive',
                title: 'Saúde Financeira',
                description: `Margem operacional robusta de ${metrics.margem.toFixed(1)}%, indicando boa eficiência.`
            });
        }

        // Top BU Analysis
        if (buData.length > 0) {
            const topRevenueBu = [...buData].sort((a, b) => (b.receita || 0) - (a.receita || 0))[0];
            const topResultBu = [...buData].sort((a, b) => (b.resultado || 0) - (a.resultado || 0))[0];

            if (topRevenueBu) {
                insights.push({
                    id: 'top-revenue-bu',
                    type: 'info',
                    title: 'Líder em Receita',
                    description: `A BU ${topRevenueBu.name} lidera a arrecadação com ${formatCurrency(topRevenueBu.receita || 0)}.`
                });
            }
            if (topResultBu && topResultBu.name !== topRevenueBu?.name) {
                insights.push({
                    id: 'top-result-bu',
                    type: 'positive',
                    title: 'Melhor Resultado',
                    description: `A BU ${topResultBu.name} gerou o melhor resultado líquido: ${formatCurrency(topResultBu.resultado || 0)}.`
                });
            }
        }
    }

    // 2. Context: RECEIVABLES (Contas a Receber)
    if (context.type === 'receivable' && metrics.aReceber !== undefined && metrics.recebido !== undefined) {
        const total = (metrics.recebido || 0) + (metrics.aReceber || 0);
        const pendingRatio = total ? (metrics.aReceber / total) * 100 : 0;

        if (pendingRatio > 40) {
            insights.push({
                id: 'high-pending',
                type: 'alert',
                title: 'Alto Volume a Receber',
                description: `${pendingRatio.toFixed(1)}% do faturamento previsto ainda está pendente (${formatCurrency(metrics.aReceber)}).`
            });
        } else {
            insights.push({
                id: 'good-collection',
                type: 'positive',
                title: 'Fluxo de Caixa',
                description: `Boa taxa de conversão de recebíveis, com apenas ${pendingRatio.toFixed(1)}% pendente.`
            });
        }

        // Top Client Analysis
        if (context.topClients && context.topClients.length > 0) {
            const topClient = context.topClients[0];
            insights.push({
                id: 'top-client',
                type: 'info',
                title: 'Principal Cliente',
                description: `${topClient.name} representa maior volume (Pago + Aberto) de ${formatCurrency(topClient.value)}.`
            });
        }
    }

    // 3. Context: PAYABLES (Contas a Pagar)
    if (context.type === 'payable' && metrics.aPagar !== undefined && metrics.pago !== undefined) {
        const total = (metrics.pago || 0) + (metrics.aPagar || 0); // Assuming absolute values passed

        insights.push({
            id: 'payable-overview',
            type: 'info',
            title: 'Visão de Desembolso',
            description: `Total de ${formatCurrency(total)} em obrigações, com ${formatCurrency(metrics.aPagar)} ainda em aberto.`
        });

        // Top Supplier Analysis
        if (context.topClients && context.topClients.length > 0) {
            const topSupplier = context.topClients[0];
            insights.push({
                id: 'top-supplier',
                type: 'neutral',
                title: 'Principal Fornecedor',
                description: `Maior concentração de despesas em ${topSupplier.name}: ${formatCurrency(topSupplier.value)}.`
            });
        }

        // Top Spending BU
        if (buData.length > 0) {
            const topSpender = [...buData].sort((a, b) => (b.pago || 0) + (b.aPagar || 0) - ((a.pago || 0) + (a.aPagar || 0)))[0];
            if (topSpender) {
                insights.push({
                    id: 'top-spender',
                    type: 'neutral',
                    title: 'Centro de Custo',
                    description: `BU ${topSpender.name} concentra o maior volume de despesas.`
                });
            }
        }
    }

    return insights;
}

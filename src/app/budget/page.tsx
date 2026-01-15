export const dynamic = 'force-dynamic';

import { fetchTransactions, fetchBudgetData } from "@/lib/data";
import { BudgetClient } from "@/components/BudgetClient";

export default async function Page() {
    const [transactions, budgetData] = await Promise.all([
        fetchTransactions(),
        fetchBudgetData()
    ]);
    return <BudgetClient transactions={transactions} budgetData={budgetData} />;
}

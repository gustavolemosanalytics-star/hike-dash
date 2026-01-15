export const dynamic = 'force-dynamic';

import { fetchTransactions } from "@/lib/data";
import { BudgetClient } from "@/components/BudgetClient";

export default async function Page() {
    const transactions = await fetchTransactions();
    return <BudgetClient transactions={transactions} />;
}

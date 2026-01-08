export const dynamic = 'force-dynamic';

import { fetchTransactions } from "@/lib/data";
import { MacroCategoriaClient } from "@/components/MacroCategoriaClient";

export default async function Page() {
    const transactions = await fetchTransactions();
    return <MacroCategoriaClient transactions={transactions} />;
}

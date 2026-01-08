export const dynamic = 'force-dynamic';

import { fetchTransactions } from "@/lib/data";
import { ProjetoClusterClient } from "@/components/ProjetoClusterClient";

export default async function Page() {
    const transactions = await fetchTransactions();
    return <ProjetoClusterClient transactions={transactions} />;
}

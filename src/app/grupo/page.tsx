export const dynamic = 'force-dynamic';

import { fetchTransactions } from "@/lib/data";
import { GrupoClient } from "@/components/GrupoClient";

export default async function Page() {
    const transactions = await fetchTransactions();
    return <GrupoClient transactions={transactions} />;
}

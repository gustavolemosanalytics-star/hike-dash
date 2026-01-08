export const dynamic = 'force-dynamic';

import { fetchTransactions } from "@/lib/data";
import { PessoasClient } from "@/components/PessoasClient";

export default async function Page() {
    const transactions = await fetchTransactions();
    return <PessoasClient transactions={transactions} />;
}

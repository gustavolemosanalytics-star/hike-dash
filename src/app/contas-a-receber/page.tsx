import { fetchTransactions } from "@/lib/data";
import { ContasAReceberClient } from "@/components/ContasAReceberClient";

export default async function ContasAReceberPage() {
    const transactions = await fetchTransactions();

    return (
        <ContasAReceberClient transactions={transactions} />
    );
}

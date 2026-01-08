import { fetchTransactions } from "@/lib/data";
import { ContasAPagarClient } from "@/components/ContasAPagarClient";

export default async function ContasAPagarPage() {
    const transactions = await fetchTransactions();

    return (
        <ContasAPagarClient transactions={transactions} />
    );
}

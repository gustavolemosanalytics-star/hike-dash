import { fetchTransactions } from "@/lib/data";
import { ContasAPagarClient } from "@/components/ContasAPagarClient";

export default async function ContasAPagarPage() {
    const transactions = await fetchTransactions();

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <ContasAPagarClient transactions={transactions} />
        </div>
    );
}

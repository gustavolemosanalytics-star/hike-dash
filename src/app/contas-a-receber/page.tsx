import { fetchTransactions } from "@/lib/data";
import { ContasAReceberClient } from "@/components/ContasAReceberClient";

export default async function ContasAReceberPage() {
    const transactions = await fetchTransactions();

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <ContasAReceberClient transactions={transactions} />
        </div>
    );
}

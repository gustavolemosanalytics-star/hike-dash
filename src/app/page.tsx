import { fetchTransactions } from "@/lib/data";
import { DashboardClient } from "@/components/DashboardClient";

export default async function Home() {
  const transactions = await fetchTransactions();

  return (
    <div className="max-w-[1600px] mx-auto">
      <DashboardClient transactions={transactions} />
    </div>
  );
}

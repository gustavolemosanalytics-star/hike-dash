import { fetchTransactions } from "@/lib/data";
import { DashboardClient } from "@/components/DashboardClient";

export default async function Home() {
  const transactions = await fetchTransactions();

  return (
    <DashboardClient transactions={transactions} />
  );
}

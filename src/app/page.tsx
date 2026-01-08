import { fetchTransactions } from "@/lib/data";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const transactions = await fetchTransactions();

  return (
    <DashboardClient transactions={transactions} />
  );
}

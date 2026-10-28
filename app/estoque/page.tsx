import StockClient from "@/components/StockClient";

export const metadata = { title: "Estoque — Festa 3D" };

export default function StockPage() {
  return (
    <main className="container" data-step="1">
      <StockClient />
    </main>
  );
}

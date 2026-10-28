import VenuesClient from "@/components/VenuesClient";

export const metadata = { title: "Locais — Festa 3D" };

export default function VenuesPage() {
  return (
    <main className="container" data-step="2">
      <VenuesClient />
    </main>
  );
}

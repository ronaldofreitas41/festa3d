import EventsClient from "@/components/EventsClient";

export const metadata = { title: "Festas — Festa 3D" };

export default function EventsPage() {
  return (
    <main className="container" data-step="3">
      <EventsClient />
    </main>
  );
}

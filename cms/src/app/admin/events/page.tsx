import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { getSession, isStaff } from "@/lib/auth";
import { PageHead, ACard } from "@/components/admin-ui";
import { Calendar } from "lucide-react";
import { CreateEventModal, EventCard, type EventRow } from "./forms";

export const dynamic = "force-dynamic";

async function loadEvents(): Promise<{ rows: EventRow[]; error: string | null }> {
  try {
    const rows = await query<EventRow>(
      `SELECT id, title, description, image, location, visible,
              DATE_FORMAT(event_date, '%Y-%m-%dT%H:%i') AS event_input,
              DATE_FORMAT(event_date, '%d/%m/%Y · %H:%i') AS event_display
         FROM cms_events
        ORDER BY (event_date IS NULL), event_date DESC, id DESC`,
    );
    return { rows, error: null };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

export default async function EventsAdminPage() {
  const session = await getSession();
  if (!session || !isStaff(session.rank)) redirect("/");

  const { rows, error } = await loadEvents();

  return (
    <div>
      <PageHead eyebrow="Comunidad" title="Eventos">
        <CreateEventModal />
      </PageHead>

      <div className="mt-4 space-y-3">
        {error ? (
          <ACard>
            <p className="text-sm adim">
              La tabla de eventos no está disponible en esta base de datos.
              <span className="mt-1 block text-xs opacity-70">{error}</span>
            </p>
          </ACard>
        ) : rows.length === 0 ? (
          <ACard title="Eventos" icon={<Calendar size={16} strokeWidth={2} />}>
            <p className="text-sm adim">
              Todavía no hay eventos. Crea el primero con el formulario de arriba.
            </p>
          </ACard>
        ) : (
          <>
            <p className="aeyebrow px-1">
              {rows.length} {rows.length === 1 ? "evento" : "eventos"}
            </p>
            {rows.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

import { ComingSoon } from '@/components/clinic/ComingSoon'

export default function AgendaPage() {
  return (
    <ComingSoon
      sub="Semana 11 — 16 mayo 2026"
      title={
        <>
          <span style={{ fontStyle: 'italic', fontWeight: 300 }}>Agenda </span>de consultas
        </>
      }
      description="Calendario semanal con consultas, llamadas Zoom, primeras visitas y bloqueos. Drag-and-drop para reagendar. La especificación completa está en el prototipo clinic-more.jsx (Agenda)."
    />
  )
}

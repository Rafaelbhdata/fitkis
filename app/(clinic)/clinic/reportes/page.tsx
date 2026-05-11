import { ComingSoon } from '@/components/clinic/ComingSoon'

export default function ReportesPage() {
  return (
    <ComingSoon
      sub="Práctica · análisis 90 días"
      title={
        <>
          <span style={{ fontStyle: 'italic', fontWeight: 300 }}>Reportes </span>de práctica
        </>
      }
      description="KPIs trimestrales (pacientes activos, adherencia, pérdida media, retención), gráficas de altas/bajas, distribución de objetivos, top resultados y pacientes que requieren atención. Exporta CSV y reporte mensual PDF."
    />
  )
}

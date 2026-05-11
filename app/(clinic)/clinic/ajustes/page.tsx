import { ComingSoon } from '@/components/clinic/ComingSoon'

export default function AjustesPage() {
  return (
    <ComingSoon
      sub="Práctica · perfil y configuración"
      title={
        <>
          <span style={{ fontStyle: 'italic', fontWeight: 300 }}>Ajustes </span>de la consulta
        </>
      }
      description="Perfil profesional (cédula, especialidad, bio), datos del consultorio, alertas y umbrales (días sin registros, adherencia mínima), plantilla por defecto, suscripción, equipo y zona de riesgo."
    />
  )
}

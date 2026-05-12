import { ComingSoon } from '@/components/clinic/ComingSoon'

export default function BibliotecaPage() {
  return (
    <ComingSoon
      sub="Práctica · contenido reutilizable"
      title={
        <>
          <span style={{ fontStyle: 'italic', fontWeight: 300 }}>Biblioteca </span>de la consulta
        </>
      }
      description="Plantillas de dieta (déficit, mantenimiento, bariátrico), recetario, listas de compras, material educativo y mensajes guardados con auto-rellenado del nombre del paciente."
    />
  )
}

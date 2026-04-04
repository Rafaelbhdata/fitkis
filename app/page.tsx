import { redirect } from 'next/navigation'

export default function Home() {
  // Por ahora redirigimos al dashboard
  // Cuando auth esté implementado, verificaremos la sesión
  redirect('/dashboard')
}

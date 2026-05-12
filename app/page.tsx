import { redirect } from 'next/navigation'

// Root → login. El middleware enruta después según el rol:
//   practitioner -> /clinic
//   otro         -> /download (la app del paciente vive en otro lado)
export default function Home() {
  redirect('/login')
}

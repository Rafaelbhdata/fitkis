import { ClinicSidebar } from '@/components/clinic/Sidebar'

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <ClinicSidebar />
      <main className="md:ml-[240px]" style={{ minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}

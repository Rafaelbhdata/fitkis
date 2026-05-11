import { ClinicSidebar } from '@/components/clinic/Sidebar'
import { MockBanner } from '@/components/clinic/MockBanner'

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <MockBanner />
      <ClinicSidebar />
      <main className="md:ml-[240px]" style={{ minHeight: 'calc(100vh - 36px)' }}>
        {children}
      </main>
    </div>
  )
}

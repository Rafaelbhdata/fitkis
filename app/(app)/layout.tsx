import Header from '@/components/ui/Header'
import Sidebar from '@/components/ui/Sidebar'
import CoachBubble from '@/components/coach/CoachBubble'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar - hidden on mobile, visible on md+ */}
      <Sidebar streak={5} />

      {/* Mobile Header - visible on mobile, hidden on md+ */}
      <Header streak={5} />

      {/* Main Content - offset for sidebar on desktop */}
      <main className="md:pl-sidebar">
        {/* Mobile: top padding for header, horizontal padding */}
        {/* Desktop: no top padding needed, more horizontal padding */}
        <div className="pt-16 md:pt-0 px-4 md:px-6 pb-6">
          <div className="max-w-5xl mx-auto md:py-6">
            {children}
          </div>
        </div>
      </main>

      {/* Coach AI Floating Button */}
      <CoachBubble />
    </div>
  )
}

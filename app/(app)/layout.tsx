import Header from '@/components/ui/Header';
import Sidebar from '@/components/ui/Sidebar';
import { MobileDock } from '@/components/MobileDock';
import CoachBubble from '@/components/coach/CoachBubble';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop Sidebar - hidden on mobile, visible on md+ */}
      <Sidebar streak={5} />

      {/* Mobile Header - visible on mobile, hidden on md+ */}
      <Header streak={5} />

      {/* Main Content - offset for sidebar on desktop, dock on mobile */}
      <main className="md:pl-sidebar">
        {/* Mobile: top padding for header, bottom for dock */}
        {/* Desktop: no top/bottom padding needed */}
        <div className="pt-16 md:pt-0 px-4 md:px-6 pb-24 md:pb-6">
          <div className="max-w-5xl mx-auto md:py-6">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Dock - floating pill navigation */}
      <MobileDock />

      {/* Coach AI Floating Button */}
      <CoachBubble />
    </div>
  );
}

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

      {/* Mobile Status Bar - mimics iOS status bar area */}
      <div className="fixed top-0 left-0 right-0 h-11 bg-paper z-20 md:hidden safe-top" />

      {/* Main Content */}
      <main className="md:pl-sidebar">
        {/* Mobile: top padding for status bar, bottom for dock */}
        <div className="pt-11 md:pt-0 pb-24 md:pb-6 md:px-6">
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

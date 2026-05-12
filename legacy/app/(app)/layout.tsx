import Sidebar from '@/components/ui/Sidebar';
import Header from '@/components/ui/Header';
import { MobileDock } from '@/components/MobileDock';
import CoachBubble from '@/components/coach/CoachBubble';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import OfflineToast from '@/components/ui/OfflineToast';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop Sidebar - hidden on mobile, visible on md+ */}
      <Sidebar />

      {/* Mobile Header with hamburger menu - visible on mobile only */}
      <Header />

      {/* Main Content */}
      <main className="md:pl-sidebar">
        {/* Mobile: top padding for header, bottom for dock */}
        <div className="pt-14 md:pt-0 pb-24 md:pb-6 md:px-6">
          <div className="max-w-5xl mx-auto md:py-6">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </div>
      </main>

      {/* Mobile Dock - floating pill navigation */}
      <MobileDock />

      {/* Coach AI Floating Button */}
      <CoachBubble />

      {/* Offline Status Toast */}
      <OfflineToast />
    </div>
  );
}

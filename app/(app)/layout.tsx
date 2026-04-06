import { BottomNav } from '@/components/ui/BottomNav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen pb-24">
      <main className="px-5 py-6 safe-top max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

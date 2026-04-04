import { BottomNav } from '@/components/ui/BottomNav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen pb-20">
      <main className="px-4 py-6 safe-top">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

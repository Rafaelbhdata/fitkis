import { BottomNav } from '@/components/ui/BottomNav'
import Header from '@/components/ui/Header'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen pb-24">
      <Header streak={5} />
      <main className="pt-20 px-5 pb-6 max-w-lg mx-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

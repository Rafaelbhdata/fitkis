import Link from 'next/link'
import { ArrowLeft, Plus, Star } from 'lucide-react'

export default function FavoritesPage() {
  // Datos simulados
  const favorites: Array<{ id: string; name: string; meal: string }> = []

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/food" className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="font-display text-2xl font-bold">Favoritos</h1>
      </header>

      {favorites.length > 0 ? (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div key={fav.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium">{fav.name}</p>
                <p className="text-sm text-muted capitalize">{fav.meal}</p>
              </div>
              <button className="p-2">
                <Star className="w-5 h-5 text-accent fill-accent" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center">
            <Star className="w-8 h-8 text-accent" />
          </div>
          <h2 className="font-display text-xl font-semibold mb-2">Sin favoritos</h2>
          <p className="text-muted mb-4">
            Guarda tus comidas frecuentes para agregarlas rápidamente
          </p>
        </div>
      )}

      <button className="w-full btn-primary flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" />
        Crear comida favorita
      </button>
    </div>
  )
}

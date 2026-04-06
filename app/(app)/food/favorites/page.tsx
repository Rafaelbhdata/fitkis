'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Star, Trash2, X, Search, ChevronDown, Minus, Check } from 'lucide-react'
import { FOOD_GROUP_LABELS, FOOD_EQUIVALENTS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import type { MealType, FoodGroup, FavoriteMeal, FavoriteMealItem } from '@/types'

const FOOD_EMOJIS: Record<FoodGroup, string> = {
  verdura: '🥬',
  fruta: '🍎',
  carb: '🍞',
  leguminosa: '🫘',
  proteina: '🥩',
  grasa: '🥑',
}

const MEAL_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  snack: 'Snack',
  comida: 'Comida',
  cena: 'Cena',
}

export default function FavoritesPage() {
  const { user } = useUser()
  const supabase = useSupabase()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [error, setError] = useState<string | null>(null)

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFavName, setNewFavName] = useState('')
  const [newFavMeal, setNewFavMeal] = useState<MealType>('desayuno')
  const [newFavItems, setNewFavItems] = useState<FavoriteMealItem[]>([])
  const [saving, setSaving] = useState(false)

  // Add item sub-modal
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<FoodGroup | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<{ name: string; portion: string } | null>(null)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (user) loadFavorites()
  }, [user])

  const loadFavorites = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('favorite_meals')
        .select('*')
        .order('created_at', { ascending: false })
      if (fetchError) throw fetchError
      if (data) setFavorites(data as FavoriteMeal[])
    } catch (err) {
      setError('Error al cargar favoritos')
    }
    setLoading(false)
  }

  const deleteFavorite = async (id: string) => {
    try {
      await (supabase.from('favorite_meals') as any).delete().eq('id', id)
      setFavorites(favorites.filter(f => f.id !== id))
      showToast('Favorito eliminado')
    } catch (err) {
      setError('Error al eliminar favorito')
    }
  }

  const openCreateModal = () => {
    setNewFavName('')
    setNewFavMeal('desayuno')
    setNewFavItems([])
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setNewFavName('')
    setNewFavItems([])
  }

  const openAddItemModal = () => {
    setSelectedGroup(null)
    setSelectedFood(null)
    setSearchQuery('')
    setQuantity(1)
    setShowAddItemModal(true)
  }

  const closeAddItemModal = () => {
    setShowAddItemModal(false)
    setSelectedGroup(null)
    setSelectedFood(null)
    setSearchQuery('')
  }

  const addItemToFavorite = () => {
    if (!selectedGroup || !selectedFood) return
    setNewFavItems([
      ...newFavItems,
      {
        group_type: selectedGroup,
        quantity: quantity,
        food_name: selectedFood.name,
      },
    ])
    closeAddItemModal()
  }

  const removeItemFromFavorite = (index: number) => {
    setNewFavItems(newFavItems.filter((_, i) => i !== index))
  }

  const saveFavorite = async () => {
    if (!user || !newFavName || newFavItems.length === 0) return
    setSaving(true)
    try {
      const { error: saveError } = await (supabase.from('favorite_meals') as any).insert({
        user_id: user.id,
        name: newFavName,
        meal: newFavMeal,
        items: newFavItems,
      })
      if (saveError) throw saveError
      await loadFavorites()
      closeCreateModal()
      showToast(`Favorito "${newFavName}" creado`)
    } catch (err) {
      setError('Error al guardar favorito')
    }
    setSaving(false)
  }

  const filteredFoods = selectedGroup
    ? FOOD_EQUIVALENTS[selectedGroup].filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-center gap-4 pt-2">
        <Link href="/food" className="btn-icon -ml-2" aria-label="Volver">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-display-sm">Favoritos</h1>
          <p className="text-xs text-muted-foreground">
            {favorites.length} {favorites.length === 1 ? 'comida guardada' : 'comidas guardadas'}
          </p>
        </div>
      </header>

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-danger hover:text-danger/80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {favorites.length > 0 ? (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div key={fav.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <p className="font-medium">{fav.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {MEAL_LABELS[fav.meal]}
                  </p>
                </div>
                <button
                  onClick={() => deleteFavorite(fav.id)}
                  className="p-2 text-muted-foreground hover:text-danger transition-colors rounded-lg hover:bg-danger/10"
                  aria-label="Eliminar favorito"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {fav.items.map((item, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 rounded-lg bg-surface-elevated text-xs font-medium"
                  >
                    {FOOD_EMOJIS[item.group_type]} {item.food_name} ×{item.quantity}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Star className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="font-display text-display-xs mb-2">Sin favoritos</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Guarda tus comidas frecuentes para agregarlas rápidamente
          </p>
        </div>
      )}

      <button onClick={openCreateModal} className="w-full btn-primary">
        <Plus className="w-5 h-5" />
        Crear comida favorita
      </button>

      {/* Create Favorite Modal */}
      {showCreateModal && (
        <>
          <div className="overlay animate-fade-in" onClick={closeCreateModal} />
          <div className="sheet p-5 animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-display-sm">Nuevo Favorito</h2>
              <button onClick={closeCreateModal} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="label">Nombre</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Mi desayuno favorito"
                  value={newFavName}
                  onChange={(e) => setNewFavName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Comida</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.entries(MEAL_LABELS) as [MealType, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setNewFavMeal(key)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        newFavMeal === key
                          ? 'bg-accent text-background'
                          : 'bg-surface-elevated border border-border'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Alimentos</label>
                {newFavItems.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {newFavItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated">
                        <span className="text-sm">
                          {FOOD_EMOJIS[item.group_type]} {item.food_name} ×{item.quantity}
                        </span>
                        <button
                          onClick={() => removeItemFromFavorite(index)}
                          className="p-1 text-muted-foreground hover:text-danger"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={openAddItemModal}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Agregar alimento
                </button>
              </div>

              <button
                onClick={saveFavorite}
                disabled={saving || !newFavName || newFavItems.length === 0}
                className="w-full btn-primary"
              >
                {saving ? (
                  <div className="w-5 h-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
                ) : (
                  'Guardar Favorito'
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Item Sub-Modal */}
      {showAddItemModal && (
        <>
          <div className="overlay animate-fade-in z-[60]" onClick={closeAddItemModal} />
          <div className="sheet p-5 animate-slide-up z-[70]">
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-display-sm">
                {selectedFood ? selectedFood.name : selectedGroup ? `Agregar ${FOOD_GROUP_LABELS[selectedGroup]}` : 'Seleccionar grupo'}
              </h2>
              <button onClick={closeAddItemModal} className="btn-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!selectedGroup ? (
              /* Group Selection */
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(FOOD_GROUP_LABELS) as FoodGroup[]).map((group) => (
                  <button
                    key={group}
                    onClick={() => setSelectedGroup(group)}
                    className="p-4 rounded-xl bg-surface-elevated border border-border hover:border-accent transition-all text-left"
                  >
                    <span className="text-2xl mb-2 block">{FOOD_EMOJIS[group]}</span>
                    <p className="font-medium text-sm">{FOOD_GROUP_LABELS[group]}</p>
                  </button>
                ))}
              </div>
            ) : selectedFood ? (
              /* Quantity Selector */
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-5">Porción: {selectedFood.portion}</p>
                  <div className="flex items-center justify-center gap-5">
                    <button
                      onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                      className="w-12 h-12 rounded-lg bg-surface-elevated border border-border flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="font-display text-display-lg text-accent w-16 text-center tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 0.5)}
                      className="w-12 h-12 rounded-lg bg-accent text-background flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">equivalentes</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedFood(null)} className="flex-1 btn-secondary">
                    Cambiar
                  </button>
                  <button onClick={addItemToFavorite} className="flex-1 btn-primary">
                    <Check className="w-4 h-4 mr-1" />
                    Agregar
                  </button>
                </div>
              </div>
            ) : (
              /* Food Search */
              <div className="flex flex-col" style={{ maxHeight: 'calc(80vh - 160px)' }}>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Buscar alimento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <button
                  onClick={() => setSelectedGroup(null)}
                  className="mb-3 text-xs text-muted-foreground hover:text-accent flex items-center gap-1"
                >
                  <ChevronDown className="w-3 h-3 rotate-90" />
                  Cambiar grupo
                </button>

                <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                  {filteredFoods.length > 0 ? (
                    filteredFoods.map((food) => (
                      <button
                        key={food.name}
                        onClick={() => setSelectedFood(food)}
                        className="w-full text-left p-3 rounded-lg bg-surface-elevated hover:bg-surface-hover transition-colors active:scale-[0.99]"
                      >
                        <p className="font-medium text-sm">{food.name}</p>
                        <p className="text-xs text-muted-foreground">{food.portion}</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {searchQuery ? 'No se encontraron alimentos' : 'Escribe para buscar'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

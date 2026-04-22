'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Star, Trash2, X, Search, ChevronLeft, Minus, Check } from 'lucide-react'
import { FOOD_GROUP_LABELS } from '@/lib/constants'
import { useUser, useSupabase } from '@/lib/hooks'
import { useToast } from '@/components/ui/Toast'
import { PulseLine } from '@/components/ui/PulseLine'
import type { MealType, FoodGroup, FavoriteMeal, FavoriteMealItem, FoodEquivalent } from '@/types'

const FOOD_EMOJIS: Record<FoodGroup, string> = {
  verdura: '🥬',
  fruta: '🍎',
  carb: '🍞',
  leguminosa: '🫘',
  proteina: '🥩',
  grasa: '🥑',
}

const MEAL_OPTIONS: { key: MealType; label: string; emoji: string }[] = [
  { key: 'desayuno', label: 'Desayuno', emoji: '🌅' },
  { key: 'snack', label: 'Snack', emoji: '🍌' },
  { key: 'comida', label: 'Comida', emoji: '🍽️' },
  { key: 'cena', label: 'Cena', emoji: '🌙' },
]

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
  const [dbFoods, setDbFoods] = useState<FoodEquivalent[]>([])
  const [searchingFoods, setSearchingFoods] = useState(false)

  useEffect(() => {
    if (user) loadFavorites()
  }, [user])

  // Search foods from database
  const searchFoodsFromDB = async (group: FoodGroup, query: string) => {
    setSearchingFoods(true)
    try {
      let queryBuilder = (supabase as any).from('food_equivalents').select('*')

      switch (group) {
        case 'verdura': queryBuilder = queryBuilder.gt('verdura', 0); break
        case 'fruta': queryBuilder = queryBuilder.gt('fruta', 0); break
        case 'carb': queryBuilder = queryBuilder.gt('carb', 0); break
        case 'proteina': queryBuilder = queryBuilder.gt('proteina', 0); break
        case 'grasa': queryBuilder = queryBuilder.gt('grasa', 0); break
        case 'leguminosa': queryBuilder = queryBuilder.eq('category_smae', 'Leguminosas'); break
      }

      if (query.trim()) queryBuilder = queryBuilder.ilike('name', `%${query}%`)
      queryBuilder = queryBuilder.order('name').limit(50)

      const { data, error } = await queryBuilder
      if (error) throw error
      if (data) setDbFoods(data as FoodEquivalent[])
    } catch (err) {
      setDbFoods([])
    }
    setSearchingFoods(false)
  }

  useEffect(() => {
    if (selectedGroup && showAddItemModal) {
      const timer = setTimeout(() => searchFoodsFromDB(selectedGroup, searchQuery), 300)
      return () => clearTimeout(timer)
    } else {
      setDbFoods([])
    }
  }, [selectedGroup, searchQuery, showAddItemModal])

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
    setDbFoods([])
  }

  const addItemToFavorite = () => {
    if (!selectedGroup || !selectedFood) return
    setNewFavItems([
      ...newFavItems,
      { group_type: selectedGroup, quantity, food_name: selectedFood.name },
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
      showToast(`"${newFavName}" guardado`)
    } catch (err) {
      setError('Error al guardar favorito')
    }
    setSaving(false)
  }

  const filteredFoods = dbFoods.map(f => ({ name: f.name, portion: f.portion, note: f.category_smae }))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <PulseLine w={80} h={24} color="var(--signal)" strokeWidth={2} active />
          <p className="fk-mono text-sm text-ink-4">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-24 md:pb-8 px-4">
      {/* Header */}
      <header className="flex items-center gap-4 py-4">
        <Link
          href="/food"
          className="w-10 h-10 rounded-xl border border-ink-7 flex items-center justify-center hover:bg-paper-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-serif text-2xl">Comidas Favoritas</h1>
          <p className="text-xs text-ink-4">
            {favorites.length} {favorites.length === 1 ? 'guardada' : 'guardadas'}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-full bg-signal text-white text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </button>
      </header>

      {error && (
        <div className="mb-4 p-3 bg-berry-soft border border-berry/20 rounded-xl text-berry text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {favorites.length > 0 ? (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div key={fav.id} className="bg-white rounded-2xl border border-ink-7 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-honey fill-honey" />
                    <p className="font-medium">{fav.name}</p>
                  </div>
                  <p className="text-xs text-ink-4 mt-1 flex items-center gap-1">
                    {MEAL_OPTIONS.find(m => m.key === fav.meal)?.emoji}
                    {MEAL_OPTIONS.find(m => m.key === fav.meal)?.label}
                  </p>
                </div>
                <button
                  onClick={() => deleteFavorite(fav.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-4 hover:text-berry hover:bg-berry-soft transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {fav.items.map((item, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-lg bg-paper-2 text-xs font-medium"
                  >
                    {FOOD_EMOJIS[item.group_type]} {item.food_name} ×{item.quantity}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ink-7 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-honey-soft flex items-center justify-center">
            <Star className="w-8 h-8 text-honey" />
          </div>
          <h2 className="font-serif text-xl mb-2">Sin favoritos</h2>
          <p className="text-sm text-ink-4 mb-6">
            Guarda tus comidas frecuentes para agregarlas con un tap
          </p>
          <button
            onClick={openCreateModal}
            className="px-6 py-3 rounded-full bg-signal text-white text-sm font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear mi primer favorito
          </button>
        </div>
      )}

      {/* Create Favorite Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50" onClick={closeCreateModal} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-paper rounded-t-3xl border-t border-ink-7 shadow-2xl max-h-[90vh] overflow-hidden">
            <div className="p-5">
              <div className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />

              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-2xl">Nuevo Favorito</h2>
                <button onClick={closeCreateModal} className="w-10 h-10 rounded-full bg-paper-3 flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className="fk-mono text-[10px] text-ink-4 uppercase tracking-wider mb-2 block">Nombre</label>
                  <input
                    type="text"
                    className="w-full bg-white rounded-xl px-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
                    placeholder="Ej: Shake de proteína"
                    value={newFavName}
                    onChange={(e) => setNewFavName(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Meal Type */}
                <div>
                  <label className="fk-mono text-[10px] text-ink-4 uppercase tracking-wider mb-2 block">¿Para cuál comida?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {MEAL_OPTIONS.map((meal) => (
                      <button
                        key={meal.key}
                        onClick={() => setNewFavMeal(meal.key)}
                        className={`p-3 rounded-xl text-center transition-all ${
                          newFavMeal === meal.key
                            ? 'bg-ink text-paper'
                            : 'bg-white border border-ink-7 hover:bg-paper-2'
                        }`}
                      >
                        <span className="text-lg block mb-1">{meal.emoji}</span>
                        <span className="text-xs font-medium">{meal.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <label className="fk-mono text-[10px] text-ink-4 uppercase tracking-wider mb-2 block">Alimentos</label>
                  {newFavItems.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {newFavItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-paper-2">
                          <span className="text-sm">
                            {FOOD_EMOJIS[item.group_type]} {item.food_name} ×{item.quantity}
                          </span>
                          <button
                            onClick={() => removeItemFromFavorite(index)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-4 hover:text-berry"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={openAddItemModal}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-signal/30 text-sm font-medium text-signal hover:bg-signal-soft/30 transition-colors"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Agregar alimento
                  </button>
                </div>

                {/* Save Button */}
                <button
                  onClick={saveFavorite}
                  disabled={saving || !newFavName || newFavItems.length === 0}
                  className="w-full py-4 rounded-2xl bg-ink text-paper text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <div className="w-5 h-5 rounded-full border-2 border-paper border-t-transparent animate-spin mx-auto" />
                  ) : (
                    'Guardar Favorito'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Item Sub-Modal */}
      {showAddItemModal && (
        <>
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-[60]" onClick={closeAddItemModal} />
          <div className="fixed inset-x-0 bottom-0 z-[70] bg-paper rounded-t-3xl border-t border-ink-7 shadow-2xl max-h-[85vh] overflow-hidden">
            <div className="p-5">
              <div className="w-10 h-1 rounded-full bg-ink-6 mx-auto mb-5" />

              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-xl">
                  {selectedFood ? selectedFood.name : selectedGroup ? FOOD_GROUP_LABELS[selectedGroup] : 'Selecciona grupo'}
                </h2>
                <button onClick={closeAddItemModal} className="w-10 h-10 rounded-full bg-paper-3 flex items-center justify-center">
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
                      className="p-4 rounded-2xl bg-white border border-ink-7 hover:bg-paper-2 transition-all text-left"
                    >
                      <span className="text-2xl block mb-2">{FOOD_EMOJIS[group]}</span>
                      <p className="font-medium text-sm">{FOOD_GROUP_LABELS[group]}</p>
                    </button>
                  ))}
                </div>
              ) : selectedFood ? (
                /* Quantity Selector */
                <div className="space-y-6">
                  <div className="text-center py-4">
                    <p className="text-sm text-ink-4 mb-6">Porción: {selectedFood.portion}</p>
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                        className="w-14 h-14 rounded-2xl bg-paper-3 flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Minus className="w-6 h-6" />
                      </button>
                      <span className="font-serif text-6xl font-light w-20 text-center tabular-nums text-signal">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(quantity + 0.5)}
                        className="w-14 h-14 rounded-2xl bg-signal text-white flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                    <p className="text-xs text-ink-4 mt-2">equivalentes</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedFood(null)} className="flex-1 py-4 rounded-2xl border border-ink-7 text-sm font-medium hover:bg-paper-2">
                      Cambiar
                    </button>
                    <button onClick={addItemToFavorite} className="flex-1 py-4 rounded-2xl bg-ink text-paper text-sm font-semibold">
                      <Check className="w-4 h-4 inline mr-2" />
                      Agregar
                    </button>
                  </div>
                </div>
              ) : (
                /* Food Search */
                <div className="flex flex-col" style={{ maxHeight: 'calc(70vh - 180px)' }}>
                  <button onClick={() => setSelectedGroup(null)} className="text-sm text-signal mb-4 text-left hover:underline flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" />
                    Cambiar grupo
                  </button>

                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-4" />
                    <input
                      type="text"
                      className="w-full bg-white rounded-xl pl-12 pr-4 py-3 text-base border border-ink-7 focus:border-ink focus:ring-2 focus:ring-ink/10"
                      placeholder="Buscar alimento..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {/* Quick add generic */}
                  <button
                    onClick={() => setSelectedFood({ name: `1 ${FOOD_GROUP_LABELS[selectedGroup].toLowerCase()}`, portion: '1 equivalente' })}
                    className="mb-4 p-4 rounded-xl border-2 border-dashed border-signal/30 text-sm font-medium text-signal text-center hover:bg-signal-soft/30"
                  >
                    + Equivalente genérico
                  </button>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {searchingFoods ? (
                      <div className="flex items-center justify-center py-10">
                        <PulseLine w={60} h={18} color="var(--signal)" strokeWidth={1.5} active />
                      </div>
                    ) : filteredFoods.length > 0 ? (
                      filteredFoods.map((food, index) => (
                        <button
                          key={`${food.name}-${index}`}
                          onClick={() => setSelectedFood(food)}
                          className="w-full text-left p-4 rounded-xl bg-white border border-ink-7 hover:bg-paper-2 transition-colors"
                        >
                          <p className="font-medium">{food.name}</p>
                          <p className="text-sm text-ink-4">{food.portion}</p>
                        </button>
                      ))
                    ) : (
                      <p className="text-center text-ink-4 py-10">
                        {searchQuery ? 'No se encontraron alimentos' : 'Escribe para buscar'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

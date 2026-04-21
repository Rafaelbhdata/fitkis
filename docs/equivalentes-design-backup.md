# Equivalentes Page - Design Documentation (Backup antes de rediseño)

**Fecha:** 21 de abril 2026
**Archivo:** `app/(app)/equivalentes/page.tsx`
**Propósito:** Documentar el estado actual antes del rediseño con Claude Design

---

## Estructura de la Página

### Vistas Principales

1. **Vista Principal** (sin grupo seleccionado)
   - Header con título "Equivalentes" + botón "+" para crear alimento
   - Buscador global
   - Sección "Tus alimentos" (custom foods como badges)
   - Grid de cards por grupo alimenticio
   - Info card sobre SMAE

2. **Vista de Resultados de Búsqueda** (cuando globalSearch tiene texto)
   - Lista de resultados combinando custom foods + SMAE foods
   - Mensaje "No se encontró" con botón para crear

3. **Vista de Grupo** (cuando selectedGroup != null)
   - Header con emoji + nombre del grupo + botón back
   - Buscador dentro del grupo
   - Lista de alimentos con paginación
   - Botón "Cargar más"

4. **Modal de Detalle** (selectedFood != null)
   - Sheet desde abajo
   - Nombre, categoría SMAE
   - Porción con peso
   - Grid de equivalentes por grupo
   - Warning si tiene múltiples grupos

5. **Modal de Crear Alimento** (showCreateModal = true)
   - Formulario: nombre, grupo, porción, nota
   - Grid de selección de grupo con emojis

---

## Paleta de Colores por Grupo

```typescript
const FOOD_COLORS: Record<FoodGroup, string> = {
  verdura: '#22c55e',    // green-500
  fruta: '#f97316',      // orange-500
  carb: '#eab308',       // yellow-500
  leguminosa: '#a855f7', // purple-500
  proteina: '#ef4444',   // red-500
  grasa: '#3b82f6',      // blue-500
}
```

---

## Emojis por Grupo

```typescript
const FOOD_EMOJIS: Record<FoodGroup, string> = {
  verdura: '🥬',
  fruta: '🍎',
  carb: '🍞',
  leguminosa: '🫘',
  proteina: '🥩',
  grasa: '🥑',
}
```

---

## Descripciones de Grupos

```typescript
const GROUP_DESCRIPTIONS: Record<FoodGroup, string> = {
  verdura: 'Vegetales y hortalizas',
  fruta: 'Frutas frescas y secas',
  carb: 'Cereales, panes y tubérculos',
  leguminosa: 'Frijoles, lentejas y garbanzos',
  proteina: 'Carnes, huevos, lácteos y pescados',
  grasa: 'Aceites, nueces y aguacate',
}
```

---

## Componentes UI Usados

### Clases CSS del Sistema de Diseño
- `animate-fade-in` - Animación de entrada
- `font-display` - Fuente Outfit para títulos
- `text-display-md`, `text-display-sm` - Tamaños de título
- `text-muted-foreground` - Color de texto secundario
- `bg-surface-elevated` - Fondo elevado
- `bg-surface-hover` - Estado hover
- `border-border` - Border estándar
- `btn-primary` - Botón primario
- `btn-icon` - Botón de icono
- `input` - Input estándar
- `label` - Label estándar
- `overlay` - Fondo oscuro para modales
- `sheet` - Modal desde abajo
- `animate-slide-up` - Animación del sheet

### Iconos (lucide-react)
- `Search` - Buscador
- `X` - Cerrar/eliminar
- `Info` - Información
- `ChevronRight` - Flecha derecha / navegación
- `Plus` - Agregar
- `Check` - Confirmar

---

## Estados del Componente

```typescript
// Search state
globalSearch: string          // Texto del buscador global
globalResults: FoodEquivalent[] // Resultados de búsqueda
searchLoading: boolean        // Cargando búsqueda

// Group view state
selectedGroup: FoodGroup | null  // Grupo seleccionado
foods: FoodEquivalent[]       // Alimentos del grupo
loading: boolean              // Cargando grupo
selectedFood: FoodEquivalent | null // Alimento seleccionado para modal
groupCounts: Record<FoodGroup, number> // Conteo por grupo
totalInGroup: number          // Total en el grupo actual
loadingMore: boolean          // Cargando más (paginación)
groupSearch: string           // Búsqueda dentro del grupo

// Custom food state
customFoods: CustomFood[]     // Alimentos personalizados
showCreateModal: boolean      // Mostrar modal de crear
newFood: { name, portion, group, note } // Datos del nuevo alimento
saving: boolean               // Guardando nuevo alimento
```

---

## Flujo de Datos

### Carga Inicial
1. `loadGroupCounts()` - Cuenta alimentos por grupo desde Supabase
2. `loadCustomFoods()` - Carga alimentos del usuario si está logueado

### Búsqueda Global
1. Usuario escribe en buscador
2. Debounce de 300ms
3. `searchGlobal()` busca en `food_equivalents` con ILIKE
4. Combina resultados con `customFoods` filtrados
5. Muestra lista combinada

### Navegación a Grupo
1. Usuario hace click en card de grupo
2. `setSelectedGroup(group)`
3. `searchFoods()` carga primeros 100 alimentos
4. Muestra lista con paginación

### Paginación
1. Usuario hace click en "Cargar más"
2. `loadMore()` llama `searchFoods()` con `append: true`
3. Agrega alimentos a la lista existente

---

## Layouts y Espaciados

### Vista Principal
```
space-y-5           Espaciado vertical principal
p-4                 Padding de cards de grupo
rounded-xl          Border radius de cards
w-14 h-14           Tamaño de emoji container
text-2xl            Tamaño de emoji
```

### Lista de Alimentos
```
p-3                 Padding de cada item
rounded-lg          Border radius de items
space-y-2           Gap entre items
gap-2               Gap en grid
```

### Modales (Sheet)
```
p-5                 Padding del sheet
w-10 h-1            Indicador de drag (pill)
mb-5                Margin bottom del pill
rounded-xl          Border radius de secciones
grid-cols-2         Grid para equivalentes
grid-cols-3         Grid para selección de grupo
```

---

## Interacciones

### Hover States
- Cards de grupo: `hover:border-transparent`
- Items de alimento: `hover:bg-surface-hover`
- Botón cargar más: `hover:border-accent/50`

### Transiciones
- `transition-all` en la mayoría de elementos
- `transition-colors` para cambios de color
- `group-hover:translate-x-1` para flecha animada

---

## Responsive Behavior

La página actual es **mobile-first** sin breakpoints específicos:
- Ancho completo (`w-full`)
- Grid de 2 columnas para equivalentes en modal
- Grid de 3 columnas para selección de grupo

---

## Notas de Implementación

### Datos de Supabase
- Tabla `food_equivalents`: 2,537 alimentos SMAE
- Tabla `custom_foods`: Alimentos del usuario
- Búsqueda con `ILIKE` (case insensitive)
- Paginación con `.range(offset, offset + 99)`

### Performance
- Debounce de 300ms en búsquedas
- Carga de 100 items por página
- Conteos cargados una vez al mount

### Accesibilidad
- Botones con `type="button"` explícito
- `autoFocus` en inputs de búsqueda
- Click en overlay cierra modales

---

## Archivos Relacionados

- `lib/constants.ts` - `FOOD_GROUP_LABELS`
- `types/index.ts` - `FoodGroup`, `FoodEquivalent`, `CustomFood`
- `lib/hooks.ts` - `useSupabase`, `useUser`
- `components/ui/Toast.tsx` - `useToast`
- `components/ui/Sidebar.tsx` - Navegación con link a `/equivalentes`
- `components/ui/SideMenu.tsx` - Navegación móvil con link a `/equivalentes`

---

## Screenshots Mentales de la UI

### Vista Principal
```
┌─────────────────────────────────┐
│ Equivalentes              [+]  │
│ Busca o explora alimentos      │
├─────────────────────────────────┤
│ [🔍 Buscar cualquier alimento] │
├─────────────────────────────────┤
│ • Tus alimentos (3)            │
│ [🥩 Bistec] [🍞 Pan] [🥑 ...]  │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 🥬  Verduras           →   │ │
│ │     Vegetales y hortalizas │ │
│ │     234 alimentos          │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 🍎  Frutas              →  │ │
│ │     Frutas frescas y secas │ │
│ │     156 alimentos          │ │
│ └─────────────────────────────┘ │
│ ...                             │
├─────────────────────────────────┤
│ ℹ️ Sistema SMAE                │
│ Base de datos del Sistema...   │
└─────────────────────────────────┘
```

### Vista de Grupo (Proteínas)
```
┌─────────────────────────────────┐
│ 🥩 Proteínas                   │
│ 234 de 747 alimentos           │
├─────────────────────────────────┤
│ [←] [🔍 Buscar en proteínas]   │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Bistec de res         [1eq]│ │
│ │ 1 palma de la mano         │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ Pollo deshebrado      [1eq]│ │
│ │ 3/4 taza                   │ │
│ └─────────────────────────────┘ │
│ ...                             │
├─────────────────────────────────┤
│ [Cargar más (513 restantes)]   │
└─────────────────────────────────┘
```

### Modal de Detalle
```
┌─────────────────────────────────┐
│         ═══════                 │
├─────────────────────────────────┤
│ Yogurt Griego              [X] │
│ Leche con grasa                │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Porción (1 equivalente)    │ │
│ │ 1 botecito (150g)          │ │
│ │ Peso neto: 150g            │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ Equivalentes por porción:      │
│ ┌──────────┐ ┌──────────┐      │
│ │ 🥩 1     │ │ 🥑 1     │      │
│ │ Proteína │ │ Grasa    │      │
│ └──────────┘ └──────────┘      │
├─────────────────────────────────┤
│ ⚠️ Este alimento cuenta como  │
│    múltiples equivalentes.     │
└─────────────────────────────────┘
```

---

## Commits Relacionados

1. `9553ca0` - feat(equivalentes): add new equivalentes page
2. `51236a1` - feat(equivalentes): redesign with group-based navigation
3. `c33dfd0` - fix(equivalentes): add pagination for large food lists
4. `609d172` - feat(equivalentes): add global search and custom food creation

---

*Este documento sirve como referencia del estado actual antes del rediseño con Claude Design.*

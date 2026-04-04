# FitLife — CLAUDE.md

Este archivo es la fuente de verdad del proyecto.
**Regla #1:** Antes de escribir cualquier código, leer este archivo completo Y el `context.md`.
**Regla #2:** Al terminar cualquier tarea, actualizar el `context.md` con lo que se hizo.

---

## 🎯 Qué es este proyecto

App web personal de fitness y salud para un usuario que está bajando de peso.
Se usa principalmente desde el celular (diseño mobile-first).
Cuatro módulos principales: Gym Tracker, Alimentación por Equivalentes, Peso Corporal y Hábitos.

---

## 🧑 Perfil del usuario

- Hombre, 86 kg al inicio, 163 cm
- Meta: bajar de peso de forma sostenible
- IMC inicial: 32.4 (obesidad grado I)
- Entrena 4 días/semana con pesas (rutina Upper/Lower)
- Nivel: principiante retomando
- Gimnasio con: mancuernas, barra libre, máquinas guiadas, poleas/cables

---

## 🏗️ Stack tecnológico

- **Framework:** Next.js 14 (App Router)
- **Lenguaje:** TypeScript
- **UI:** Tailwind CSS
- **Base de datos:** Supabase (Postgres + Auth)
- **Deploy:** Vercel
- **Auth:** Supabase Auth (email/password)
- **Repo:** GitHub (rama principal: `main`)

---

## 📁 Estructura de carpetas

```
fitlife/
├── CLAUDE.md                  # Este archivo — no modificar sin razón
├── context.md                 # Estado actual del proyecto — actualizar siempre
├── .env.local                 # Variables de entorno — nunca commitear
├── .env.example               # Template de variables requeridas
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx         # Nav bottom mobile (4 tabs)
│   │   ├── dashboard/page.tsx
│   │   ├── gym/
│   │   │   ├── page.tsx               # Rutina del día
│   │   │   ├── session/[id]/page.tsx  # Tracker activo
│   │   │   └── history/page.tsx       # Historial y gráficas
│   │   ├── food/
│   │   │   ├── page.tsx               # Log del día por equivalentes
│   │   │   └── favorites/page.tsx     # Comidas favoritas guardadas
│   │   ├── weight/
│   │   │   └── page.tsx               # Registro y gráfica de peso
│   │   └── habits/
│   │       └── page.tsx               # Hábitos diarios y gráficas
├── components/
│   ├── ui/                    # Componentes base reutilizables
│   ├── gym/                   # Componentes del módulo gym
│   ├── food/                  # Componentes del módulo alimentación
│   └── habits/                # Componentes del módulo hábitos
├── lib/
│   ├── supabase.ts            # Cliente de Supabase
│   ├── utils.ts               # Helpers generales
│   └── constants.ts           # Datos estáticos (equivalentes, ejercicios, rutina)
└── types/
    └── index.ts               # Tipos TypeScript globales
```

---

## 🗄️ Schema de base de datos (Supabase/Postgres)

```sql
-- Sesiones de gym
CREATE TABLE gym_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  date DATE NOT NULL,
  routine_type TEXT NOT NULL, -- 'upper_a' | 'upper_b' | 'lower_a' | 'lower_b'
  cardio_minutes INTEGER,
  cardio_speed DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Series por ejercicio en cada sesión
CREATE TABLE session_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES gym_sessions(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  lbs DECIMAL,
  reps INTEGER,
  feeling TEXT, -- 'muy_pesado' | 'dificil' | 'perfecto' | 'ligero' | 'quiero_mas'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Registro de peso corporal
CREATE TABLE weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  date DATE NOT NULL,
  weight_kg DECIMAL NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log de alimentación por equivalentes
CREATE TABLE food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  date DATE NOT NULL,
  meal TEXT NOT NULL, -- 'desayuno' | 'snack' | 'comida' | 'cena'
  group_type TEXT NOT NULL, -- 'verdura' | 'fruta' | 'carb' | 'proteina' | 'grasa' | 'leguminosa'
  quantity DECIMAL NOT NULL,
  food_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comidas favoritas
CREATE TABLE favorite_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  meal TEXT NOT NULL,
  items JSONB NOT NULL, -- [{ group_type, quantity, food_name }]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hábitos definidos por el usuario
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'daily_check' | 'quantity' | 'weekly_frequency'
  target_value DECIMAL,
  unit TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log de hábitos completados
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  date DATE NOT NULL,
  value DECIMAL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**RLS (Row Level Security):** Habilitar en todas las tablas. Cada usuario solo puede SELECT/INSERT/UPDATE/DELETE sus propios registros (WHERE user_id = auth.uid()).

---

## 🏋️ Módulo Gym — Lógica de negocio

### Rutina semanal Upper/Lower

Ciclo fijo: Upper A → Lower A → Upper B → Lower B
Días de descanso: miércoles, sábado, domingo.

```
Lunes:     Upper A — Pecho, Hombro, Tríceps
Martes:    Lower A — Cuádriceps, Glúteos
Miércoles: Descanso
Jueves:    Upper B — Espalda, Bíceps
Viernes:   Lower B — Isquiotibiales, Glúteos, Core
```

### Ejercicios con sustituciones

#### UPPER A
1. Press de Banca — default: Smith Machine | sust: Mancuernas en banco, Máquina de pecho
2. Press Militar — default: Mancuernas | sust: Barra, Press Arnold, Máquina hombro
3. Aperturas Pec Deck — default: Máquina | sust: Mancuernas en banco, Poleas cruzadas
4. Elevaciones Laterales — default: Mancuernas | sust: Polea lateral, Máquina hombro lateral
5. Tríceps Polea Cuerda — default: Polea | sust: Extensión sobre cabeza, Fondos en banco

#### UPPER B
1. Jalón al Pecho — default: Polea | sust: Máquina jalón, Dominadas asistidas
2. Remo con Barra — default: Barra | sust: Máquina remo, Remo mancuerna dos manos
3. Remo Mancuerna 1 Mano — default: Mancuerna
4. Curl Bíceps — default: Barra | sust: Mancuernas alternas
5. Curl Martillo — default: Mancuernas

#### LOWER A
1. Sentadilla con Barra — default: Barra libre | sust: Smith, Prensa, Sentadilla goblet
2. Prensa de Pierna — default: Máquina
3. Extensión Cuádriceps — default: Máquina
4. Zancadas — default: Mancuernas
5. Elevación de Pantorrillas — default: Máquina | sust: Mancuernas de pie

#### LOWER B
1. Peso Muerto — default: Barra | sust: Mancuernas rumano, Hip hinge máquina
2. Curl Femoral — default: Máquina
3. Hip Thrust — default: Barra | sust: Mancuerna
4. Abducción de Cadera — default: Máquina
5. Plancha Abdominal — sin equipo
6. Crunch en Polea — default: Polea | sust: Crunch suelo, Crunch máquina

### Progresión automática de peso

- Comparar las últimas 2 sesiones del mismo tipo de rutina
- Si en AMBAS el usuario completó todas las series y todas las reps objetivo → sugerir +5 lbs
- Mostrar banner al inicio del ejercicio: "Completaste todo las últimas 2 veces. ¿Subimos a X lbs?"
- Usuario acepta o ignora — nunca forzar

### Historial de sesiones ya registradas (cargar como seed data)

**Sesión 1 — Upper A — 23 de marzo 2026**
- Press Banca (Smith): Serie1: 90lbs/-, Serie2: 80lbs/8, Serie3: 80lbs/7, Serie4: 80lbs/5 | Muy pesado
- Press Militar (Mancuernas): 20lbs × (12, 10, 10) | Difícil
- Pec Deck: 60lbs × (12, 12, 12) | Difícil
- Elevaciones Laterales: 10lbs × (12, 12, 12) | Difícil
- Tríceps Polea: Serie1: 40lbs/10, Serie2: 40lbs/6, Serie3: 30lbs/10 | Difícil

**Sesión 2 — Upper A — 3 de abril 2026**
- Press Banca (Mancuernas): 25lbs × (10, 10, 10, 10)
- Press Militar (Mancuernas): Serie1-3: 25lbs/10, Serie4: 25lbs/8
- Aperturas (Mancuernas banco): 20lbs × (12, 10, 10) | Difícil
- Elevaciones Laterales: 10lbs × (12, 12, 12)
- Tríceps Polea: Serie1-2: 30lbs/12, Serie3: 30lbs/8 | Difícil
- Cardio: 12 min caminadora 5.5 km/h

---

## 🥗 Módulo Alimentación — Lógica de negocio

### Presupuesto diario

| Grupo | Total/día | Nota |
|---|---|---|
| Verdura | 4 | |
| Fruta | 2 | |
| Carbohidratos | 4 | + 1 leguminosa separada |
| Leguminosa | 1 | ⅓ taza frijoles/lenteja/garbanzo/edamames/hummus |
| Proteína | 8 | Máx 2 lácteos/día |
| Grasa | 6 | 3 cocinar, 3 comer |

### Distribución por comida

| Comida | Verdura | Fruta | Carb | Leguminosa | Proteína | Grasa |
|---|---|---|---|---|---|---|
| Desayuno | — | — | — | — | 3 | — |
| Snack | — | 2 | 1 | — | — | 2 |
| Comida | 2 | — | 1 | 1 | 3 | 2 |
| Cena | 2 | — | 2 | — | 2 | 2 |

### Reglas especiales
- Yogurt griego = 1 proteína + 1 grasa (cuenta doble)
- Alcohol: 1 copa = 1 carbohidrato
- Si no cocina con aceite, puede usarlo como grasa para comer

### Base de datos de equivalentes (cargar en constants.ts)

```typescript
// FRUTAS
{ name: 'Agua de coco', portion: '1 bote' },
{ name: 'Arándanos deshidratados', portion: '¼ tza' },
{ name: 'Blueberries', portion: '½ taza' },
{ name: 'Cereza', portion: '8-10 pzas' },
{ name: 'Chabacano', portion: '2 pzas' },
{ name: 'Ciruela grande', portion: '1 pza' },
{ name: 'Dátil', portion: '2 pzas' },
{ name: 'Durazno', portion: '1 pza' },
{ name: 'Frambuesa', portion: '1 tza' },
{ name: 'Fresa', portion: '1 tza (6-8 pzas)' },
{ name: 'Guayaba', portion: '1 pza' },
{ name: 'Higo', portion: '3 pzas' },
{ name: 'Kiwi', portion: '2 pzas' },
{ name: 'Lichi', portion: '6 pzas' },
{ name: 'Mamey', portion: '¼ pza' },
{ name: 'Mandarina', portion: '2 pzas' },
{ name: 'Mango', portion: '½ pza' },
{ name: 'Manzana', portion: '1 pza' },
{ name: 'Melón', portion: '1 tza' },
{ name: 'Moras', portion: '1 tza' },
{ name: 'Naranja', portion: '2 pzas' },
{ name: 'Papaya', portion: '1 taza' },
{ name: 'Pera', portion: '1 pza' },
{ name: 'Pasitas', portion: '10 pzas' },
{ name: 'Piña', portion: '1 taza' },
{ name: 'Plátano', portion: '½ pza' },
{ name: 'Sandía', portion: '1 taza' },
{ name: 'Toronja', portion: '1 pza' },
{ name: 'Uvas', portion: '8-10 pzas' },
{ name: 'Mermelada natural', portion: '1 cda' },

// VERDURAS
{ name: 'Alcachofa', portion: '1 pza' },
{ name: 'Apio', portion: '2 pzas' },
{ name: 'Betabel', portion: '½ pza' },
{ name: 'Berenjena', portion: '1 pza' },
{ name: 'Brócoli', portion: '1 tza' },
{ name: 'Calabaza', portion: '1 pza' },
{ name: 'Champiñón', portion: '1 tza' },
{ name: 'Chayote', portion: '1 tza' },
{ name: 'Col', portion: '1 tza' },
{ name: 'Ejote', portion: '1 tza' },
{ name: 'Elotitos cambray', portion: '8 pzas' },
{ name: 'Espárragos', portion: '6 pzas' },
{ name: 'Espinaca cruda', portion: '3 tzas' },
{ name: 'Espinaca cocida', portion: '1 tza' },
{ name: 'Jícama', portion: '1 tza' },
{ name: 'Jitomate deshidratado', portion: '5 pzas' },
{ name: 'Jitomate bola', portion: '1 pza' },
{ name: 'Lechuga', portion: '3 tzas' },
{ name: 'Nopal', portion: '1 tza' },
{ name: 'Pepino', portion: '1 pza' },
{ name: 'Setas', portion: '1 tza' },
{ name: 'Zanahoria', portion: '2 pzas' },
{ name: 'Palmitos', portion: '6-8 pzas (1 lata)' },

// CARBOHIDRATOS
{ name: 'Arroz cocido (preferir integral)', portion: '½ tza' },
{ name: 'Avena cruda', portion: '⅓ tza' },
{ name: 'Avena cocida', portion: '½ tza' },
{ name: 'Bagel', portion: '½ pza' },
{ name: 'Bolillo sin migajón', portion: '½ pza' },
{ name: 'Pan hamburguesa', portion: '½ pza' },
{ name: 'Cereal integral de caja', portion: '1 tza' },
{ name: 'Chapata sin migajón', portion: '½ pza' },
{ name: 'Elote desgranado', portion: '½ tza' },
{ name: 'Elote entero', portion: '1 chico' },
{ name: 'Palomitas naturales', portion: '2 tzas' },
{ name: 'Pasta cocida', portion: '1 tza' },
{ name: 'Pan integral', portion: '1 pza' },
{ name: 'Pan árabe', portion: '½ pza' },
{ name: 'Pan de hot dog', portion: '½ pza' },
{ name: 'Papa cocida', portion: '1 pza chica' },
{ name: 'Papa cambray', portion: '4-5 pzas' },
{ name: 'Puré de papa', portion: '½ tza' },
{ name: 'Salmas', portion: '1 paquete' },
{ name: 'Tortilla maíz', portion: '1 pza' },
{ name: 'Tortilla nopal', portion: '2 pzas' },
{ name: 'Tostadas sanísimo', portion: '2 pzas' },
{ name: 'Rice cakes', portion: '2 pzas' },

// LEGUMINOSAS
{ name: 'Frijol cocido / lenteja', portion: '⅓ taza' },
{ name: 'Garbanzo cocido', portion: '1 tza' },
{ name: 'Hummus', portion: '⅓ tza' },
{ name: 'Edamames', portion: '⅓ tza' },

// PROTEÍNAS
{ name: 'Anillos de calamar', portion: '4 pzas' },
{ name: 'Atún en agua', portion: '1 lata' },
{ name: 'Bistec', portion: '1 palma de la mano' },
{ name: 'Carne molida', portion: '1 bola (pelota béisbol)' },
{ name: 'Carne deshebrada', portion: '¾ tza' },
{ name: 'Pollo deshebrado', portion: '¾ tza' },
{ name: 'Camarón U8', portion: '3 pzas' },
{ name: 'Camarón normal', portion: '6 pzas' },
{ name: 'Huevo', portion: '1 pza' },
{ name: 'Claras de huevo', portion: '2 pzas' },
{ name: 'Jamón', portion: '5 rebanadas' },
{ name: 'Jocoque', portion: '1 cda' },
{ name: 'Filete', portion: 'Palma de la mano' },
{ name: 'Pescado', portion: 'Palma de la mano con dedos' },
{ name: 'Pavo', portion: 'Palma de la mano con dedos' },
{ name: 'Salmón', portion: 'Palma de la mano con dedos' },
{ name: 'Queso cottage', portion: '2-3 cdas soperas' },
{ name: 'Queso panela/oaxaca/mozarella/feta', portion: 'Palma con dedos' },
{ name: 'Yogurt griego', portion: '1 botesito', note: 'Cuenta como 1 proteína + 1 grasa' },
{ name: 'Leche light', portion: '1 taza' },

// GRASAS
{ name: 'Aguacate', portion: '⅓ pza' },
{ name: 'Nueces/pistache/almendra/avellana/cacahuate natural', portion: '10-12 pzas' },
{ name: 'Aceitunas', portion: '4 pzas' },
{ name: 'Crema de avellana', portion: '1 cda' },
{ name: 'Crema de almendra', portion: '1 cda' },
{ name: 'Crema de cacahuate', portion: '1 cda' },
{ name: 'Jocoque', portion: '1 cda sopera' },
{ name: 'Chocolate amargo Turín sin azúcar', portion: '2 chiquitos' },
{ name: 'Queso cabra', portion: '⅓ barra chica' },
```

---

## ⚖️ Módulo Peso Corporal

- Registro manual: fecha + peso en kg
- Peso inicial: 86 kg
- Gráfica de tendencia semanal
- Indicador de cuánto ha bajado desde el inicio
- Proyección lineal a la meta
- Meta inicial sugerida: 79-80 kg

---

## 🧘 Módulo Hábitos

### Hábitos iniciales (cargar como seed para el usuario)

| Hábito | Tipo | Meta |
|---|---|---|
| Agua | Cantidad diaria | 2 litros/día |
| Lectura | Frecuencia semanal + duración | Usuario define minutos y días/semana |
| Creatina | Check diario | Tomada sí/no |

### Tipos de hábito soportados
- **daily_check:** sí/no (ej: Creatina)
- **quantity:** registra número con unidad (ej: litros de agua)
- **weekly_frequency:** cuántos días de la semana lo completó

### Funcionalidad
- CRUD completo: agregar, editar, desactivar hábitos
- Vista del día: todos los hábitos en una pantalla con checkboxes/inputs
- Gráficas por hábito: racha actual, % días completados en el mes, historial semanal

---

## 🤖 Sistema de agentes

**Regla universal para todos los agentes:**
1. Leer `CLAUDE.md` completo
2. Leer `context.md` completo
3. Ejecutar la tarea
4. Hacer commit con mensaje descriptivo
5. Actualizar `context.md` con lo que se hizo

### Agentes definidos

#### `agent:setup`
**Responsabilidad:** Inicialización del proyecto desde cero.
**Tareas:** Crear repo en GitHub, instalar dependencias (Next.js 14, Tailwind, Supabase client, TypeScript), configurar Supabase (proyecto + tablas + RLS), configurar Vercel, crear estructura de carpetas base, crear `.env.example`, cargar datos estáticos en `constants.ts` (equivalentes y ejercicios), crear `context.md` inicial.
**Cuándo usarlo:** Solo una vez al inicio.
**Commit al terminar:** `feat: project setup — Next.js, Supabase, Vercel configured`

#### `agent:db`
**Responsabilidad:** Base de datos y migraciones.
**Tareas:** Crear/modificar tablas, escribir migraciones SQL, definir RLS, crear índices de performance.
**Antes de actuar:** Leer schema en CLAUDE.md + estado de DB en context.md para no duplicar.
**Commit al terminar:** `feat(db): [descripción del cambio]`

#### `agent:auth`
**Responsabilidad:** Autenticación y sesión.
**Tareas:** Páginas de login/registro, middleware de rutas protegidas, manejo de sesión con Supabase Auth, redirect logic.
**Commit al terminar:** `feat(auth): login and register flow`

#### `agent:ui`
**Responsabilidad:** Sistema de diseño y componentes base.
**Lineamientos:** Mobile-first, tema oscuro, estética atlética. Fondo #0f0f0f, acento verde-lima (#e8ff47). Fuente display: Barlow Condensed. Fuente cuerpo: Barlow o similar. Nav bottom con 4 tabs: Dashboard, Gym, Food, Hábitos.
**Tareas:** Tokens de diseño (colores, tipografía, espaciado), componentes base (Button, Input, Card, Modal, ProgressBar, BottomNav), estados de carga y error.
**Commit al terminar:** `feat(ui): design system and base components`

#### `agent:gym`
**Responsabilidad:** Módulo gym completo.
**Tareas:** Pantalla "rutina del día" (qué toca hoy), tracker activo de sesión (series, reps, lbs, feeling, timer descanso), lógica de sustitución de ejercicios, lógica de progresión automática (+5 lbs), historial de sesiones, gráfica de progresión por ejercicio, seed de las 2 sesiones ya registradas.
**Antes de actuar:** Leer sección Módulo Gym completa incluyendo historial de sesiones.
**Commit al terminar:** `feat(gym): [feature específico]`

#### `agent:food`
**Responsabilidad:** Módulo de alimentación por equivalentes.
**Tareas:** Vista del día dividida en 4 comidas, búsqueda de alimentos en lista de equivalentes, sistema de favoritos (guardar y usar de un tap), barras de progreso por grupo, resumen del día.
**Antes de actuar:** Leer sección Módulo Alimentación completa incluyendo toda la base de equivalentes.
**Commit al terminar:** `feat(food): [feature específico]`

#### `agent:weight`
**Responsabilidad:** Módulo de peso corporal.
**Tareas:** Formulario de registro, gráfica de tendencia, cálculo de progreso desde inicio (86 kg), proyección a meta.
**Commit al terminar:** `feat(weight): weight tracking module`

#### `agent:habits`
**Responsabilidad:** Módulo de hábitos.
**Tareas:** CRUD de hábitos, log diario, gráficas de racha y progreso, vista resumen del día, seed de hábitos iniciales (agua, lectura, creatina).
**Commit al terminar:** `feat(habits): habits module`

#### `agent:dashboard`
**Responsabilidad:** Pantalla principal integrando todos los módulos.
**Tareas:** Resumen del día (rutina de hoy, equivalentes restantes por grupo, agua, hábitos pendientes, peso más reciente).
**Depende de:** gym, food, weight y habits al menos parcialmente implementados.
**Commit al terminar:** `feat(dashboard): main dashboard`

#### `agent:fix`
**Responsabilidad:** Corrección de bugs puntuales.
**Antes de actuar:** Leer context.md para entender estado actual, reproducir el bug.
**Commit al terminar:** `fix: [descripción del bug] — causa: [causa raíz]`

---

## 📋 context.md — Estructura requerida

```markdown
# FitLife — Context

## Estado general
[qué está listo ✅, en progreso 🔄, pendiente ⏳]

## Último agente
Agente: [nombre]
Fecha: [fecha]
Qué hizo: [descripción]

## Módulos
### Setup: [estado]
### Auth: [estado]
### UI: [estado]
### Gym: [estado]
### Food: [estado]
### Weight: [estado]
### Habits: [estado]
### Dashboard: [estado]

## Schema actual
[Diferencias vs CLAUDE.md si las hay]

## Variables de entorno requeridas
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

## Repositorio
URL: https://github.com/[usuario]/fitlife

## Deploy
URL Vercel: [url]

## Bugs conocidos / deuda técnica
[lista]

## Próximos pasos recomendados
[lista ordenada]
```

---

## 🚀 Orden de desarrollo recomendado

1. `agent:setup` — Repo, estructura, Supabase, Vercel
2. `agent:db` — Todas las tablas + RLS
3. `agent:ui` — Sistema de diseño y componentes base
4. `agent:auth` — Login y registro
5. `agent:gym` — Módulo gym (el más crítico)
6. `agent:food` — Módulo alimentación
7. `agent:habits` — Módulo hábitos
8. `agent:weight` — Módulo peso
9. `agent:dashboard` — Dashboard final

---

## 🔧 Variables de entorno requeridas

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Crear `.env.local` con estos valores. **Nunca commitear este archivo** (incluirlo en `.gitignore`).

---

## 📌 Decisiones de arquitectura

- **Next.js 14 App Router:** Mejor soporte de Server Components y layouts anidados
- **Supabase:** Auth + Postgres + SDK en un solo servicio, tier gratuito generoso
- **Datos estáticos en constants.ts:** Equivalentes y ejercicios no cambian frecuentemente, no necesitan DB
- **RLS en Supabase:** Seguridad a nivel de base de datos, cada usuario solo ve sus datos
- **Mobile-first:** El usuario usa la app en el gym desde el celular — prioridad absoluta
- **Sistema de agentes:** Separación de responsabilidades, cada agente lee contexto antes de actuar y documenta al terminar, garantizando que el proyecto pueda retomarse en cualquier momento sin perder estado

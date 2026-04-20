# Registro de nivel de energía diario

## Alcance de repositorio (override)

- Este documento asume repositorios individuales (sin Turborepo).
- La implementación descrita aquí corresponde al repo `mochi-mobile`.

## Estado actual

La tabla `energy_levels` existe en Supabase y el hook `useEnergyDaily` la consume
correctamente para calcular tendencias. Sin embargo, **no existe ninguna pantalla ni
componente que permita a la usuaria registrar su energía**. El hook siempre retorna
`todayEnergy: null` en producción porque nunca se insertan datos.

La tabla `energy_levels` se usa en:
- `useEnergyDaily.ts` — lectura de tendencia
- `app/weekly-planner.tsx` — como señal para la IA del planner semanal
- `app/study-create.tsx` — como señal para el laboratorio de energía

Sin datos, el Weekly Planner recibe arrays vacíos y el Laboratorio de Energía asume
estado neutral en todos los cálculos.

## Columnas de `energy_levels`

```sql
id           uuid PK
user_id      uuid FK → profiles.id
logged_date  date
overall_rating  integer CHECK (1 ≤ overall_rating ≤ 5)
notes        text nullable
created_at   timestamptz
```

Existe UNIQUE(user_id, logged_date) para upsert diario.

## Objetivo

Crear un widget de registro de energía que se integre en:
1. El **dashboard home** como una tarjeta diaria (si el módulo `mood_enabled` está activo,
   aprovechar la misma sesión de check-in).
2. La **pantalla de ánimo** (`app/(tabs)/mood.tsx`) — registrar energía junto con el mood.

## Opción recomendada: integrar en `mood.tsx`

La fase de ciclo, el ánimo y la energía son tres señales de bienestar que la usuaria ya
registra en el mismo contexto. Agregar un selector de energía en la misma pantalla es la
menor fricción posible.

### Cambios en `app/(tabs)/mood.tsx`

Agregar estado:

```typescript
const [energyRating, setEnergyRating] = useState<number | null>(null);
```

Agregar bloque visual después del selector de ánimo y antes del campo de nota:

```tsx
<View className="mt-4">
  <Text className="mb-2 text-sm font-bold text-orange-900">
    Nivel de energía hoy
  </Text>
  <View className="flex-row justify-between">
    {[1, 2, 3, 4, 5].map((level) => {
      const isSelected = energyRating === level;
      const label = ["Agotada", "Baja", "Regular", "Bien", "Llena"][level - 1];
      return (
        <TouchableOpacity
          key={level}
          className={`flex-1 mx-0.5 items-center rounded-2xl py-3 border-2 ${
            isSelected
              ? "border-orange-500 bg-orange-200"
              : "border-orange-200 bg-orange-50"
          }`}
          onPress={() => setEnergyRating(level)}
        >
          <Text className="text-lg font-extrabold text-orange-900">
            {level}
          </Text>
          <Text className="text-[10px] font-semibold text-orange-700 text-center">
            {label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>
```

### Persistir energía al guardar ánimo

Dentro de `handleSaveMood`, después de guardar `mood_logs`, agregar:

```typescript
if (energyRating !== null) {
  const { error: energyError } = await supabase
    .from("energy_levels")
    .upsert(
      {
        user_id: userId,
        logged_date: todayISO,
        overall_rating: energyRating,
        notes: null,
      },
      { onConflict: "user_id,logged_date" },
    );

  if (energyError) {
    console.error("[Mood] error guardando nivel de energía:", energyError.message);
    // No bloquear — el mood ya se guardó
  }
}
```

### Cargar energía del día al cargar la pantalla

Dentro de `loadMoodData`, junto a la carga de `mood_logs`:

```typescript
const { data: energyData } = await supabase
  .from("energy_levels")
  .select("overall_rating")
  .eq("user_id", userId)
  .eq("logged_date", todayISO)
  .maybeSingle();

setEnergyRating((energyData as { overall_rating: number } | null)?.overall_rating ?? null);
```

### Mostrar energía del día (estado readonly)

Cuando ya existe un registro y `!editingToday`:

```tsx
{todayEnergyRating && (
  <Text className="mt-2 text-sm font-semibold text-orange-800">
    Energía de hoy: {todayEnergyRating}/5
  </Text>
)}
```

## Alternativa: tarjeta en HomeDashboard

Si en el futuro se quiere separar el check-in de energía del ánimo, crear un componente
`EnergyCheckIn` como tarjeta compacta en el home:

```
src/features/home/components/EnergyCheckIn.tsx
```

Con los mismos 5 niveles, que haga upsert directo y sea dismiss-able una vez registrado
el día.

## Archivos a modificar

1. `app/(tabs)/mood.tsx` — agregar selector de energía + persistencia
2. `src/shared/hooks/useEnergyDaily.ts` — (sin cambios, ya funciona)

## Criterios de aceptación

- La usuaria puede registrar su energía (1-5) junto con su ánimo diario.
- El valor persiste en `energy_levels` con upsert por `(user_id, logged_date)`.
- Si la energía ya fue registrada hoy, se muestra el valor al entrar.
- Si falla el guardado de energía, el guardado de ánimo no se bloquea.
- El Weekly Planner y el Laboratorio de Energía en `study-create.tsx` reciben datos reales.
- Todo el copy está en español.
- No hay `any`, no hay `.then()`.

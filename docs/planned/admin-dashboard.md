# Dashboard admin para Doménica

## Alcance de repositorio (override)

- El proyecto ya no usa Turborepo: `mochi-mobile` y `mochi-web` son repos individuales.
- Este documento aplica al repo `mochi-web`; en `mochi-mobile` solo se consumen los cambios vía Supabase.

## Contexto

Doménica es superusuaria de Mochi con necesidades de administración:
- Gestionar las plantillas de vales (`voucher_templates`) — crear, editar, desactivar
- Ver estadísticas agregadas de uso de la plataforma (sin acceder a datos privados de usuarias)
- Gestionar el flag `partner_features_enabled` por usuario

El dashboard va en `mochi-web` (React + Vite + Tailwind v4 + shadcn/ui), protegido por
autenticación de Supabase y verificación de rol admin.

## Arquitectura de seguridad

**Nunca usar service role desde el cliente.** Todo acceso privilegiado va a través de
funciones `SECURITY DEFINER` en Postgres.

### Campo `is_admin` en `profiles`

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Solo Doménica tiene is_admin = true (actualizar manualmente por UUID)
UPDATE profiles SET is_admin = true WHERE id = '<uuid-de-domenica>';
```

### RLS para `voucher_templates`

```sql
-- Lectura pública (ya permitida para generar vales desde móvil)
CREATE POLICY "public_read_voucher_templates" ON voucher_templates
  FOR SELECT USING (true);

-- Escritura solo para admins
CREATE POLICY "admin_manage_voucher_templates" ON voucher_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
```

### RPCs para estadísticas agregadas

```sql
-- RPC: estadísticas globales (sin datos personales)
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_users',        (SELECT COUNT(*) FROM profiles),
    'active_users_7d',    (SELECT COUNT(DISTINCT user_id) FROM study_sessions
                           WHERE completed_at >= NOW() - INTERVAL '7 days'),
    'total_vouchers',     (SELECT COUNT(*) FROM vouchers),
    'redeemed_vouchers',  (SELECT COUNT(*) FROM vouchers WHERE is_redeemed = true),
    'total_recipes',      (SELECT COUNT(*) FROM recipes),
    'total_routines',     (SELECT COUNT(*) FROM routines),
    'avg_streak',         (SELECT ROUND(AVG(current_streak), 1) FROM streaks)
  );
$$;

GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;

-- RPC: verificar si el usuario autenticado es admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(is_admin, false)
  FROM profiles
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;
```

## Estructura en `mochi-web`

```
src/
  pages/
    admin/
      AdminLayout.tsx        ← sidebar + protección de ruta
      DashboardPage.tsx      ← estadísticas generales
      VouchersPage.tsx       ← CRUD de voucher_templates
  hooks/
    useAdminGuard.ts         ← verifica is_admin antes de renderizar
  lib/
    supabase.ts              ← cliente ya existente
```

## Componentes clave

### `useAdminGuard.ts`

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router";

export function useAdminGuard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function check() {
      const { data, error } = await supabase.rpc("is_current_user_admin");
      if (error || !data) {
        navigate("/", { replace: true });
        return;
      }
      setIsAdmin(true);
    }
    void check();
  }, [navigate]);

  return isAdmin;
}
```

### `AdminLayout.tsx`

Sidebar con links a:
- Estadísticas
- Plantillas de vales
- (futuro) Gestión de usuarios

Protección:

```typescript
const isAdmin = useAdminGuard();
if (isAdmin === null) return <LoadingSpinner />;
if (!isAdmin) return null; // redirect ya ocurrió
```

### `DashboardPage.tsx`

```typescript
const { data: stats } = await supabase.rpc("get_platform_stats");
```

Muestra tarjetas con:
- Usuarias totales
- Usuarias activas (7 días)
- Vales generados / canjeados
- Recetas totales
- Racha promedio

### `VouchersPage.tsx`

CRUD completo de `voucher_templates`:

**Listar:**
```typescript
const { data } = await supabase
  .from("voucher_templates")
  .select("*")
  .order("points_cost", { ascending: true });
```

**Crear:**
```typescript
await supabase.from("voucher_templates").insert({
  title,
  description,
  points_cost: Number(pointsCost),
  icon,
  color,
});
```

**Editar:**
```typescript
await supabase
  .from("voucher_templates")
  .update({ title, description, points_cost, icon, color })
  .eq("id", templateId);
```

**Eliminar (soft — agregar columna `is_active`):**

```sql
ALTER TABLE voucher_templates
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
```

```typescript
await supabase
  .from("voucher_templates")
  .update({ is_active: false })
  .eq("id", templateId);
```

Filtrar en la app móvil para mostrar solo `is_active = true`.

## Rutas en React Router v7

```typescript
// En el router principal de mochi-web
{
  path: "/admin",
  element: <AdminLayout />,
  children: [
    { index: true, element: <DashboardPage /> },
    { path: "vouchers", element: <VouchersPage /> },
  ],
}
```

## Migración SQL completa

```sql
-- 1. Campo admin en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Columna is_active en voucher_templates
ALTER TABLE voucher_templates ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 3. Policies admin para voucher_templates
DROP POLICY IF EXISTS "admin_manage_voucher_templates" ON voucher_templates;
CREATE POLICY "admin_manage_voucher_templates" ON voucher_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 4. RPC estadísticas
-- (ver arriba)

-- 5. RPC verificar admin
-- (ver arriba)

-- 6. GRANT
GRANT EXECUTE ON FUNCTION get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION is_current_user_admin() TO authenticated;
```

## Nueva env var necesaria

Ninguna nueva — usa las mismas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` del web.

## Criterios de aceptación

- Solo la usuaria con `is_admin = true` puede acceder a `/admin`.
- Las estadísticas se calculan server-side vía RPC, sin exponer datos individuales.
- Doménica puede crear, editar y desactivar plantillas de vales.
- Al desactivar una plantilla, la app móvil deja de mostrarla (filtro `is_active = true`).
- Todo el UI está en español.
- No hay `any`, no hay `.then()`, no hay service role en cliente.

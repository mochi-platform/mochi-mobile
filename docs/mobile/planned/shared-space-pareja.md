# Mochi Duo™

## Alcance de repositorio (override)

- Este documento asume repositorios individuales (sin Turborepo).
- La implementación descrita aquí corresponde al repo `mochi-mobile`.

## Aplicación del override en este documento

- Todo el plan se implementa en `mochi-mobile` con soporte de migraciones Supabase.
- No hay dependencia de paywall/suscripciones para habilitar Mochi Duo™.
- No se requieren cambios de UI en `mochi-web` para liberar esta versión.

## Contexto

El campo `partner_features_enabled` existe en `user_settings` y controla la visibilidad
del módulo de vales. La dinámica de Mochi Duo™ es la evolución natural: permitir
que una mujer vincule su cuenta con su pareja hombre para compartir metas, vales y
seguimiento de bienestar/rendimiento.

Esta feature es **100% gratuita**: no depende de suscripción ni cambia por pagar.

## Naming definido

Nombre oficial del producto para esta dinámica: `Mochi Duo™`.

## Alcance de esta versión (v1)

- Vincular dos cuentas (mujer propietaria + pareja hombre) por invitación.
- Habilitar para él un espacio reducido con permisos controlados.
- Permitir que él cree y modifique metas compartidas (`joint_goals`).
- Permitir que él modifique los vales de ella dentro de Mochi Duo™.
- Mostrar para él un snapshot del estado de ella:
  - fase del ciclo
  - rendimiento en estudio, ejercicio, hábitos y mood
  - actividad de cocina de la semana

No incluye en v1:
- Chat entre parejas
- Notificaciones push cuando la pareja completa algo
- Más de dos personas en el espacio

## Modelo de datos

### Tabla `partner_spaces`

```sql
CREATE TABLE partner_spaces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  partner_role    text NOT NULL DEFAULT 'male_lite'
                    CHECK (partner_role IN ('male_lite')),
  invite_code     text NOT NULL UNIQUE,
  invite_status   text NOT NULL DEFAULT 'pending'
                    CHECK (invite_status IN ('pending', 'accepted', 'cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_spaces ENABLE ROW LEVEL SECURITY;

-- Solo los participantes pueden ver el espacio
CREATE POLICY "partners_select_own_space" ON partner_spaces
  FOR SELECT USING (
    auth.uid() = owner_user_id OR auth.uid() = partner_user_id
  );

CREATE POLICY "creator_insert_space" ON partner_spaces
  FOR INSERT WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "partner_update_space" ON partner_spaces
  FOR UPDATE USING (
    auth.uid() = owner_user_id OR auth.uid() = partner_user_id
  );

GRANT ALL ON partner_spaces TO authenticated;
```

### Tabla `joint_goals`

```sql
CREATE TABLE joint_goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id        uuid NOT NULL REFERENCES partner_spaces(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  color           text NOT NULL DEFAULT 'purple',
  progress        integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  is_completed    boolean NOT NULL DEFAULT false,
  target_date     date,
  created_by      uuid NOT NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE joint_goals ENABLE ROW LEVEL SECURITY;

-- Ambas usuarias del espacio pueden ver y editar
-- Ambos miembros del espacio pueden ver y editar metas compartidas
CREATE POLICY "space_members_select_joint_goals" ON joint_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partner_spaces ps
      WHERE ps.id = space_id
        AND (ps.owner_user_id = auth.uid() OR ps.partner_user_id = auth.uid())
    )
  );

CREATE POLICY "space_members_insert_joint_goals" ON joint_goals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM partner_spaces ps
      WHERE ps.id = space_id
        AND (ps.owner_user_id = auth.uid() OR ps.partner_user_id = auth.uid())
        AND ps.invite_status = 'accepted'
    )
  );

CREATE POLICY "space_members_update_joint_goals" ON joint_goals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM partner_spaces ps
      WHERE ps.id = space_id
        AND (ps.owner_user_id = auth.uid() OR ps.partner_user_id = auth.uid())
    )
  );

GRANT ALL ON joint_goals TO authenticated;
```

### Modificación de `vouchers` para soporte compartido

```sql
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES partner_spaces(id);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS redeemed_by uuid REFERENCES profiles(id);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS updated_by_partner boolean NOT NULL DEFAULT false;
```

Un vale con `space_id != null` puede ser editado/canjeado por cualquiera de las dos
personas en Mochi Duo™.

### Policy para permisos reducidos del partner en `vouchers`

```sql
-- El owner mantiene control total sobre sus vales
CREATE POLICY "owner_manage_own_vouchers" ON vouchers
  FOR ALL USING (auth.uid() = user_id);

-- El partner (male_lite) puede actualizar vales del espacio, no borrarlos
CREATE POLICY "partner_update_shared_vouchers" ON vouchers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM partner_spaces ps
      WHERE ps.id = vouchers.space_id
        AND ps.partner_user_id = auth.uid()
        AND ps.invite_status = 'accepted'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partner_spaces ps
      WHERE ps.id = vouchers.space_id
        AND ps.partner_user_id = auth.uid()
        AND ps.invite_status = 'accepted'
    )
  );
```

### RPC: generar código de invitación

```sql
CREATE OR REPLACE FUNCTION create_partner_invite()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  -- Verificar que el usuario no tenga ya un espacio activo
  IF EXISTS (
    SELECT 1 FROM partner_spaces
    WHERE (owner_user_id = auth.uid() OR partner_user_id = auth.uid())
      AND invite_status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Ya tienes un espacio de pareja activo';
  END IF;

  -- Generar código único de 8 caracteres
  LOOP
    v_code := upper(substring(md5(random()::text) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM partner_spaces WHERE invite_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  INSERT INTO partner_spaces (owner_user_id, invite_code, partner_role)
  VALUES (auth.uid(), v_code);

  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION create_partner_invite() TO authenticated;
```

### RPC: aceptar invitación

```sql
CREATE OR REPLACE FUNCTION accept_partner_invite(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_space partner_spaces%ROWTYPE;
BEGIN
  SELECT * INTO v_space
  FROM partner_spaces
  WHERE invite_code = p_invite_code
    AND invite_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código de invitación inválido o ya usado';
  END IF;

  IF v_space.owner_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes aceptar tu propia invitación';
  END IF;

  UPDATE partner_spaces
  SET partner_user_id = auth.uid(),
      invite_status = 'accepted',
      updated_at = now()
  WHERE id = v_space.id;

  -- Habilitar partner_features en ambas cuentas
  UPDATE user_settings SET partner_features_enabled = true
  WHERE user_id IN (v_space.owner_user_id, auth.uid());

  RETURN json_build_object('space_id', v_space.id, 'success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_partner_invite(text) TO authenticated;
```

## Pantallas a crear (Mobile)

### `app/mochi-Duo™.tsx`

Vista principal de Mochi Duo™:
- Panel de él (espacio reducido):
  - metas compartidas editables
  - vales de ella editables dentro del espacio
  - vista de ciclo actual (solo fase/resumen)
  - tarjetas de rendimiento de ella
  - resumen de cocina semanal
- Metas compartidas (`joint_goals`)
- Vales compartidos

### `app/mochi-Duo™-invite.tsx`

Dos modos:
1. **Crear invitación** — muestra código generado y opción de compartir
2. **Unirse a Mochi Duo™** — campo para ingresar código de 8 caracteres

## Integración con módulos existentes

### Vales (`app/vouchers.tsx`)

Agregar sección "Vales compartidos" que muestra vouchers con `space_id` activo.
El partner puede editar/canjear los vales de ella dentro del espacio:

```typescript
await supabase
  .from("vouchers")
  .update({
    is_redeemed: true,
    redeemed_by: userId,
    updated_by_partner: true,
    redeemed_at: new Date().toISOString(),
  })
  .eq("id", voucherId)
  // Sin filtro de user_id — la policy de RLS lo maneja por space_id
```

### Snapshot de ciclo y rendimiento para el partner

Crear una RPC de lectura agregada (sin exponer datos sensibles crudos):

```sql
CREATE OR REPLACE FUNCTION get_partner_space_snapshot(p_space_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'cycle_phase', (
      SELECT phase
      FROM cycle_logs
      WHERE user_id = ps.owner_user_id
      ORDER BY logged_at DESC
      LIMIT 1
    ),
    'study_week', (
      SELECT COALESCE(SUM(duration_seconds), 0)
      FROM study_sessions
      WHERE user_id = ps.owner_user_id
        AND completed_at >= now() - interval '7 days'
    ),
    'exercise_week', (
      SELECT COUNT(*)
      FROM routine_logs
      WHERE user_id = ps.owner_user_id
        AND completed_at >= now() - interval '7 days'
    ),
    'habits_week', (
      SELECT COUNT(*)
      FROM habit_logs
      WHERE user_id = ps.owner_user_id
        AND log_date >= current_date - 7
    ),
    'mood_last', (
      SELECT mood
      FROM mood_logs
      WHERE user_id = ps.owner_user_id
      ORDER BY logged_date DESC
      LIMIT 1
    ),
    'cooking_week', (
      SELECT COUNT(*)
      FROM recipe_cook_sessions
      WHERE user_id = ps.owner_user_id
        AND is_finished = true
        AND created_at >= now() - interval '7 days'
    )
  )
  FROM partner_spaces ps
  WHERE ps.id = p_space_id
    AND (ps.owner_user_id = auth.uid() OR ps.partner_user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION get_partner_space_snapshot(uuid) TO authenticated;
```

### Settings (`app/settings.tsx`)

Agregar sección "Mochi Duo™" con:
- Estado del vínculo (activo / pendiente / sin vincular)
- Opción de crear código o unirse
- Opción de desvincular

## Activación del flag `partner_features_enabled`

La RPC `accept_partner_invite` habilita automáticamente `partner_features_enabled = true`
en ambas cuentas. Cuando se desvinculan (cancelar espacio), ejecutar:

```sql
CREATE OR REPLACE FUNCTION leave_partner_space(p_space_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_other_user uuid;
BEGIN
  SELECT CASE
    WHEN owner_user_id = auth.uid() THEN partner_user_id
    ELSE owner_user_id
  END INTO v_other_user
  FROM partner_spaces
  WHERE id = p_space_id
    AND (owner_user_id = auth.uid() OR partner_user_id = auth.uid());

  UPDATE partner_spaces SET invite_status = 'cancelled' WHERE id = p_space_id;

  -- Deshabilitar módulo en ambas cuentas
  UPDATE user_settings SET partner_features_enabled = false
  WHERE user_id IN (auth.uid(), v_other_user);
END;
$$;

GRANT EXECUTE ON FUNCTION leave_partner_space(uuid) TO authenticated;
```

## Monetización

Esta dinámica se mantiene gratuita en todos los planes:
- No hay gating por `billing_subscriptions`.
- No hay paywall para crear, unirse o usar Mochi Duo™.

## Criterios de aceptación

- La usuaria propietaria genera un código de 8 caracteres único.
- El partner hombre ingresa el código y se vinculan.
- El partner puede crear y modificar metas compartidas.
- El partner puede modificar/canjear los vales compartidos de ella.
- El partner puede ver ciclo actual, rendimiento (estudio/ejercicio/hábitos/mood) y cocina semanal.
- Al desvincularse, `partner_features_enabled` se deshabilita en ambas cuentas.
- La feature funciona igual para cuentas free y de pago.
- Todo el copy está en español.
- No hay `any`, no hay `.then()`, no hay service role en cliente.
- Las policies de RLS garantizan que nadie fuera del espacio puede ver los datos.

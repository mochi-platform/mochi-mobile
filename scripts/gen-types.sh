#!/usr/bin/env bash
# Genera los tipos de la base de datos desde el stack local (supabase start) y los copia a la web.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=src/shared/lib/supabase/database.types.ts
npx -y supabase@latest gen types typescript --local > "$OUT"
if [ -d ../mochi-web/src/types ]; then
  cp "$OUT" ../mochi-web/src/types/database.generated.ts
  echo "Copiado a mochi-web/src/types/database.generated.ts"
fi
echo "Tipos generados en $OUT"

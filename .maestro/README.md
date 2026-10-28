# Flujos E2E (Maestro)

Requisitos: build `preview` instalado (`com.siramong.mochi`), la cuenta demo de pruebas y las variables:

```
maestro test .maestro/ -e EMAIL=demo@... -e PASSWORD=...
```

No usar cuentas reales. Los flujos usan textos de la interfaz; si cambian en el rediseño (Fase 4), actualizar aquí.

Flujos:
- `01` login · `02` recuperar contraseña · `03` «Me llegó hoy» desde Hoy · `04` pantalla Premium (Yo → Ajustes) · `05` borrar cuenta (Yo → Ajustes).
- `06` onboarding: requiere una cuenta **sin** onboarding completo.
- `07` check-in de ánimo en Hoy.

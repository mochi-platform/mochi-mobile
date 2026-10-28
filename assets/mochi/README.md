# Arte de Mochi

- `source/`: hojas base y original generado con IA (referencia para derivar variantes).
  - `mochi-base.png`: personaje base sobre fondo blanco (1080 px).
  - `mochi-original-ai.jpg`: imagen original generada (1024 px).
  - `banner-social.png`: banner para redes.
- `../mochi-expressions/`: 4 expresiones actuales (1024×1024 RGBA): happy, thinking, sleepy, excited.

## Añadir una expresión o atuendo
1. Exporta el PNG 1024×1024 con fondo transparente, mismo encuadre que `happy.png`.
2. Regístralo en `src/shared/mochi/manifest.ts` (`EXPRESSION_SOURCES` u `OUTFIT_SOURCES`).
3. Úsalo con `<MochiCharacter expression="proud" outfit="none" />`.

Pendientes de arte: proud, worried, celebrating, tired, focused, soft_sad (hoy reutilizan la expresión base más cercana), variantes por fase del ciclo (sin texto de salud en el nombre del archivo) y 6–10 atuendos Premium.

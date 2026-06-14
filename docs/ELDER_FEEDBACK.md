# Retroalimentación de adultos mayores

Este documento recoge las observaciones reales de pruebas con personas
mayores y las decisiones de diseño que tomamos a partir de ellas.

## Resumen de la prueba con un adulto de 86 años

- Le gustó el concepto de la aplicación.
- Señaló que los adultos mayores son más lentos en la vista, la memoria y
  el aprendizaje.
- Las demostraciones rápidas son difíciles de seguir.
- Los pacientes necesitan orientación o entrenamiento previo antes de usarla.
- Le gustó el sonido de la alarma, pero notó que solo sirve si el paciente
  está cerca del teléfono.
- La idea de elegir la hora le pareció buena, pero no supo cómo operarla.
- Recomendó analizar un reloj automático frente a uno manual y elegir o
  modificar el mecanismo más simple para una persona mayor.

## Principios de experiencia de usuario aprendidos

- Los adultos mayores necesitan flujos más lentos y sin prisas.
- Las instrucciones deben quedar visibles más tiempo en pantalla.
- Usar botones grandes y bien separados.
- Evitar depender únicamente de selectores de reloj o de escribir la hora.
- Ofrecer un modo de práctica para aprender sin riesgo.
- No tratar a los adultos como niños: lenguaje claro, digno y respetuoso.

## Decisión de diseño

Para elegir la hora preferimos **rutinas predefinidas** (Mañana, Mediodía,
Tarde, Noche, Antes de dormir) más un **ajuste manual con botones + / −**,
en lugar de un selector de reloj complejo. El modelo de datos sigue siendo
`HH:mm`, validado con la misma expresión regular (`TIME_RE`).

Cambios concretos derivados de esta retroalimentación:

- **Modo adulto mayor** (activado por defecto): los avisos permanecen más
  tiempo en pantalla (7–9 s) y las instrucciones son más explícitas.
- **Selector de hora sencillo**: botones de rutina + controles + / − con
  una vista previa grande de la hora; el selector exacto queda en
  "Opciones avanzadas".
- **Practicar sin riesgo**: practicar la alarma y practicar el SOS sin
  realizar ninguna llamada ni guardar datos.
- **Guía rápida**: cuatro pasos, en texto grande y sin tecnicismos.

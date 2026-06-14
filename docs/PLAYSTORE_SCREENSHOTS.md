# 📸 Capturas para Play Store — Guía de seguridad

Las capturas de la ficha de Play Store son **públicas**. Esta guía evita filtrar
datos sensibles (PHI/PII) y coordenadas reales.

## Reglas obligatorias

- **No** publiques capturas con **coordenadas reales**.
- **No** publiques capturas que muestren **nombres de pacientes, nombres de
  médicos, números de teléfono o detalles de medicación reales**.
- **Evita** capturas del **marcador 911 / llamada de emergencia** en público.

## Usa datos de demostración

Sustituye los datos reales por datos ficticios antes de capturar:

| Campo | Valor demo |
|---|---|
| Nombre del paciente | `Paciente Demo` |
| Medicinas | `Metformina`, `Vitamina D`, `Aspirina` |
| Dosis | `500 mg`, `1 tableta` |
| Ubicación | difuminada o `LAT: 0.00000 / LON: 0.00000` |

## Capturas recomendadas

1. **Inicio / progreso diario**
2. **Lista de medicinas**
3. **Formulario de añadir medicina**
4. **Modal de alarma**
5. **Historial / adherencia**
6. **Pantalla SOS con coordenadas redactadas**

## Checklist antes de subir

- [ ] Sin nombres reales (paciente, médico, contactos).
- [ ] Sin números de teléfono reales.
- [ ] Sin medicación/dosis reales.
- [ ] Coordenadas difuminadas o a `0.00000`.
- [ ] Sin captura del marcador de emergencia.

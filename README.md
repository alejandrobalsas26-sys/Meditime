```
# 💊 Meditime

> Recordatorio inteligente de medicamentos — Escritorio (Java) + Web (PWA)

## Aplicaciones
| Módulo | Tecnología | Descripción |
|--------|-----------|-------------|
| `MediTime_Mejorado/` | Java / Swing | App de escritorio con alertas sonoras |
| `MediTime_Web/` | HTML + JS (PWA) | Versión web instalable (service worker) |

## Estructura del Proyecto
```
Meditime/
├── assets/              # Sonidos compartidos (.wav)
├── MediTime_Mejorado/   # App Java (fuentes en src/)
│   └── src/
│       ├── model/
│       ├── panels/
│       └── services/
└── MediTime_Web/        # PWA (Vanilla JS)
```

## Requisitos
- **Java:** JDK 11+, IntelliJ IDEA
- **Web:** Cualquier navegador moderno (sin dependencias)

## Cómo ejecutar
### Escritorio
Abrir módulo `MediTime_Mejorado` en IntelliJ → Run `Main.java`

### Web
Abrir `MediTime_Web/index.html` directo en el navegador
```

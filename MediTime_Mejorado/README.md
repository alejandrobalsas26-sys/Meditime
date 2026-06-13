# 🏥 MediTime PRO: Sistema de Gestión Segura de Medicamentos e Infraestructura de Alertas

## 📋 Descripción Operativa

**MediTime PRO** es una solución de software convergente diseñada para la gestión crítica, registro y control de la posología de medicamentos. El proyecto resuelve la fricción en la adherencia a tratamientos médicos mediante un ecosistema de alertas multinivel, garantizando la accesibilidad total para usuarios finales y la persistencia segura de los datos clínicos.

Desarrollado bajo estrictos principios de **Programación Orientada a Objetos (POO)** y **Seguridad por Diseño (Security by Design)**, este sistema equilibra una interfaz inclusiva con una capa lógica resistente a fallos operacionales y vulnerabilidades de inyección.

---

## 🛡️ Seguridad por Diseño (Security by Design)

Como parte de la arquitectura defensiva del software, MediTime PRO incorpora controles de seguridad desde la capa de código para proteger la integridad del motor de persistencia:

1. **Prevención de Inyección de Delimitadores:** El motor de almacenamiento (`StorageService`) utiliza archivos planos delimitados. Se implementó una función estricta de sanitización (`sanitizeInput`) que purga caracteres de control (`\n`, `\r`, `\t`) y bloquea el delimitador principal (`|`), neutralizando ataques de salto de columna y corrupción de la matriz de datos.
2. **Control de Longitud en Memoria:** Truncamiento estricto de los *inputs* del usuario (ej. 50 caracteres para nombres, 20 para dosis) para evitar desbordamientos lógicos (Buffer/Memory Overflow) antes de la inserción.
3. **Resiliencia Operacional (Fail-Safe):** Las operaciones transaccionales de lectura/escritura (I/O) están encapsuladas en bloques `try-catch`. Los errores operacionales son registrados silenciosamente para auditoría (`[SECURITY_ERROR]`), evitando la exposición de *stack traces* (Information Disclosure) y previniendo el congelamiento de la interfaz del usuario.

---

## ♿ Accesibilidad Inclusiva (UX/UI)

El sistema operativo está adaptado para interactuar con poblaciones vulnerables, reduciendo la fricción tecnológica:

* **Accesibilidad Visual:** Interfaz ultra simplificada (fuentes de 48px, botones de 100px), soporte integral para lectores de pantalla y método `leerTexto()` para simular Text-to-Speech (TTS).
* **Accesibilidad Auditiva:** Alertas visuales de pantalla completa, icono parpadeante de alta frecuencia y codificación por colores según la prioridad del fármaco.
* **Alertas Multinivel y Neuro-inclusivas:**
    * 🔴 **URGENTE:** 3 beeps rápidos (1200Hz) - Medicinas críticas.
    * 🟡 **NORMAL:** 2 beeps medios (800Hz) - Tratamientos regulares.
    * 🟢 **SUAVE:** Campanita doble (600Hz-750Hz) - Suplementos.
    * ⏰ **Pre-alerta (10 min):** Notificación suave preventiva.
    * Sistema repetitivo cada 5 minutos (máximo 6 intentos) con botón de emergencia ("NO PUEDO") para pacientes con Alzheimer o movilidad reducida.

---

## 🏗️ Arquitectura de Software y Tecnologías

El repositorio está estructurado separando la lógica de negocio, la interfaz gráfica y los servicios de infraestructura:

```text
MediTime_Mejorado/
├── src/
│   ├── Main.java                    # Punto de entrada
│   ├── model/
│   │   └── Medicine.java            # Entidad de negocio (11 atributos)
│   ├── panels/
│   │   ├── AppFrame.java            # Contenedor principal UI
│   │   ├── AddMedicinePanel.java    # Controlador de validación estricta y sanitización
│   │   └── MedicineListPanel.java   # Controlador de visualización de datos
│   └── services/
│       ├── StorageService.java      # Motor CRUD de persistencia segura (Matriz 100x11)
│       ├── ReminderService.java     # Motor de alertas asíncronas y scheduling
│       ├── SoundService.java        # Motor de generación de frecuencias auditivas (WAV)
│       └── UIStyles.java            # Estandarización de interfaz
├── assets/                          # Directorio de recursos de audio autogenerados
└── medicamentos.db                  # Base de datos local (creación dinámica)
💾 Motor de Persistencia (Matriz Bidimensional)
La aplicación maneja en memoria una matriz de estado de 100x11 para gestionar eficientemente el ciclo de vida del medicamento, incluyendo campos críticos como: Prioridad, Ubicación física, Color de caja y Estado de confirmación diaria.

🚀 Despliegue Local (Entorno de Desarrollo)
Prerrequisitos
Java Development Kit (JDK) 8 o superior.

IDE recomendado: IntelliJ IDEA o Eclipse.

Instrucciones de Ejecución
Clonar el repositorio localmente.

Abrir el proyecto en IntelliJ IDEA (File → Open → MediTime_Mejorado).

Configurar el SDK: File → Project Structure → SDK: Java 8+.

Marcar el directorio src como Sources Root (Click derecho en src → Mark Directory as → Sources Root).

Ejecutar Main.main() (Shift+F10).

(Nota: Los archivos de audio en /assets y la base de datos medicamentos.db se generarán automáticamente durante la primera compilación exitosa).

👨‍💻 Autor
Alejandro G. Balsas Loo
Especialista en Seguridad e Infraestructura | Estudiante de Ingeniería en Ciberseguridad.

Desarrollo enfocado en la convergencia entre soluciones corporativas robustas, protección de activos críticos (Seguridad por Diseño) y la creación de tecnología accesible para mejorar la calidad de vida de poblaciones vulnerables.

🆘 Soporte y Contacto
GitHub: github.com/alejandrobalsas26-sys

Para reportes de vulnerabilidades, auditorías de código o sugerencias arquitectónicas, por favor abrir un Issue en este repositorio.

MediTime PRO: Operaciones seguras, accesibilidad total. 💊🛡️
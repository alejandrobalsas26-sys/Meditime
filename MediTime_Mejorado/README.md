# 🏥 MediTime PRO - Versión MEJORADA con Accesibilidad Total

## 📋 Descripción

**MediTime PRO** es una aplicación Java de recordatorios de medicamentos diseñada con **accesibilidad total** para:

- ♿ **Personas con discapacidad visual** (lectores de pantalla)
- 🔇 **Personas sordas** (alertas visuales y vibración simulada)
- 🧠 **Personas con Alzheimer** (interfaz ultra simplificada)
- 👴 **Adultos mayores** (botones grandes, fuentes grandes)

---

## 🆕 MEJORAS IMPLEMENTADAS

### ✅ Nuevas Funcionalidades

1. **Sistema de Sonidos Diferenciados**
   - 🔴 URGENTE: 3 beeps rápidos (1200Hz) para medicinas críticas
   - 🟡 NORMAL: 2 beeps medios (800Hz) para medicinas regulares
   - 🟢 SUAVE: Campanita doble (600Hz-750Hz) para vitaminas
   - ✅ CONFIRMACIÓN: Tono ascendente (éxito)
   - ❌ ERROR: Tono descendente
   - ⏰ PRE-ALERTA: Sonido suave 10 minutos antes

2. **Alertas Multinivel**
   - **Nivel 1:** Pre-alerta (10 min antes) - Notificación suave
   - **Nivel 2:** Alerta principal (hora exacta) - Pantalla completa
   - **Nivel 3:** Recordatorios cada 5 min si no confirma (máximo 6 veces)

3. **Campos Adicionales en Medicamentos**
   - **Prioridad:** URGENTE / NORMAL / BAJA
   - **Ubicación:** Dónde está guardado el medicamento
   - **Color de caja:** Para asociación visual
   - **Confirmación:** Si ya se tomó hoy

4. **Diálogo Mejorado**
   - Tamaño: 380×600 px (más grande)
   - Icono parpadeante de 100px
   - Fuente del nombre: 48px (GIGANTE)
   - Botones de 100px de alto
   - Colores de fondo según prioridad
   - 3 opciones: "YA TOMÉ" / "10 MIN MÁS" / "NO PUEDO"

5. **Matriz Bidimensional Ampliada**
   - De 7 columnas → 11 columnas
   - Nuevos campos: prioridad, ubicación, colorCaja, confirmado

6. **Soporte para Lectores de Pantalla**
   - Descripciones accesibles en todos los componentes
   - Método `leerTexto()` para simular TTS
   - Mensajes de voz en cada acción

---

## 🏗️ Estructura del Proyecto

```
MediTime_Mejorado/
│
├── src/
│   ├── Main.java                    # Punto de entrada
│   ├── DescargarSonido.java         # (Original, genera sonido básico)
│   │
│   ├── model/
│   │   └── Medicine.java            # ✨ MEJORADO (11 campos)
│   │
│   ├── panels/
│   │   ├── AppFrame.java            # Ventana principal
│   │   ├── WelcomePanel.java        # Pantalla bienvenida
│   │   ├── MenuPanel.java           # Menú principal
│   │   ├── AddMedicinePanel.java    # Formulario agregar/editar
│   │   ├── MedicineListPanel.java   # Lista de medicamentos
│   │   └── SettingsPanel.java       # Configuración
│   │
│   └── services/
│       ├── StorageService.java      # ✨ MEJORADO (matriz 11 columnas)
│       ├── ReminderService.java     # ✨ MEJORADO (alertas multinivel)
│       ├── SoundService.java        # ✨ NUEVO (6 tipos de sonidos)
│       └── UIStyles.java            # Estilos visuales
│
├── assets/                          # Se genera automáticamente
│   ├── urgente.wav
│   ├── normal.wav
│   ├── suave.wav
│   ├── confirmacion.wav
│   ├── error.wav
│   └── prealerta.wav
│
├── medicamentos.db                  # Base de datos (se crea al usar)
│
└── README.md                        # Este archivo
```

---

## 🚀 Cómo Ejecutar en IntelliJ IDEA

### Paso 1: Importar el Proyecto

1. Abre **IntelliJ IDEA**
2. Selecciona **File → Open**
3. Navega a la carpeta `MediTime_Mejorado`
4. Selecciónala y presiona **OK**

### Paso 2: Configurar el JDK

1. Ve a **File → Project Structure** (Ctrl+Alt+Shift+S)
2. En **Project Settings → Project**
3. Selecciona **SDK: Java 8** o superior
4. **Language level:** 8 o superior
5. Presiona **OK**

### Paso 3: Marcar la Carpeta src como Source Root

1. Click derecho en la carpeta `src`
2. Selecciona **Mark Directory as → Sources Root**

### Paso 4: Ejecutar

1. Abre el archivo `src/Main.java`
2. Click derecho en el editor
3. Selecciona **Run 'Main.main()'**

**¡O simplemente presiona Shift+F10!**

---

## 📚 Cómo Usar la Aplicación

### Primera Vez

1. **Pantalla de Bienvenida**
   - Presiona "COMENZAR"

2. **Menú Principal**
   - Presiona "➕ Agregar Medicamento"

3. **Formulario**
   - Llena los campos:
     - Nombre: "Aspirina"
     - Dosis: "1 tableta"
     - Prioridad: "NORMAL"
     - Ubicación: "Cajón del baño"
     - Color: "Blanco"
     - Frecuencia: "Diario"
     - Horas: "08:00" y "20:00"
   - Presiona "💾 Guardar"

### Probar Recordatorios

1. Agrega un medicamento con la **hora actual + 1 minuto**
2. Espera 30-60 segundos
3. ¡Aparecerá la alerta!

### Tipos de Alertas

**10 Minutos Antes:**
- Notificación pequeña y suave
- Se cierra automáticamente en 5 segundos

**Hora Exacta:**
- Pantalla completa con fondo de color
- Icono parpadeante
- Sonido EN BUCLE (no para hasta confirmar)
- 3 opciones:
  - ✅ YA TOMÉ → Confirma y guarda
  - ⏰ 10 MIN MÁS → Pospone
  - ❌ NO PUEDO → Solicita ayuda

---

## 🎨 Personalización

### Cambiar Prioridad de un Medicamento

En `AddMedicinePanel.java` (futuro), agrega un campo:

```java
JComboBox<String> prioridadCombo = new JComboBox<>(
    new String[]{"URGENTE", "NORMAL", "BAJA"}
);
```

### Agregar Contacto de Emergencia

En `ReminderService.java`, modifica el botón "NO PUEDO":

```java
helpButton.addActionListener(e -> {
    // Llamar a familiar
    String telefono = "+507-1234-5678";
    Desktop.getDesktop().browse(new URI("tel:" + telefono));
});
```

---

## 🔊 Archivos de Sonido

Los sonidos se **generan automáticamente** al iniciar la aplicación.

### Características de cada sonido:

| Sonido | Duración | Frecuencia | Uso |
|--------|----------|------------|-----|
| `urgente.wav` | 3s | 1200Hz | Medicinas críticas |
| `normal.wav` | 2.5s | 800Hz | Medicinas regulares |
| `suave.wav` | 1.5s | 600-750Hz | Vitaminas |
| `confirmacion.wav` | 0.8s | 400-800Hz (↑) | Toma confirmada |
| `error.wav` | 0.6s | 600-300Hz (↓) | Error |
| `prealerta.wav` | 1s | 500Hz | 10 min antes |

### Regenerar Sonidos

Si quieres regenerar los sonidos:

```java
SoundService.generarTodosSonidos();
```

O borra la carpeta `assets/` y reinicia la app.

---

## 💾 Base de Datos

### Formato del archivo `medicamentos.db`

```
ID|Nombre|Dosis|Frecuencia|Días|Horas|Notas|Prioridad|Ubicación|ColorCaja|Confirmado
1|Aspirina|1 tableta|daily||08:00,20:00||NORMAL|Cajón baño|Blanco|false
2|Insulina|10 unidades|daily||07:00,19:00||URGENTE|Nevera|Rojo|true
```

### Matriz Bidimensional

La aplicación usa una **matriz de 100×11**:

```java
String[][] medicinesMatrix = new String[100][11];
```

**Columnas:**
0. ID
1. Nombre
2. Dosis
3. Frecuencia
4. Días
5. Horas
6. Notas
7. Prioridad
8. Ubicación
9. Color de caja
10. Confirmado

---

## 🐛 Solución de Problemas

### No se reproducen los sonidos

**Solución 1:** Verifica que existe la carpeta `assets/`
```bash
ls assets/
```

**Solución 2:** Regenera los sonidos
- Ve a la clase `SoundService.java`
- Ejecuta el método `generarTodosSonidos()`

### No aparecen las alertas

**Problema:** El servicio de recordatorios no está activo

**Solución:** Verifica la consola:
```
✅ MediTime PRO ACCESIBLE - Aplicación iniciada
⏰ Servicio de recordatorios MEJORADO iniciado
```

### Error "Cannot find symbol: SoundService"

**Problema:** El proyecto no está compilado correctamente

**Solución:**
1. Ve a **Build → Rebuild Project**
2. Espera a que termine
3. Ejecuta de nuevo

---

## 📊 Visualización de la Matriz

Cuando abras la lista de medicamentos, verás en la consola:

```
╔═══════════════════════════════════════════════════════════════╗
║     CONTENIDO DE LA MATRIZ BIDIMENSIONAL (AMPLIADA)          ║
╠═══════════════════════════════════════════════════════════════╣
║ Dimensiones: [100 filas] x [11 columnas]
║ Medicamentos registrados: 2
╠═══════════════════════════════════════════════════════════════╣
║ Fila  0:
║   ├─ ID: 1
║   ├─ Nombre: Aspirina
║   ├─ Dosis: 1 tableta
║   ├─ Frecuencia: daily
║   ├─ Días:
║   ├─ Horas: 08:00,20:00
║   ├─ Notas:
║   ├─ Prioridad: NORMAL
║   ├─ Ubicación: Cajón del baño
║   ├─ Color: Blanco
║   └─ Confirmado: false
...
```

---

## 🎯 Características de Accesibilidad

### Para Personas Ciegas

✅ Descripciones accesibles en todos los botones
✅ Método `leerTexto()` simula Text-to-Speech
✅ Sonidos diferenciados por tipo de medicamento
✅ Instrucciones verbales en cada paso

### Para Personas Sordas

✅ Alertas visuales con colores llamativos
✅ Icono parpadeante de 100px
✅ Fondo de pantalla según prioridad
✅ Texto GIGANTE (48px para nombre)

### Para Personas con Alzheimer

✅ Solo 3 botones en alerta
✅ Campo "Ubicación" del medicamento
✅ Campo "Color de caja" para asociación
✅ Recordatorios repetitivos cada 5 min
✅ Botón "NO PUEDO" para pedir ayuda

---

## 📝 Próximas Mejoras (Para Versión Móvil)

- [ ] Migrar a **Android** (Kotlin/Java)
- [ ] Migrar a **iOS** (Swift)
- [ ] Implementar **TTS real** (Google TTS / iOS Speech)
- [ ] **Vibración real** del dispositivo
- [ ] **Flash de cámara** como alerta
- [ ] **Notificaciones push** nativas
- [ ] **App complementaria** para familiares
- [ ] **Llamada automática** si no confirma en 30 min

---

## 👨‍💻 Autor

Proyecto creado con ❤️ para mejorar la calidad de vida de adultos mayores y personas con necesidades especiales.

---

## 📄 Licencia

Este proyecto es de código abierto y puede ser usado libremente.

---

## 🆘 Soporte

Si tienes problemas o sugerencias:

1. Revisa la sección "Solución de Problemas"
2. Verifica la consola en IntelliJ IDEA
3. Asegúrate de tener Java 8+ instalado

---

**¡Disfruta de MediTime PRO Mejorado!** 💊⏰♿

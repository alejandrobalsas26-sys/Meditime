# 🗺️ Roadmap de seguridad — Almacenamiento cifrado

Este documento describe la arquitectura de almacenamiento **actual** y un
**camino empresarial futuro** hacia cifrado en reposo más fuerte. **No es
necesario** para la beta / pruebas internas actuales.

## Almacenamiento actual

- **Android nativo**: `SecureStoragePlugin` (Capacitor) cuando está disponible.
- **Web / PWA**: respaldo en `localStorage` (no cifrado).

Esta arquitectura es deliberadamente simple y **offline-first**: sin backend,
sin cuentas y sin SQLite/Room hoy.

## Camino empresarial futuro

Si en el futuro la app necesita cifrado en reposo de nivel empresarial:

1. **Migrar el modelo de estado a Room/SQLite** (hoy el estado es un objeto JSON).
2. **Cifrar la base SQLite con SQLCipher**.
3. **Proteger la clave de la base de datos con Android Keystore** (clave no
   exportable, respaldada por hardware cuando esté disponible).
4. **Añadir exportación/importación cifrada** de los datos.
5. **Añadir copia de seguridad/restauración opcional** (cifrada).

## Por qué no ahora

- La app **no usa** SQLite/Room actualmente, así que SQLCipher no aplica.
- Introducirlo ahora añadiría complejidad y riesgo sin beneficio para la beta.
- El modelo actual ya cubre el caso offline-first con `SecureStoragePlugin`.

Este es **alcance futuro**, no un requisito para el lanzamiento interno actual.

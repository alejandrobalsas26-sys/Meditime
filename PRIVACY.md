# 🔒 Política de Privacidad — MediTime PRO

_Última actualización: 2026-06-13_

MediTime PRO está diseñado con la privacidad como principio fundamental. Esta
política explica, en lenguaje claro, qué datos maneja la aplicación y cómo.

## Resumen

- **Offline-first**: la app funciona sin conexión a internet.
- **Sin cuentas**: no hay registro, login ni perfiles en la nube.
- **Sin backend**: no existe ningún servidor de MediTime que reciba tus datos.
- **Sin analítica**: no se recopilan métricas de uso.
- **Sin rastreo**: no hay cookies de seguimiento, identificadores publicitarios ni terceros.

## ¿Dónde se guardan tus datos?

Todos los datos (medicamentos, horarios, historial, contactos de emergencia y
ajustes) se almacenan **localmente en tu dispositivo**:

- **App nativa de Android**: usa almacenamiento seguro cuando el plugin de
  Capacitor (`capacitor-secure-storage-plugin`) está disponible.
- **Navegador / PWA**: usa `localStorage` como alternativa. Los datos quedan
  únicamente en tu navegador, en tu dispositivo.

Tus datos **nunca se envían** a internet por parte de la aplicación.

## Ubicación (GPS)

- La ubicación **solo se solicita durante el flujo de SOS** de emergencia.
- La ubicación obtenida se **muestra localmente** en pantalla para que puedas
  compartirla con quien te asiste. No se transmite a ningún servidor de MediTime.

## Permisos que usa la app y por qué

| Permiso | Para qué se usa |
|---|---|
| **Notificaciones** | Avisar a la hora de cada toma, incluso con la app cerrada. |
| **Alarmas exactas** | Que el recordatorio suene puntualmente a la hora indicada. |
| **Ubicación** | Solo en el SOS: mostrar tu posición para una emergencia. |
| **Internet** | Necesario para el runtime de WebView/Capacitor; la app no lo usa para enviar tus datos. |

## Aviso importante

MediTime PRO es una herramienta de apoyo y recordatorio. **No es un dispositivo
médico certificado** y no sustituye el consejo de un profesional de la salud.

## Contacto

Para dudas sobre privacidad: _[añadir correo de contacto]_.

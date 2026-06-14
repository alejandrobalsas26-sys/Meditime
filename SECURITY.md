# 🛡️ Seguridad — MediTime PRO

_Última actualización: 2026-06-13_

Este documento describe el modelo de seguridad de MediTime PRO, sus mitigaciones
y sus limitaciones conocidas.

## Modelo de seguridad

MediTime es una aplicación **offline-first** sin backend. La superficie de ataque
es deliberadamente pequeña:

- No hay servidor propio, ni API, ni autenticación remota.
- No se transmiten datos del usuario por la red.
- Todo el procesamiento ocurre en el dispositivo.

## Modelo de amenazas (threat model)

| Amenaza | Estado |
|---|---|
| Robo de datos en tránsito | No aplica: la app no envía datos a la red. |
| Compromiso de servidor | No aplica: no hay backend. |
| XSS / inyección de scripts | Mitigado (ver abajo). |
| Acceso físico al dispositivo | Riesgo residual (ver "Riesgos de datos locales"). |
| Cadena de suministro (dependencias) | Mitigado con `npm audit` en los quality gates. |

## Riesgos de datos locales

Como los datos se guardan en el dispositivo, quien tenga **acceso físico o de
sistema** al dispositivo desbloqueado podría leerlos. En Android se mitiga con
almacenamiento seguro y, donde esté disponible, bloqueo biométrico. En el
navegador, `localStorage` no está cifrado y depende de la seguridad del propio
dispositivo y navegador.

## Mitigaciones de XSS

- **Content-Security-Policy (CSP)** declarada vía `<meta http-equiv>` en `index.html`.
- **Sin `eval()`** ni `new Function()` ni `document.write()`.
- **Sin scripts remotos**: todo el código y las fuentes se sirven localmente.
- **DOM seguro**: la UI se construye con `textContent` y `createElement`; no se
  inyecta HTML controlado por el usuario mediante `innerHTML`.
- **Saneamiento de entradas** antes de guardarlas o mostrarlas.

## Modelo de almacenamiento

- **Android**: almacenamiento seguro nativo mediante el plugin de Capacitor.
- **Navegador / PWA**: `localStorage` como alternativa. Limitación conocida:
  `localStorage` **no está cifrado**.

## Hardening de Android

- `android:allowBackup="false"` en el manifiesto: evita que los datos se
  incluyan en copias de seguridad automáticas fuera del control del usuario.

## Limitaciones conocidas

- `localStorage` en navegador no ofrece cifrado en reposo.
- La seguridad de los datos depende del bloqueo y la integridad del dispositivo.
- MediTime **no es un dispositivo médico certificado**.

## Divulgación responsable

Si encuentras una vulnerabilidad, repórtala de forma responsable a:
_[añadir correo de contacto de seguridad]_.

Por favor, concede un plazo razonable para la corrección antes de divulgarla
públicamente.

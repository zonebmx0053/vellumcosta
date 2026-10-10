# Contexto del proyecto: Apartado "Propiedades" en vellumcosta.com

## Objetivo
Añadir un apartado a la web existente (www.vellumcosta.com) para mostrar 2 propiedades de alquiler vacacional, con:

- Sección "Propiedades" (o "Alojamientos") con las 2 casas.
- Botón "Más información" en cada una, con:
  - Teléfono de contacto
  - Email de contacto
  - Enlaces directos a los anuncios en Airbnb, Vrbo y Booking
- Un selector de fechas (calendario) donde el usuario elige fechas deseadas y el sistema le dice si está disponible.
- Si está disponible, mostrar el precio de reserva directa (más económico que las plataformas) y también los botones para reservar en Airbnb/Vrbo/Booking como alternativa.
- NO hace falta sistema de pago ni mensajería integrada: solo contacto directo (teléfono/email) o redirección a las plataformas.

## Decisión de arquitectura
Integrar todo dentro de la web actual (vellumcosta.com), **no** crear un dominio ni proyecto aparte. Con solo 2 propiedades no compensa separar marca/dominio; mejor aprovechar el tráfico y SEO ya existentes en el dominio actual.

## Aviso importante: paridad de precios
Revisar los contratos de anfitrión de Booking.com (y posiblemente Vrbo) antes de publicar precios más baratos fuera de su plataforma: suelen tener cláusulas de paridad de precios que prohíben ofrecer un precio menor por fuera para las mismas fechas, y pueden penalizar o suspender el anuncio si lo detectan. Airbnb es más permisivo.

Alternativa más segura que bajar el precio directamente: igualar el precio "de cara al público" pero añadir un incentivo aparte para reserva directa (ej. desayuno gratis, descuento aplicado tras contacto manual, upgrade, etc.) en vez de mostrar el precio tachado de la plataforma.

## Cómo funcionaría técnicamente

1. **Sincronización de disponibilidad real**
   - Cada plataforma (Airbnb, Vrbo, Booking) da una URL de calendario en formato **iCal** exportable desde el panel de "calendario / sincronizar calendarios" del anfitrión.
   - Hay que importar las 3 URLs iCal y combinarlas para bloquear automáticamente las fechas ya reservadas en cualquiera de las plataformas (evitar overbooking).

2. **Problema técnico clave: CORS**
   - No se puede leer un iCal directamente desde el navegador del visitante (las plataformas bloquean peticiones cross-origin).
   - Solución: una función intermedia (serverless) que descargue y procese los iCal periódicamente, y sirva los datos ya listos a la web. Puede ser:
     - Una Vercel/Netlify Function (recomendado si el hosting lo permite o se puede migrar).
     - Un endpoint PHP si el hosting es tradicional tipo cPanel.
   - Esa función/endpoint debe desplegarse en el hosting real de la web (no puede quedarse corriendo en un entorno temporal de desarrollo).

3. **Front-end del calendario**
   - El usuario selecciona fechas en un widget de calendario.
   - El sistema compara contra las fechas bloqueadas (de los iCal combinados).
   - Si están libres: muestra precio de reserva directa + botón de contacto (teléfono/email) + botones a Airbnb/Vrbo/Booking.
   - Si no están libres: indica que no hay disponibilidad para esas fechas.

4. **Precio**
   - Pendiente de definir: ¿precio fijo por noche o varía por temporada? Si varía, hay que definir las franjas/temporadas y precios por propiedad.

## Alternativas de herramienta
- Hacerlo a medida (código propio, gratis, pero hay que mantenerlo).
- Usar un *channel manager* ya existente (Smoobu, Lodgify, Hospitable, ~15-25€/mes para 2 propiedades) que ya sincroniza iCal de las 3 plataformas y da un widget embebible — menos trabajo de desarrollo y mantenimiento.

## Datos pendientes que el usuario debe aportar
1. Dónde está alojada la web actualmente (Vercel, Netlify, hosting tradicional cPanel, GitHub Pages, etc.)
2. Stack técnico actual de la web (HTML/CSS/JS plano, React, Next.js, WordPress, etc.) — se hizo con IA en VS Code.
3. URLs iCal de cada anuncio (Airbnb, Vrbo, Booking) de las 2 propiedades.
4. Precio por noche de cada propiedad (fijo o por temporada, y en ese caso las franjas).
5. Enlaces directos a los 3 anuncios por propiedad (Airbnb, Vrbo, Booking).
6. Teléfono y email de contacto a mostrar.
7. Fotos/descripciones de cada propiedad para la sección "Propiedades".

## Siguiente paso técnico sugerido
Con el stack y el hosting confirmados, construir:
- El endpoint/función serverless que combina los 3 iCal en una sola lista de fechas ocupadas.
- El componente/sección "Propiedades" con las 2 fichas.
- El widget de calendario (selección de fechas + comprobación de disponibilidad + precio + botones de contacto y plataformas).

# 📅 Rediseño: Agenda Unificada de Ruta (Mobile-First)

Este documento resume la propuesta conceptual para transformar la gestión de rutas y planificación en CRM2 en una experiencia intuitiva, visual y optimizada para dispositivos móviles (pantallas de 7").

---

## 1. El Concepto: "La Agenda Inteligente"

Se propone abandonar la fragmentación actual entre "Actividades" y "Visitas" para adoptar un flujo único basado en el tiempo y el espacio. La interfaz se inspirará en las aplicaciones de calendario más exitosas (Google Calendar / Apple Calendar), pero adaptada al trabajo específico de ventas en terreno.

### Pilares del Diseño (UX)

1. **Week Strip (Selector de Fecha)**:
   - Una barra superior deslizable que muestra los días de la semana.
   - **Heat-Dots (Indicadores de Carga)**: Pequeños círculos de colores bajo cada fecha que indican qué tan saturado está el día (Gris: 0 v., Verde: 1-4 v., Amarillo: 5-8 v., Rojo: +9 v.).
   - Permite visualizar rápidamente el **pasado** (visto) y el **futuro** (por planificar).

2. **Agenda Vertical (Contexto de Actividad)**:
   - Debajo del selector, una lista de "Cards" grandes para cada visita.
   - **Acceso a Ficha**: Cada tarjeta incluirá un botón táctil para desplegar la **Ficha de Cliente** (overlay o vista dedicada). Al cerrar la ficha, el sistema debe retornar al usuario a la pantalla de la Agenda Inteligente sin perder el contexto de scroll.
   - **Prioridad en Acciones**: Los botones de `Check-in` y `Check-out` son prominentes y están integrados en la tarjeta para evitar clics innecesarios.
   - Información clave: Nombre del Cliente, Dirección (con link a Maps), Objetivo del día y Estado (Pendiente/En Progreso/Completado).

3. **Modo Mapa (Visualización Espacial)**:
   - Un botón flotante permite alternar entre la lista y un mapa a pantalla completa.
   - El mapa muestra los pines numerados en orden de visita (1 → 2 → 3) para que el vendedor entienda su recorrido lógico.

---

## 2. Mejoras Operativas Requeridas

- **Visualización de Carga**: El usuario verá cuántas actividades tiene un día *antes* de seleccionar la fecha para una nueva planificación, evitando la sobrecarga accidental.
- **Flujo de Registro**: Al estar la actividad en el centro del flujo, el registro de resultados finales (notas, tareas de seguimiento) se realiza al finalizar la visita (Check-out) de forma simplificada.
- **Acceso Histórico**: Navegar a fechas pasadas mostrará el reporte de lo que se hizo ese día de forma instantánea.

---

## 3. Consideraciones Técnicas (Especialista Full Stack)

### Backend
- **Nueva API de Carga**: `GET /api/visits/workload` para obtener los conteos diarios por rango de fechas.
- **Unificación de Modelos**: Consolidar `activities` y `visitas_registro` para asegurar que un cambio en una se refleje en la visión de agenda.

### Frontend
- **Aesthetics Premium**: Uso de tipografía moderna (Inter), paleta de colores HSL armónica y micro-animaciones en las tarjetas.
- **Performance**: Carga asíncrona de datos del mapa para no ralentizar la interacción con la lista.

---

## 4. Próximos Pasos (Para revisión mañana)

1. **Feedback del Usuario**: Validar si el enfoque de "Agenda con Heat-Dots" cubre todas las necesidades planteadas.
2. **Plan de Implementación**: Definir fases de desarrollo (Base de datos -> API -> Frontend Component -> Map Integration).
3. **Mockup Detallado**: Crear una representación visual más cercana al resultado final.

---

© 2026 Propuesta de Diseño CRM2

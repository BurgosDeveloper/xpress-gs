# Reglas de UI/UX y Estética Neon Premium

Estas reglas aplican estrictamente para cualquier modificación o creación de componentes visuales en la aplicación Frontend.

1. **Color Primario Absoluto:** Todo elemento que llame a la acción (CTA), resalte o indique estado activo DEBE usar el color `#0000FF` (Azul Neon puro).
2. **Textos:** Los textos legibles siempre en `#FFFFFF` (Blanco). Los textos secundarios pueden usar un gris claro.
3. **Fondos y Profundidad:** El fondo primario de tarjetas, modales y overlays debe ser Negro (`#000000`) o un gris casi negro muy oscuro, a menudo utilizando opacidades (ej. `rgba(0, 0, 0, 0.8)`) junto con blur de fondo (Glassmorphism) para superponerse al mapa sin perder elegancia.
4. **Cero Formularios de Texto (Minimización):** Está prohibido crear flujos basados en llenar cajas de texto a menos que sea inevitable (como escribir un nombre o dirección de correo). Se deben usar:
   - Botones gigantes para opciones binarias o categóricas.
   - Sliders para rangos (precio, tiempo).
   - Selección en mapa.
5. **Iconografía:** Todo elemento debe estar acompañado o ser reemplazado por un icono (`Ionicons`). Los iconos deben ser grandes, claros y con suficiente área táctil (mínimo 44x44 pt).
6. **Animaciones:** Cualquier aparición de UI, transición o actualización de estado debe tener una micro-animación. Nada es instantáneo/tosco.
7. **Clean Map:** La vista de mapa debe verse sin obstrucciones. Cualquier control debe "flotar" usando paddings de Safe Area.

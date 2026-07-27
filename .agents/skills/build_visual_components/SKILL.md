---
name: build_visual_components
description: Construye un componente de interfaz visual de alta calidad que obedece las reglas de diseño Neon (sin inputs de texto, usa iconos, estética #0000FF/Blanco/Negro).
---

# Instrucciones
Cuando debas crear o modificar un componente en el frontend (React Native), sigue estos pasos:

1. Importa `Ionicons` de `@expo/vector-icons` y utilízalo para la iconografía.
2. Evita `TextInput` a menos que sea el login/registro de email/pass. Sustituye inputs por opciones táctiles, botones, o tarjetas (`TouchableOpacity`, `Pressable`).
3. Usa la paleta de colores del archivo de temas. Si el tema no está disponible, asegura que las acciones principales usen `backgroundColor: '#0000FF'` y el texto sobre ellas sea `color: '#FFFFFF'`.
4. Los contenedores flotantes deben tener `backgroundColor: 'rgba(0,0,0,0.85)'` o similar para dar efecto de glassmorphism oscuro.
5. Usa bordes redondeados (`borderRadius: 12` a `24`) y `shadowColor: '#000'` para profundidad.
6. Exporta el componente limpio y documentado.

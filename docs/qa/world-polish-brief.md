# PAU WORLD — V9.1 / V9.2 / V9.3 master brief (verbatim, received 2026-10-11)

This file is the loop's source of requirements. It supersedes the V9 "bootstrap and autonomous world audit" brief of the same day; the V9 iteration 1 work on `feat/v9-world-physics-destruction` (commit `7123491`) is the starting point and is kept.

---

# PAU WORLD — V9.1 / V9.2 / V9.3
## COMPLETE WORLD REDESIGN · GAMEPLAY · ART DIRECTION · UX/UI · WORLD STABILITY

# MISIÓN

Actúa como un equipo multidisciplinar de primer nivel formado por: Principal Three.js / React Three Fiber Engineer; AAA Level Designer; Senior Environment Artist; Principal Technical Artist; Senior Vehicle Physics Engineer; Collision Systems Architect; Senior UX/UI Game Designer; Lighting & Materials Artist; Gameplay Systems Engineer; Destruction Simulation Engineer; Performance Optimization Lead; QA Automation Architect.

Vamos a realizar una revisión exhaustiva de PAU WORLD para convertir la ciudad actual en una experiencia 3D profesional, visualmente atractiva, divertida de explorar y físicamente consistente. NO queremos seguir acumulando objetos y funcionalidades sobre una distribución urbana defectuosa. Queremos que el mundo funcione como un videojuego diseñado intencionadamente. Cada carretera debe tener sentido. Cada distrito debe tener identidad. Cada elemento geométrico debe estar correctamente integrado. Cada collider debe representar razonablemente su geometría. Cada rampa debe permitir despegar. Cada playa transitable debe permitir transformarse en barco. Los objetos decorativos destructibles deben reaccionar correctamente. La cámara nunca debe impedir la navegación. El HUD debe ser limpio, intuitivo y contextual. Y los proyectos profesionales deben seguir siendo el verdadero propósito de PAU WORLD.

# 0. PREPARACIÓN Y AUDITORÍA

Repositorio: https://github.com/paura432/portfolio-2.0. El repositorio puede contener implementaciones locales recientes V8, V8.1 y V9 que todavía no estén publicadas en GitHub. No partir automáticamente de main ni de V5. Antes de cualquier modificación: 1. git status. 2. ramas locales y remotas. 3. worktrees. 4. versión funcional más reciente. 5. si V9 ya existe y qué fases contiene. 6. cambios sin commit. 7. proteger el trabajo previo. 8. lint, typecheck, unit tests y build. 9. informes de QA existentes. 10. abrir el juego y analizar el estado visual real. No utilizar comandos Git destructivos. No eliminar trabajo. No reescribir sistemas que ya funcionan. Si existe una rama V9 activa, continuar de forma segura en ella o crear una rama de mejora desde su último commit validado. Si no existe, crear `feat/v9-world-redesign-and-polish`. No hacer push, merge ni deploy sin autorización.

# 1. PROBLEMA VISUAL Y FUNCIONAL CONFIRMADO

Existe una captura del juego en la que el coche queda bloqueado junto a un edificio, una jardinera y la acera. El jugador no puede continuar circulando. En esa captura también se observan: edificios próximos a las zonas transitables; elementos de mobiliario junto a carreteras; rampa elevada al fondo; HUD con legibilidad mejorable; edificio que ocupa gran parte del encuadre de cámara; poca separación visual entre algunas superficies oscuras; piezas laterales visibles en el vehículo mientras aparece CAR MODE. La imagen no demuestra por sí sola la causa física del bloqueo. Debes investigar el problema mediante código, reproducción e instrumentación. Tratarlo como un P0 hasta demostrar y resolver la causa. No limitarte a esa ubicación. Buscar todos los puntos equivalentes del mapa.

# 2. V9.1 — WORLD GAMEPLAY FOUNDATION

## 2.1 Rediseño de la distribución urbana
Auditar la ciudad como un nivel jugable: calles principales y secundarias, intersecciones, rotondas, aparcamientos, entradas de distritos, accesos a edificios, aceras, jardineras, mobiliario, rampas, playas, muelles, caminos entre zonas, respawn. Para cada área: ¿se circula con comodidad? ¿espacio para girar? ¿puede retroceder? ¿obstáculos invisibles? ¿la cámara permite ver el recorrido? ¿la distribución tiene sentido? ¿los decorativos bloquean rutas? ¿alternativa cuando una vía está ocupada? Rediseño: recolocar mobiliario, corregir distancias, ajustar bordillos, liberar esquinas, mejorar accesos, revisar carriles, corregir colliders, reorganizar. No ampliar todas las carreteras indiscriminadamente. No mover edificios importantes sin evaluar consecuencias. Coherencia visual y escala. Crear un plano verificable de circulación.

## 2.2 Cámara cinematográfica funcional
Detección de obstáculos entre cámara y vehículo; reducción dinámica de distancia; recuperación progresiva; anticipación en curvas; encuadre por velocidad; pasos estrechos; altura; protección contra clipping; transiciones suaves; portrait y landscape. Si un edificio bloquea la cámara, acercarla o recolocarla sin brusquedad. No atravesar paredes si hay mejor solución. No colocarla encima del coche ante cualquier contacto menor. Perfiles CAR, BOAT, PLANE, TRANSFORMATION; continuidad; sin mareo.

## 2.3 Auditoría de colisiones
Todas las categorías: edificios, muelles, rampas, rocas, bordillos, farolas, jardineras, bancos, papeleras, vallas, señales, árboles, props, terreno. Debug de colliders en desarrollo. Comprobar forma, posición, rotación, dimensiones, contacto, penetración, resolución, deslizamiento, reacciones, consistencia visual. Círculos, cápsulas, OBB, compuestos o heightfields. No bounding boxes enormes. Eliminar colliders invisibles incorrectos. No eliminar colisiones reales para facilitar el movimiento. Edificios sólidos e indestructibles.

# 3. V9.2 — ART DIRECTION & WORLD REDESIGN (solo tras un baseline de navegación estable)

## 3.1 Identidad arquitectónica por distrito
CENTRAL HUB: identidad personal, ingeniería, conectividad, punto central, acceso a proyectos; reconocible desde lejos. DUPLEX: centro de control industrial, sistemas técnicos, pantallas de diagnóstico, automatización, elementos verticales inspirados en elevadores; no representar funcionalidades no documentadas. OVI: centro de IA, comunicaciones, elementos luminosos conectados, infraestructura digital, silueta limpia. BROKI: operaciones, logística, infraestructura, elementos industriales estilizados. TRUSTOS: identidad digital, credenciales verificables, seguridad, geometría precisa, iluminación sobria. 42 MADRID: formación tecnológica, programación, identidad propia sin copiar marcas. 4GEEKS AI CAMPUS: investigación, laboratorios, edificios secundarios organizados. CONTACT: torre de comunicaciones, contacto profesional, acceso evidente. Reglas comunes: dirección artística global, proporciones coherentes, materiales compartidos, low-poly premium, paleta e iluminación consistentes, escala funcional; silueta propia por edificio; no repetir prismas con cambios mínimos de color.

## 3.2 Composición y jerarquía visual
Vista aérea, cámara de coche, marítima, avión, aproximaciones, intersecciones. Landmarks, contrastes, profundidad, rutas reconocibles, siluetas, escala, legibilidad, equilibrio. Identificar un distrito sin leer el cartel. No saturar; espacios de descanso visual.

## 3.3 Iluminación y materiales
Mantener la identidad nocturna azul oscuro; mejorar ambiente, separación de fachadas, carretera, aceras, cristales, metal, hormigón, vegetación, agua, arena, sombras de contacto, ventanas, emisiones, haze. Referencias: threejs.org, cyber-ocean.vercel.app (no copiar). Sin bloom excesivo; ventanas con profundidad; jerarquía lumínica; rendimiento en LOW.

## 3.4 Rediseño completo del HUD
Auditar controles, modo, minimap, botones, interacción, menú, calidad, reset, mensajes, responsive. HUD mínimo, funcional y elegante. Desktop: identidad discreta, modo, interacción contextual, minimap, controles esenciales; ajustes/calidad/reinicios en menú secundario. Móvil: táctiles ergonómicos, menor ocupación vertical, minimap adaptable, prompts legibles, sin solapamientos, safe areas. No instrucciones permanentes; no esconder los proyectos.

# 4. V9.3 — INTERACTIVE WORLD POLISH

## 4.1 Rampas aéreas
Toda rampa inventariada: aproximación, aceleración, despliegue, recorrido físico, despegue, vuelo, aterrizaje, recuperación. Rediseño visual: entrada reconocible, dirección clara, iluminación de aproximación, pendiente progresiva, soportes, señalización, salida sin obstáculos, diseño futurista original. No prisma inclinado; no superficies invisibles; no pendientes normales como despegue.

## 4.2 Playas transformables
Toda playa transitable conectada al mar: CAR → BOAT y BOAT → CAR. Verificar geometría costera, pendiente, profundidad, línea de agua, arena seca y húmeda, espuma, flotación, transformación, salida. No triggers puntuales; reglas derivadas del terreno; nadie atrapado entre tierra y agua.

## 4.3 Mundo destructible
FAROLAS: vibran, se doblan, caen, modifican su collider, recuperación. MACETAS: se desplazan, se vuelcan, pueden romperse, fragmentos. BANCOS: se mueven o vuelcan según intensidad. SEÑALES: se inclinan, caen, sin obstáculos permanentes injustificados. VALLAS: reacción por segmentos. ÁRBOLES: reutilizar sistema existente. RESTO: inventariar cada categoría real y definir su respuesta. No idéntica animación para todo. Edificios e infraestructura indestructibles.

# 5. Auditoría de geometría real
Pivotes, transformaciones, escalas, rotaciones, flotantes, enterradas, superposiciones, z-fighting, caras invisibles, normales, sombras, colliders desincronizados, instancias mal posicionadas, fusión incorrecta. Correcciones estructurales; no reconstruir modelos completos por un pivote. Validar geometría y colisiones conjuntamente.

# 6. QA visual
Capturas reales (no renders inventados): aérea, calles, intersecciones, cada distrito, cruces complicados, rampas (aproximación, despegue, vuelo), playa (entrada, navegación, regreso), colisiones con edificios, destrucción, HUD, menú, móvil, HIGH/MEDIUM/LOW. Comparativas antes/después con el problema y la evidencia.

# 7. Auditoría automática
NAVEGACIÓN: acceso entre distritos, marcha atrás, giros, pasos estrechos, intersecciones, esquinas, aparcamientos. COLISIONES: edificios, props, mobiliario, rampas, terreno, muelles, obstáculos rotados. TRANSFORMACIONES: todas las rampas y playas, repetición, interrupciones, recuperación. DESTRUCCIÓN: impactos leves y fuertes, estados intermedios, colliders actualizados, reinicio, respawn seguro. REGRESIONES: distritos, proyectos, editorial, menús, controles, responsive, WebGL fallback, calidad. No basta comprobar la existencia de componentes; recorridos reales con inputs.

# 8. Performance
Baseline antes de cambiar gráficos; después de cada fase comparar draw calls, triángulos, geometrías, materiales, texturas, frame time, FPS, memoria, física, animaciones. Distinguir software y GPU real. No inventar FPS. No cientos de luces dinámicas. No convertir todos los props en mallas dinámicas permanentes. Instancing y pooling.

# 9. Loop de revisión continua
Crear `docs/qa/world-polish-state.json`, `docs/qa/world-polish-acceptance.md`, `docs/qa/world-polish-report.md`. Estado: rama, commit, iteración, fase, inventario, defectos abiertos y corregidos, pruebas, capturas, rendimiento, regresiones, bloqueos, resultado. Cada iteración: leer estado, inspeccionar defectos, elegir el de mayor prioridad, reproducir, causa raíz, corregir, pruebas relacionadas, revisión visual, regresiones, evidencia, commit si validado, actualizar estado. No repetir trabajo validado; no reescribir por estética sin mejora demostrable; no cambios masivos. Revisión crítica al concluir cada fase desde LEVEL DESIGNER, TECHNICAL ARTIST, GAMEPLAY ENGINEER, UX DESIGNER con defectos concretos.

# 10. Criterios de aceptación
No COMPLETE hasta: bloqueo urbano original corregido o documentado como no reproducible tras investigación; rutas principales transitables; sin P0/P1 de colisiones; cámara sin obstrucciones graves; distritos con identidad; iluminación legible; HUD sin solapes en viewports objetivo; todas las rampas y playas verificadas; mobiliario destructible inventariado funcionando; edificios indestructibles; proyectos accesibles; unit, lint, typecheck, build; dos suites E2E completas consecutivas; rendimiento medido; capturas antes/después; sin regresiones P0/P1. No PASS por intuición; NOT VERIFIED si no verificable; BLOCKED si exige intervención.

# 11. Estrategia
V9.1 Gameplay foundation (colisiones, geometría, carreteras, accesos, cámara, navegación). V9.2 Art direction (arquitectura, materiales, iluminación, composición, HUD). V9.3 World polish (rampas, playas, destrucción, animaciones, efectos, estabilidad, QA final). No empezar V9.2 con P0 en V9.1; no empezar V9.3 con regresiones críticas de navegación.

# 12. Límite
Máximo 12 iteraciones. COMPLETE antes si se cumplen los criterios; BLOCKED con causas si quedan P0/P1 tras 12. Informar del progreso real sin declarar finalizado.

# 13. Entrega final
`docs/qa/v9-world-redesign-audit.md`, `docs/design/v9-level-design.md`, `docs/design/v9-art-direction.md`, `docs/architecture/v9-collision-audit.md`, `docs/qa/v9-final-validation.md`, `docs/screenshots/v9/`. Entregar: rama, SHA inicial y final, auditoría inicial, defectos, rediseño del mapa, colisiones, cámara, edificios, materiales e iluminación, HUD, rampas, playas, destructibles, unit, E2E, capturas, rendimiento, regresiones, riesgos. No push, merge, deploy; no eliminar worktrees.

# Objetivo final
Una ciudad coherente y atractiva; conducir divertido; recorrer cada calle sin bloqueos; edificios reconocibles; cámara que acompaña; rampas que invitan a volar; playas que invitan a entrar; mobiliario que reacciona; iluminación viva; interfaz elegante; cada distrito interesante antes de abrir su ficha. Empieza por la auditoría de V9.1; corrige primero navegación, cámara y colisiones; después el rediseño visual; termina con las mecánicas avanzadas y el pulido. No declares terminado el proyecto sin verificarlo.

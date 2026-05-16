# TaskFlow
Un taskflow el cual permite guardar tareas con nombre, fecha de entrega, y su nivel de importancia (bajo, medio, alto)


# TaskFlow Pro — Gestor de Tareas Avanzado

Aplica los conceptos evaluados en la **Evaluación Sumativa N°2** de la asignatura **Desarrollo Front End** (INACAP Maipú). La aplicación consiste en un Dashboard/Gestor de tareas dinámico estructurado bajo arquitectura modular en JavaScript ES6+, diseño responsivo mediante CSS moderno, implementación de almacenamiento persistente y estrictas pautas de seguridad informática contra vulnerabilidades XSS.

---

## 📂 Arquitectura del Proyecto

El proyecto está compuesto por tres archivos principales interconectados de forma desacoplada:

1. **`index.html`** (Capa de Estructura Semántica)
2. **`styles.css`** (Capa de Presentación y Experiencia de Usuario)
3. **`script.js`** (Capa de Lógica de Negocio y Control del DOM)

A continuación se detalla la responsabilidad, funcionalidades y técnicas aplicadas en cada componente:

---

### 1. 🌐 `index.html` — Estructura Semántica y Accesibilidad

Este archivo define la estructura ósea e inmobiliaria de la aplicación, implementando estándares de HTML5 semántico para garantizar accesibilidad (`aria-live`, `role="dialog"`) y una correcta indexación.

* **Contenedor Principal (`.app-shell`):** Organiza la interfaz en un Dashboard de dos columnas divididas en un menú lateral (`<aside>`) y un contenedor principal (`<main>`).
* **Sistema de Navegación por Pestañas (Tabs):** Define tres vistas independientes (`#dashboard`, `#tasks`, `#history`) encapsuladas dinámicamente mediante clases de CSS, permitiendo una experiencia SPA (Single Page Application) sin recarga del navegador.
* **Contenedores de Inyección Dinámica:** Dispone de listas ordenadas de manera semántica (`<ul>`) con directivas `aria-live="polite"` para notificar de forma no intrusiva a lectores de pantalla cuando JavaScript renderiza nuevos elementos en tiempo real.
* **Formulario en Ventana Superpuesta (Modal):** Contiene un formulario de ingreso encapsulado en un contenedor modal independiente para aislar el flujo de creación o edición de tareas de la visualización general.

---

### 2. 🎨 `styles.css` — Diseño Visual, Soft UI y Microinteracciones

El archivo de estilos se enfoca en otorgar una experiencia UI/UX fluida e intuitiva basada en el patrón de diseño *Soft UI* con una paleta cromática pastel para mitigar la fatiga visual del usuario.

* **Paleta de Colores Modulares:** Hace uso de variables CSS (`:root`) que centralizan los tonos base: Fondo sutil (`#EEF2FF`), Tarjetas blancas puras (`#FFFFFF`), y acentos pasteles para prioridades (Rojo/Alta, Amarillo/Media, Verde/Baja) manteniendo contrastes altos para la legibilidad del texto.
* **Layouts Modernos y Responsivos:** Aplica `display: grid` y `display: flex` para lograr una interfaz totalmente fluida que se adapta automáticamente a dispositivos móviles o resoluciones de escritorio sin romper la consistencia visual.
* **Microinteracciones y Animaciones de Transición:** * `pop-in`: Animación mediante fotogramas clave (`@keyframes`) que otorga un efecto elástico y orgánico al añadir nuevas tareas.
    * `slide-out` / `fade-scale`: Transiciones de salida que disminuyen la opacidad y escalan el elemento al archivar o eliminar tareas.
    * `edit-pulse`: Destello visual lila que avisa al usuario cuál elemento del DOM ha sido editado recientemente.

---

### 3. 🧠 `script.js` — Lógica, Manipulación del DOM y Seguridad

Es el motor funcional y cerebro de la aplicación. Está escrito utilizando estándares de **JavaScript ES6+** (funciones de flecha, desestructuración, propagación y métodos funcionales de arrays).

#### 🛠️ Funcionalidades Implementadas:
* **Gestión del Estado de los Datos:** Mantiene en memoria arreglos de objetos detallados con estructuras de datos complejas (`{ id, title, description, priority, category, dueDate, completed, archived, createdAt }`).
* **Persistencia Local con LocalStorage:** Sincroniza automáticamente cualquier cambio en el arreglo a través de llamadas a la API del navegador, permitiendo que los datos sigan existiendo después de actualizar o cerrar la pestaña.
* **Filtros Avanzados en Tiempo Real:** Implementa búsquedas complejas mediante expresiones regulares y filtrado múltiple cruzado (Prioridad + Texto + Estado) usando métodos funcionales nativos (`.filter()`).
* **Indicadores de Rendimiento (Dashboard):** Realiza operaciones matemáticas acumulativas con `.reduce()` y `.length` para alimentar los contadores del Dashboard en tiempo real.
* **Acciones Masivas (Bulk Processing):** Utiliza estructuras del tipo `Set` para almacenar selecciones múltiples mediante checkboxes, permitiendo completados o eliminaciones por lotes.

#### 🛡️ Mecanismos de Seguridad y Mitigación XSS (Rúbrica Nivel Excelente):
* **Inyección Segura en el DOM:** **Está estrictamente prohibido el uso de `innerHTML`** para pintar entradas del usuario. Se mitigan ataques de scripts maliciosos (XSS) construyendo los elementos uno a uno mediante `document.createElement()`, asignando texto plano de forma segura a través de `textContent` y enlazando las jerarquías con `appendChild()`.
* **Sanitización de Entradas:** El motor cuenta con la función `sanitizeText()`, la cual emplea expresiones regulares (`RegEx`) para remover caracteres de escape de código, etiquetas HTML o caracteres de control no permitidos, limitando el título y descripción a cadenas seguras.
* **Validación Semántica y Fechas:** Evalúa que el título cuente con la longitud mínima requerida y valida mediante operaciones de tiempo nativas (`new Date()`) que no sea posible asignar plazos límite vencidos o anteriores al día actual.

---

## 🤖 Uso de Inteligencia Artificial (AI Support)

Como parte de los requisitos metodológicos del instrumento de evaluación, se utilizaron asistentes de IA (ChatGPT / Copilot / Gemini) orientados a las siguientes buenas prácticas de ingeniería de software:

1.  **Optimización del Filtro Cruzado:** Apoyo en la refactorización de la función `applyFilters` para unificar en un solo retorno lineal los tres tipos de filtros simultáneos (búsqueda por texto, estatus de completado y select de prioridad), reduciendo la complejidad ciclomática del script.
2.  **Generación de RegEx Seguras:** Diseño asistido de la expresión de validación unicode `/[^\p{L}\p{N}\s\.,;:!\?"'()\-_/&%@...]/gu` encargada de sanitizar textos respetando tildes de la lengua castellana y la letra ñ, bloqueando simultáneamente caracteres especiales de inyección de código.
3.  **Encapsulamiento del DOM:** Estructuración limpia para la generación masiva de sub-nodos y estructuración de los elementos SVG incrustados en la creación dinámica de tarjetas de tareas.

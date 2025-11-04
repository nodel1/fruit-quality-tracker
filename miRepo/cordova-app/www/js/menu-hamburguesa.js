/** 
 * Elementos del DOM del menú de navegación
 * @type {HTMLElement}
 */
const nav = document.querySelector("#nav");
/** Botón para abrir el menú */
const abrir = document.querySelector("#abrir");
/** Botón para cerrar el menú */
const cerrar = document.querySelector("#cerrar");

/**
 * Evento para abrir el menú de navegación.
 * Agrega la clase 'visible' al menú y bloquea el scroll del body.
 */
abrir.addEventListener("click", () => {
    nav.classList.add("visible");
    document.body.classList.add("nav-open"); // ⚠️ Bloquear scroll cuando el menú está abierto
});

/**
 * Evento para cerrar el menú de navegación.
 * Quita la clase 'visible' del menú y restaura el scroll del body.
 */
cerrar.addEventListener("click", () => {
    nav.classList.remove("visible");
    document.body.classList.remove("nav-open"); // ⚠️ Restaurar scroll
});

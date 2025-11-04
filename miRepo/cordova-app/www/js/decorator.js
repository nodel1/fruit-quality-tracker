/**
 * Función decoradora que añade un menú a una página antes de renderizar su contenido principal.
 * 
 * @param {Function} pageElement - Función que renderiza el contenido principal de la página.
 * @returns {Object} Objeto con metodo `render` para ejecutar la decoración y renderizado.
 */
function decorateWithMenu(pageElement) {
    return {
        /**
         * Renderiza el menú en la página y luego ejecuta la función principal de la página.
         * 
         * @async
         */
        render: async () => {
            // Crear contenedor para el menú
            const menuContainer = document.createElement('div');
            menuContainer.id = 'menu-container';

            try {
                // Cargar contenido del archivo menu.html
                const response = await fetch('menu.html');
                if (!response.ok) throw new Error('Error al cargar menu.html');
                const menuContent = await response.text();
                menuContainer.innerHTML = menuContent;

                // Insertar el menú al inicio del body
                document.body.insertBefore(menuContainer, document.body.firstChild);

                // Inicializar los eventos de apertura y cierre del menú
                const nav = document.querySelector("#nav");
                const abrir = document.querySelector("#abrir");
                const cerrar = document.querySelector("#cerrar");

                if (nav && abrir && cerrar) {
                    abrir.addEventListener("click", () => {
                        nav.classList.add("visible");
                    });
                    cerrar.addEventListener("click", () => {
                        nav.classList.remove("visible");
                    });
                } else {
                    console.error('Elementos del menú no encontrados');
                }

                // Ajustar altura mínima del contenedor centrado según el header
                const header = document.querySelector('header');
                const centeredContainer = document.querySelector('.centered-container');
                if (header && centeredContainer) {
                    const headerHeight = header.offsetHeight;
                    centeredContainer.style.minHeight = `calc(100vh - ${headerHeight}px)`;
                }
            } catch (error) {
                console.error('Error en el decorador:', error);
                menuContainer.innerHTML = '<p>Error al cargar el menú</p>';
            }

            // Ejecutar renderizado del contenido principal de la página
            pageElement();
        }
    };
}

// Exponer la función globalmente
window.decorateWithMenu = decorateWithMenu;

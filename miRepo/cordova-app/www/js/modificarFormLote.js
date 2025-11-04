/**
 * Script para modificar los datos de un lote y navegar a la gestión de imágenes.
 * Se ejecuta cuando el DOM está completamente cargado.
 */
document.addEventListener('DOMContentLoaded', async () => {
  /** Formulario para modificar el lote */
  const modificarForm = document.getElementById('modificarFormLote');
  /** Elemento para mostrar mensajes de error */
  const errorMessage = document.getElementById('errorMessage');
  /** Botón para ir a la gestión de imágenes del lote */
  const btnIrAGestionImagenes = document.getElementById('irAGestionImagenes');

  /** ID del lote obtenido desde localStorage */
  const loteId = localStorage.getItem('loteId');

  if (!loteId) {
    errorMessage.textContent = 'No se proporcionó un ID de lote válido.';
    return;
  }

  /**
   * Función para cargar los datos actuales del lote desde el backend
   */
  const cargarDatosLote = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/lote/${loteId}`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true' // Header solo para pruebas con ngrok
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener los datos del lote');
      }

      const lote = await response.json();

      // Rellenar los campos del formulario con los datos obtenidos
      document.getElementById('nombre').value = lote.nombre;
      document.getElementById('especie').value = lote.especie;
      document.getElementById('variedad').value = lote.variedad;
    } catch (err) {
      console.error(err);
      errorMessage.textContent = 'Error al cargar los datos del lote.';
    }
  };

  // Cargar los datos del lote al iniciar la página
  await cargarDatosLote();

  /**
   * Evento al enviar el formulario de modificación de lote
   */
  modificarForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Obtener valores del formulario y eliminar espacios
    const nombre = document.getElementById('nombre').value.trim();
    const especie = document.getElementById('especie').value.trim();
    const variedad = document.getElementById('variedad').value.trim();

    try {
      const response = await fetch(`${API_BASE_URL}/lote/${loteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ nombre, especie, variedad })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al modificar el lote');
      }

      alert('Lote modificado correctamente');
      // Redirigir al listado de lotes
      window.location.href = 'listado_lotes.html';
    } catch (err) {
      console.error(err);
      errorMessage.textContent = err.message || 'Error al modificar el lote';
    }
  });

  /**
   * Evento al hacer clic en el botón "Añadir Fotos"
   * Redirige a la página de gestión de imágenes del lote
   */
  btnIrAGestionImagenes.addEventListener('click', (e) => {
    e.preventDefault();

    if (!loteId) {
      alert("No se encontró el ID del lote.");
      return;
    }

    // Guardar nuevamente el ID por seguridad
    localStorage.setItem("loteId", loteId);

    // Redirigir a la página de gestión de imágenes
    window.location.href = "add_img.html";
  });
});

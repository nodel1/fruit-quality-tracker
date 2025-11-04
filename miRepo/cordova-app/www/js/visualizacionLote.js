/**
 * Script para mostrar la lista de lotes, con opciones de eliminar,
 * modificar o ver estadísticas de cada lote.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const lotesList = document.getElementById('lotesList');
  const noLotesMessage = document.getElementById('noLotesMessage');

  /**
   * Elimina un lote y actualiza la lista visual
   * @param {number|string} id ID del lote a eliminar
   * @param {HTMLElement} liElement Elemento <li> que representa el lote
   */
  const eliminarLote = async (id, liElement) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el lote ${id}?`)) return;

    try {
      const response = await fetch(`${API_BASE_URL}/lote/${id}`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });

      if (!response.ok) throw new Error('Error al eliminar el lote');

      liElement.remove();

      // Mostrar mensaje si ya no quedan lotes
      if (lotesList.children.length === 0) {
        noLotesMessage.style.display = 'block';
      }
    } catch (err) {
      console.error(err);
      alert('Error al eliminar el lote');
    }
  };

  try {
    // Obtener lista de lotes desde la API
    const response = await fetch(`${API_BASE_URL}/lote`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });

    if (!response.ok) throw new Error('Error al obtener los lotes');
    const lotes = await response.json();

    if (lotes.length === 0) {
      noLotesMessage.style.display = 'block';
      return;
    }

    // Mantener referencia al lote cuyo menú de opciones está abierto
    let loteAbierto = null;

    lotes.forEach(lote => {
      // Crear elemento de lista para cada lote
      const li = document.createElement('li');
      li.className = 'lote-item';
      li.style.cursor = 'pointer';
      li.style.textAlign = 'center';
      li.innerHTML = `Lote: ${lote.nombre} <br> ${lote.especie} ${lote.variedad || ''}`;

      // Contenedor de botones de opciones
      const opciones = document.createElement('div');
      opciones.style.display = 'none';
      opciones.style.padding = '10px';
      opciones.style.borderTop = '1px solid #ddd';
      opciones.style.backgroundColor = '#f9f9f9';
      opciones.style.justifyContent = 'center';
      opciones.style.gap = '10px';

      // Botón Eliminar
      const btnEliminar = document.createElement('button');
      btnEliminar.textContent = 'Eliminar';
      btnEliminar.className = 'btn btn-danger btn-sm';
      btnEliminar.addEventListener('click', (e) => {
        e.stopPropagation();
        eliminarLote(lote.id, li);
      });

      // Botón Modificar
      const btnModificar = document.createElement('button');
      btnModificar.textContent = 'Modificar';
      btnModificar.className = 'btn btn-warning btn-sm';
      btnModificar.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.setItem('loteId', lote.id);
        window.location.href = 'modificacion_lote.html';
      });

      // Botón Estadísticas
      const btnEstadisticas = document.createElement('button');
      btnEstadisticas.textContent = 'Estadísticas';
      btnEstadisticas.className = 'btn btn-info btn-sm';
      btnEstadisticas.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.removeItem("lote_id_estadisticas");
        localStorage.setItem("lote_id_estadisticas", lote.id);
        window.location.href = 'estadisticas.html';
      });

      // Agregar botones al contenedor de opciones
      opciones.appendChild(btnEliminar);
      opciones.appendChild(btnModificar);
      opciones.appendChild(btnEstadisticas);

      li.appendChild(opciones);

      // Toggle del menú de opciones al hacer click sobre el lote
      li.addEventListener('click', () => {
        if (loteAbierto && loteAbierto !== opciones) {
          loteAbierto.style.display = 'none';
        }

        if (opciones.style.display === 'none' || opciones.style.display === '') {
          opciones.style.display = 'flex';
          loteAbierto = opciones;
        } else {
          opciones.style.display = 'none';
          loteAbierto = null;
        }
      });

      lotesList.appendChild(li);
    });

  } catch (err) {
    noLotesMessage.style.display = 'block';
    noLotesMessage.textContent = 'Error al cargar los lotes.';
    console.error(err);
  }
});

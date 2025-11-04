/**
 * @fileoverview Manejo de subida, previsualización, almacenamiento y eliminación
 * de imágenes en la interfaz de usuario.
 * Incluye interacción con el backend para guardar y recuperar imágenes.
 */

// ===================== Elementos del DOM =====================

/**
 * Input de selección de archivos de imagen
 * @type {HTMLInputElement}
 */
const imageFileInput = document.getElementById('imageFile');

/**
 * Galería temporal para previsualización
 * @type {HTMLElement}
 */
const gallery = document.getElementById('imageGallery2');

/**
 * Contenedor de imágenes guardadas desde el backend
 * @type {HTMLElement}
 */
const savedContainer = document.getElementById('savedImagesContainer');

/**
 * Separador visual entre imágenes guardadas y nuevas
 * @type {HTMLElement}
 */
const separator = document.getElementById('separator');

/**
 * Imagen actualmente seleccionada
 * @type {HTMLImageElement}
 */
const selectedImage = document.getElementById('selectedImage');

/**
 * Contenedor de la imagen seleccionada
 * @type {HTMLElement}
 */
const selectedImageContainer = document.getElementById('selectedImageContainer');

/**
 * Overlay para mostrar imagen en pantalla completa
 * @type {HTMLElement}
 */
const fullscreenOverlay = document.getElementById('fullscreenImageOverlay');

/**
 * Imagen que se muestra en pantalla completa
 * @type {HTMLImageElement}
 */
const fullscreenImg = document.getElementById('fullscreenImage');

/**
 * Contenedor de mensajes de error
 * @type {HTMLElement}
 */
const errorMessage = document.getElementById("errorMessage2");

/**
 * Botón para eliminar imagen seleccionada
 * @type {HTMLButtonElement}
 */
const deleteBtn = document.getElementById('deleteImageBtn');

/**
 * ID de la imagen actualmente seleccionada
 * @type {string|null}
 */
let currentImageId = null;
// ===================== Inicialización =====================

/**
 * Al cargar la página, valida la existencia de un `loteId`.
 * Si no existe, redirige a la creación de lote.
 */
document.addEventListener('DOMContentLoaded', () => {
  const loteId = localStorage.getItem('loteId');
  if (!loteId) {
    alert("No se encontró un lote activo. Redirigiendo...");
    window.location.href = "/crear-lote.html";
    return;
  }

  const loteIdInput = document.getElementById('loteIdInput');
  if (loteIdInput) {
    loteIdInput.value = loteId;
  }

  loadSavedImages();
});

// ===================== Previsualización =====================

/**
 * Muestra en la galería las imágenes seleccionadas por el usuario antes de subirlas.
 */
imageFileInput.addEventListener('change', function () {
  const files = Array.from(this.files);
  const label = document.querySelector('label[for="imageFile"]');
  if (label) {
    label.innerText = files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : 'Elegir archivos...';
  }
  showPreview(files);
});

/**
 * Renderiza una previsualización de los archivos seleccionados.
 * @param {File[]} files - Archivos de imagen seleccionados.
 */
function showPreview(files) {
  gallery.innerHTML = '';

  files.forEach((file, index) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const col = createImageColumn(event.target.result, file.name, null, index);
      gallery.appendChild(col);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Crea un contenedor (columna) con una imagen y, si corresponde, un botón de eliminación.
 * @param {string} src - Fuente de la imagen (URL o Base64).
 * @param {string} name - Nombre de la imagen.
 * @param {string|null} [id=null] - ID de la imagen (si proviene del backend).
 * @param {number|null} [fileIndex=null] - Índice del archivo en el input (para poder eliminarlo).
 * @returns {HTMLElement} Columna con la imagen y controles asociados.
 */
function createImageColumn(src, name, id = null, fileIndex = null) {
  const col = document.createElement('div');
  col.className = 'col-6 col-sm-4 col-md-3 mb-3';

  const img = document.createElement('img');
  img.src = src;
  img.className = 'img-fluid img-thumbnail';
  img.alt = name;
  img.style.cursor = 'pointer';

  if (id) {
    img.addEventListener('click', () => showFullscreenImage(src, id));
  }

  col.appendChild(img);

  if (!id) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-warning btn-sm mt-2';
    btn.innerText = 'Quitar';
    btn.addEventListener('click', () => {
      col.remove();
      removeFileFromInput(fileIndex);
    });
    col.appendChild(btn);
  }

  return col;
}

/**
 * Elimina un archivo del input de selección según su índice.
 * @param {number} indexToRemove - Índice del archivo a eliminar.
 */
function removeFileFromInput(indexToRemove) {
  const dt = new DataTransfer();
  const currentFiles = Array.from(imageFileInput.files);

  currentFiles.forEach((file, index) => {
    if (index !== indexToRemove) {
      dt.items.add(file);
    }
  });

  imageFileInput.files = dt.files;
}

// ===================== Pantalla Completa =====================

/**
 * Muestra una imagen en pantalla completa dentro del overlay.
 * @param {string} src - Fuente de la imagen.
 * @param {string|null} id - ID de la imagen seleccionada (si existe en backend).
 */
function showFullscreenImage(src, id = null) {
  fullscreenImg.src = src;
  fullscreenOverlay.classList.add('show');
  currentImageId = id;
}

// Cerrar overlay al hacer click fuera de la imagen
fullscreenOverlay.addEventListener('click', (event) => {
  if (event.target === fullscreenOverlay || event.target === fullscreenImg) {
    fullscreenOverlay.classList.remove('show');
    currentImageId = null;
  }
});

// ===================== Backend =====================

/**
 * Carga las imágenes guardadas en el backend asociadas al `loteId`.
 * Renderiza las imágenes en el contenedor de guardadas.
 */
async function loadSavedImages() {
  const loteId = localStorage.getItem('loteId');
  if (!loteId) return;

  try {
    const response = await fetch(`${API_BASE_URL}/imagenes?lote_id=${loteId}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    const data = await response.json();

    savedContainer.innerHTML = '';

    if (data.success && data.images.length > 0) {
      data.images.forEach(image => {
        const imgSrc = `data:image/jpeg;base64,${image.imagen}`;
        const col = createImageColumn(imgSrc, image.nombre, image.id);
        savedContainer.appendChild(col);
      });
      separator.style.display = 'block';
    } else {
      separator.style.display = 'none';
    }
  } catch (error) {
    console.error('Error al cargar imágenes guardadas:', error);
    errorMessage.innerText = "No se pudieron cargar imágenes guardadas.";
  }
}

// ===================== Subida =====================

/**
 * Maneja el evento de envío del formulario para subir imágenes al backend.
 */
document.getElementById('uploadForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const loteId = localStorage.getItem('loteId');
  if (!loteId) {
    errorMessage.innerText = "No se encontró el loteId. Por favor crea primero el lote.";
    return;
  }

  const formData = new FormData(this);

  const selectedImages = Array.from(imageFileInput.files).map(file => ({
    name: file.name,
    url: URL.createObjectURL(file)
  }));

  try {
    const response = await fetch(`${API_BASE_URL}/upload-multiple`, {
      method: 'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true'
      },
      body: formData
    });

    const result = await response.json();
    if (result.success) {
      addNewImagesToGallery(selectedImages);
      this.reset();
      document.querySelector('label[for="imageFile"]').innerText = 'Elegir archivos...';
      errorMessage.innerText = '';
      await loadSavedImages();
    } else {
      errorMessage.innerText = result.error || "Error al subir imágenes.";
    }
  } catch (err) {
    console.error('Error en la subida:', err);
    errorMessage.innerText = "Error de conexión al servidor.";
  }
});

/**
 * Añade nuevas imágenes subidas a la galería principal.
 * @param {Array<{name: string, url: string}>} images - Imágenes recién subidas.
 */
function addNewImagesToGallery(images) {
  images.forEach(image => {
    const col = createImageColumn(image.url, image.name);
    savedContainer.insertBefore(col, savedContainer.firstChild);
  });
  separator.style.display = 'block';
  gallery.innerHTML = '';
}

// ===================== Eliminación =====================

/**
 * Elimina la imagen actualmente seleccionada del backend.
 * Confirma con el usuario antes de proceder.
 */
deleteBtn.addEventListener('click', async () => {
  if (!currentImageId) return;

  const confirmDelete = confirm("¿Estás seguro de que quieres eliminar esta imagen?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_BASE_URL}/imagenes/${currentImageId}`, {
      method: 'DELETE',
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (res.ok) {
      alert("Imagen eliminada");
      currentImageId = null;
      fullscreenOverlay.classList.remove('show');
      await loadSavedImages();
    } else {
      const error = await res.json();
      alert("Error al eliminar: " + (error.error || 'desconocido'));
    }
  } catch (err) {
    console.error('Error al eliminar imagen:', err);
    alert("Error al conectarse al servidor.");
  }
});


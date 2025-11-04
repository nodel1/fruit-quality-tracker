/**
 * Carga todas las imágenes desde el backend y las muestra en la galería.
 * También agrega botones para eliminar cada imagen.
 * 
 * @async
 */
async function loadImages() {
    try {
        const response = await fetch(`${API_BASE_URL}/imagenes`);

        if (!response.ok) {
            throw new Error('Error al cargar imágenes');
        }

        /** @type {Array<Object>} */
        const images = await response.json();
        const gallery = document.getElementById('imageGallery');
        gallery.innerHTML = '';

        if (images.length === 0) {
            gallery.innerHTML = '<p>No hay imágenes disponibles</p>';
            return;
        }

        images.forEach(image => {
            const imageCard = document.createElement('div');
            imageCard.className = 'image-card';

            // Enlace a la vista de detalle
            const link = document.createElement('a');
            link.href = `image-detail.html?id=${image.id}&name=${encodeURIComponent(image.nombre)}`;

            const imgElement = document.createElement('img');
            imgElement.src = `${API_BASE_URL}/imagenes/${image.id}`;
            imgElement.alt = image.nombre;
            imgElement.loading = 'lazy';

            link.appendChild(imgElement);
            imageCard.appendChild(link);

            // Nombre de la imagen
            const nameElement = document.createElement('div');
            nameElement.className = 'image-name';
            nameElement.textContent = image.nombre;
            imageCard.appendChild(nameElement);

            // 🔴 Botón eliminar
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger mt-2';
            deleteButton.textContent = 'Eliminar';
            deleteButton.onclick = async () => {
                if (confirm(`¿Eliminar "${image.nombre}"?`)) {
                    try {
                        const res = await fetch(`${API_BASE_URL}/imagenes/${image.id}`, { method: 'DELETE' });
                        if (res.ok) {
                            alert('Imagen eliminada');
                            await loadImages(); // recargar galería
                        } else {
                            alert('Error al eliminar la imagen');
                        }
                    } catch (err) {
                        console.error('Error:', err);
                        alert('Error de red al intentar eliminar');
                    }
                }
            };

            imageCard.appendChild(deleteButton);
            gallery.appendChild(imageCard);
        });
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('imageGallery').innerHTML =
            '<p class="error">Error al cargar las imágenes</p>';
    }
}

/**
 * Manejador del formulario de subida de imágenes.
 * Envía los archivos seleccionados al backend usando FormData.
 */
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const files = document.getElementById('imageFile').files;
    const formData = new FormData();

    // Añadir todos los archivos al FormData
    for (let i = 0; i < files.length; i++) {
        formData.append('imagenes', files[i]);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/upload-multiple`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error al subir las imágenes');
        }

        alert(result.message || 'Imágenes subidas correctamente');

        // Limpiar formulario y actualizar galería
        document.getElementById('uploadForm').reset();
        await loadImages();
        document.querySelector('.custom-file-label').textContent = 'Elegir archivo...';

        // Limpiar previews de imagen seleccionada
        document.getElementById('imageGallery2').innerHTML = '';
        document.getElementById('selectedImage').style.display = 'none';

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('errorMessage2').textContent = error.message;
    }
});

/** Cargar imágenes automáticamente al iniciar la página */
document.addEventListener('DOMContentLoaded', loadImages);

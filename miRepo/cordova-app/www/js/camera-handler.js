/**
 * Evento principal que espera a que el dispositivo esté listo
 * antes de ejecutar el acceso a la cámara mediante Cordova.
 */
document.addEventListener('deviceready', function () {
    /**
     * Agrega un listener al botón con id "camera" para capturar una foto.
     * 
     * @event click
     * @listens document#click
     */
    document.getElementById('camera').addEventListener('click', function () {
        navigator.camera.getPicture(onSuccess, onFail, {
            quality: 90, // Calidad de la imagen capturada (0-100)
            destinationType: Camera.DestinationType.DATA_URL, // Retorna la imagen como base64
            saveToPhotoAlbum: true, // Guarda la imagen en la galería del dispositivo
            encodingType: Camera.EncodingType.JPEG, // Formato de la imagen
            mediaType: Camera.MediaType.PICTURE, // Solo fotos, no video
            sourceType: Camera.PictureSourceType.CAMERA // Usar la cámara directamente
        });
    });

    /**
     * Función callback cuando la imagen es capturada con éxito.
     *
     * @callback onSuccess
     * @param {string} imageData - Cadena base64 que representa la imagen capturada.
     */
    function onSuccess(imageData) {
        const image = document.getElementById('myImage');
        image.src = "data:image/jpeg;base64," + imageData;
    }

    /**
     * Función callback cuando ocurre un error al capturar la imagen.
     *
     * @callback onFail
     * @param {string} message - Mensaje de error devuelto por la API de cámara.
     */
    function onFail(message) {
        alert('Error al capturar la imagen: ' + message);
    }
}, false);

/**
 * Script para crear lotes, subirlos y escanear QR.
 * Se ejecuta al cargar el DOM y espera a Cordova para funcionalidades de cámara.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado');

    /** Formulario para crear un lote */
    const uploadFormLote = document.getElementById('uploadFormLote');
    /** Botón de crear y subir lote */
    const crearsubirBtn = document.getElementById('crearsubirBtn');
    /** Botón para iniciar escaneo QR */
    const scanQRBtn = document.getElementById('scanQRBtn');
    /** Contenedor del escáner QR */
    const qrReader = document.getElementById('qr-reader');
    /** Resultado del QR leído */
    const qrResult = document.getElementById('qr-result');
    /** Contenedor de mensajes de error */
    const errorMessage = document.getElementById('errorMessage');
    /** Instancia del escáner QR */
    let html5QrcodeScanner = null;
    /** Flag que indica si Cordova está listo */
    let cordovaReady = false;

    // =====================
    // CREACIÓN DE LOTES
    // =====================

    /**
     * Evento al enviar el formulario de lote
     */
    if (uploadFormLote) {
        uploadFormLote.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombre = document.getElementById('nombre').value.trim();
            const especie = document.getElementById('especie').value.trim();
            const variedad = document.getElementById('variedad').value.trim();
            errorMessage.textContent = '';

            try {
                const res = await fetch(`${API_BASE_URL}/lote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' },
                    body: JSON.stringify({ nombre, especie, variedad })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error al crear el lote');
                window.location.href = 'lotes.html';
            } catch (err) {
                errorMessage.textContent = err.message;
                console.error(err);
            }
        });
    }

    /**
     * Botón "Crear y Subir" que guarda lote y redirige a subir imágenes
     */
    if (crearsubirBtn) {
        crearsubirBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const nombre = document.getElementById('nombre').value.trim();
            const especie = document.getElementById('especie').value.trim();
            const variedad = document.getElementById('variedad').value.trim();

            if (!nombre || !especie || !variedad) {
                alert('Por favor completa todos los campos.');
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/lote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420' },
                    body: JSON.stringify({ nombre, especie, variedad })
                });
                const data = await res.json();

                if (res.ok && data.id) {
                    localStorage.setItem('loteId', data.id);
                    window.location.href = 'add_img.html';
                } else {
                    alert('Error al crear el lote: ' + (data?.error || 'Error desconocido'));
                }
            } catch (err) {
                console.error(err);
                alert('Error de red al crear el lote.');
            }
        });
    }

    // =====================
    // ESCÁNER QR
    // =====================

    /**
     * Procesa el contenido leído del QR y lo asigna a los campos del formulario
     * @param {string} qrData Texto decodificado del QR
     */
    const processQRData = (qrData) => {
        console.log('QR detectado:', qrData);
        const lines = qrData.split('\n').map(line => line.trim());
        document.getElementById('nombre').value = lines[0] || '';
        document.getElementById('especie').value = lines[1] || '';
        document.getElementById('variedad').value = lines[2] || '';
    };

    /**
     * Detiene el escáner QR y oculta el contenedor
     */
    const stopScanner = () => {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.stop()
                .then(() => {
                    qrReader.style.display = 'none';
                    html5QrcodeScanner = null;
                })
                .catch(err => console.error(err));
        }
    };

    /**
     * Solicita permisos de cámara usando el plugin diagnostic de Cordova
     * @returns {Promise<boolean>} True si se concedió el permiso
     */
    const ensureCameraPermission = async () => {
        if (!cordova.plugins.diagnostic) throw new Error('Plugin diagnostic no disponible');

        const isAuthorized = await new Promise((resolve, reject) =>
            cordova.plugins.diagnostic.isCameraAuthorized(resolve, reject)
        );

        if (isAuthorized) return true;

        const status = await new Promise((resolve, reject) =>
            cordova.plugins.diagnostic.requestCameraAuthorization(resolve, reject)
        );

        return status === cordova.plugins.diagnostic.permissionStatus.GRANTED;
    };

    /**
     * Inicia el escaneo QR
     */
    const iniciarEscaneo = async () => {
        try {
            if (!cordovaReady) throw new Error('Cordova no está listo');

            const cameraGranted = await ensureCameraPermission();
            if (!cameraGranted) throw new Error('Permiso de cámara denegado');

            qrReader.style.display = 'block';
            await new Promise(r => setTimeout(r, 300));

            html5QrcodeScanner = new Html5Qrcode('qr-reader');
            await html5QrcodeScanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: 250 },
                decodedText => { processQRData(decodedText); stopScanner(); },
                error => console.warn(error)
            );
        } catch (err) {
            console.error(err);
            errorMessage.textContent = err.message;
            if (err.message.includes('Permiso de cámara') && confirm('Abrir configuración para habilitarlo?')) {
                cordova.plugins.diagnostic.switchToSettings();
            }
        }
    };

    // =====================
    // CORDOVA READY
    // =====================
    document.addEventListener('deviceready', () => {
        cordovaReady = true;

        const permissions = cordova.plugins.permissions;
        permissions.checkPermission(permissions.CAMERA, (status) => {
            if (!status.hasPermission) {
                permissions.requestPermission(permissions.CAMERA, (st) => {
                    console.log("Permiso concedido:", st.hasPermission);
                }, () => alert("La app necesita permiso de cámara"));
            }
        });

        if (scanQRBtn) {
            scanQRBtn.addEventListener('click', () => {
                if (!html5QrcodeScanner) iniciarEscaneo();
                else { stopScanner(); qrResult.textContent = ''; errorMessage.textContent = ''; }
            });
        }
    }, false);
});

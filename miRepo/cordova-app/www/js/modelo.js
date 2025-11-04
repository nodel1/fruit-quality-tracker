/** URL del backend de YOLO que procesa las imágenes */
const YOLO_API_URL = "http://192.168.1.183:8001/predict/";

/** Elemento input de tipo file para seleccionar o capturar imágenes */
const fileInput = document.getElementById("fileInput");
/** Contenedor para mostrar la vista previa de las imágenes seleccionadas */
const previewContainer = document.getElementById("previewContainer");
/** Contenedor donde se mostrarán los resultados de la predicción */
const resultDiv = document.getElementById("result");
/** Botón para tomar foto con la cámara del dispositivo */
const takePhotoBtn = document.getElementById("takePhotoBtn");
/** Botón para seleccionar imágenes desde la galería del dispositivo */
const selectPhotoBtn = document.getElementById("selectPhotoBtn");
/** Contenedor para imágenes clasificadas como buen estado */
const goodStateDiv = document.getElementById("goodState");
/** Contenedor para imágenes clasificadas como mal estado */
const badStateDiv = document.getElementById("badState");

/**
 * Evento para tomar foto directamente con la cámara.
 * Se activa el atributo capture del input y se abre la cámara.
 */
takePhotoBtn.addEventListener("click", () => {
  fileInput.setAttribute("capture", "environment");
  fileInput.click();
});

/**
 * Evento para seleccionar imágenes desde la galería.
 * Se elimina el atributo capture del input.
 */
selectPhotoBtn.addEventListener("click", () => {
  fileInput.removeAttribute("capture");
  fileInput.click();
});

/**
 * Evento al cambiar el input de archivos.
 * Previsualiza las imágenes seleccionadas, las envía al backend YOLO
 * y muestra los resultados, incluyendo recortes por clase y gráficas.
 */
fileInput.addEventListener("change", async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) {
    resultDiv.innerHTML = "Por favor, selecciona imágenes válidas.";
    return;
  }

  // Limpiar vistas previas y resultados anteriores
  previewContainer.innerHTML = "";
  goodStateDiv.innerHTML = "";
  badStateDiv.innerHTML = "";
  resultDiv.innerHTML = "Procesando imágenes... ⏳";

  // Previsualizar todas las imágenes seleccionadas
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement("img");
      img.src = e.target.result;
      previewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  // Preparar FormData para enviar las imágenes al backend
  const formData = new FormData();
  Array.from(files).forEach(file => formData.append("files", file));

  try {
    const res = await fetch(YOLO_API_URL, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    console.log(data);

    let resultsArray = Array.isArray(data.results) ? data.results : [data];

    // Estadísticas totales de las clases
    let totalStats = { buenEstado: 0, malEstado: 0 };

    // Procesar resultados de cada imagen
    resultsArray.forEach(result => {
      const stats = result.stats || {};
      for (const [cls, count] of Object.entries(stats)) {
        totalStats[cls] = (totalStats[cls] || 0) + count;
      }

      // Mostrar recortes de cada predicción según la clase
      (result.predictions || []).forEach(pred => {
        const img = document.createElement("img");
        img.src = `data:image/jpeg;base64,${pred.crop_base64}`;

        if (pred.class_name === "buenEstado") {
          goodStateDiv.appendChild(img);
        } else {
          badStateDiv.appendChild(img);
        }
      });
    });

    // Mostrar estadísticas totales en formato JSON
    resultDiv.innerHTML = `<pre>${JSON.stringify(totalStats, null, 2)}</pre>`;

    // Graficar estadísticas totales usando Chart.js
    const ctx = document.getElementById("chart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: Object.keys(totalStats),
        datasets: [{
          label: "Cantidad total",
          data: Object.values(totalStats),
          backgroundColor: ["green", "red"]
        }]
      }
    });

  } catch (err) {
    console.error(err);
    resultDiv.innerHTML = "❌ Error al enviar las imágenes: " + err.message;
  }
});

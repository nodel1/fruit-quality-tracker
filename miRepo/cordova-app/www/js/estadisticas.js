/**
 * URL del endpoint del modelo YOLO para predicción.
 * @type {string}
 */
const YOLO_API_URL = "http://localhost:8001/predict/";
const previewContainer = document.getElementById("previewContainer");
const resultDiv = document.getElementById("result");
const inmaduraDiv = document.getElementById("inmadura");
const pocoMaduraDiv = document.getElementById("pocoMadura");
const maduraDiv = document.getElementById("madura");
const buenEstadoDiv = document.getElementById("buenEstado");
const malEstadoDiv = document.getElementById("malEstado");
/** Variable para almacenar el gráfico principal */
let myChart = null;

/**
 * Carga las imágenes de un lote desde el backend, envía las imágenes al modelo YOLO,
 * procesa los resultados para generar estadísticas y gráficos, y las muestra en la interfaz.
 *
 * @async
 */

async function loadAndProcessImages() {
  const loteId = localStorage.getItem("lote_id_estadisticas");
  document.getElementById("loteInfo").innerText = loteId
    ? `Lote ID: ${loteId}`
    : "⚠️ No hay lote seleccionado";
  if (!loteId) return;


  try {
    const response = await fetch(`${API_BASE_URL}/imagenes?lote_id=${loteId}`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!response.ok) throw new Error(`Error al obtener imágenes: ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("El backend no devolvió JSON válido.");
    }

    const data = await response.json();
    if (!data.success || !data.images || data.images.length === 0) {
      resultDiv.innerHTML = "⚠️ No hay imágenes para este lote.";
      return;
    }

    // Mostrar previews
    previewContainer.innerHTML = "";
    const formData = new FormData();
    data.images.forEach((image, idx) => {
      const col = document.createElement("div");
      col.className = "col-md-3 col-sm-4 col-6 mb-3";
      const img = document.createElement("img");
      img.src = `data:image/jpeg;base64,${image.imagen}`;
      img.className = "preview-img img-fluid";
      col.appendChild(img);
      previewContainer.appendChild(col);

      // Convertir a Blob para enviar a YOLO
      const byteCharacters = atob(image.imagen);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: "image/jpeg" });
      formData.append("files", blob, image.nombre || `img_${idx}.jpg`);
    });

    // Enviar a YOLO
    resultDiv.innerHTML = "⏳ Procesando imágenes...";
    const res = await fetch(YOLO_API_URL, { method: "POST", body: formData });
    if (!res.ok) throw new Error(`Error en YOLO API: ${res.status}`);

    const resType = res.headers.get("content-type") || "";
    if (!resType.includes("application/json")) {
      throw new Error("YOLO no devolvió JSON válido.");
    }

    const { results } = await res.json();
    console.log("Respuesta YOLO:", results);

    // Limpiar recortes anteriores
    inmaduraDiv.innerHTML = "";
    pocoMaduraDiv.innerHTML = "";
    maduraDiv.innerHTML = "";
    buenEstadoDiv.innerHTML = "";
    malEstadoDiv.innerHTML = "";

    /** Objetos para almacenar estadísticas agregadas */
    let totalStats = { inmadura: 0, pocoMadura: 0, madura: 0, buenEstado: 0, malEstado: 0 };
    let calibresMedios = [];
    let desviacionesCalibre = [];
    let porcentajesDefectos = [];
    let porcentajesFueraCalibre = [];
    let indicesColorMedio = [];
    let desviacionesColor = [];

    results.forEach(result => {
      // Procesar estadísticas de color
      if (result.color_stats) {
        for (const [className, count] of Object.entries(result.color_stats)) {
          if (className in totalStats) {
            totalStats[className] += count;
          }
        }
      }

      // Procesar estadísticas de estado
      if (result.estado_stats) {
        for (const [className, count] of Object.entries(result.estado_stats)) {
          if (className in totalStats) {
            totalStats[className] += count;
          }
        }
      }

      // Acumular métricas de estado
      if (result.estado_calibre_medio_por_clase) {
        const valores = Object.values(result.estado_calibre_medio_por_clase).map(Number);
        if (valores.length)
          calibresMedios.push(valores.reduce((a, b) => a + b, 0) / valores.length);
      }

      if (result.estado_desviacion_calibre_por_clase) {
        const valores = Object.values(result.estado_desviacion_calibre_por_clase).map(Number);
        if (valores.length)
          desviacionesCalibre.push(valores.reduce((a, b) => a + b, 0) / valores.length);
      }

      if (result.estado_porcentaje_defectos !== undefined)
        porcentajesDefectos.push(result.estado_porcentaje_defectos);

      if (result.estado_porcentaje_fuera_calibre !== undefined)
        porcentajesFueraCalibre.push(result.estado_porcentaje_fuera_calibre);

      // Acumular métricas de color
      if (result.color_indice_color_medio !== undefined)
        indicesColorMedio.push(result.color_indice_color_medio);

      if (result.color_desviacion_color !== undefined)
        desviacionesColor.push(result.color_desviacion_color);

       const cropCounters = {
         inmadura: 0,
         pocoMadura: 0,
         madura: 0,
         buenEstado: 0,
         malEstado: 0
       };
      // Mostrar recortes según clase
      (result.predictions || []).forEach(pred => {

        if (!pred.crop_base64) return;

        // Verificar si ya se alcanzó el límite de 5 recortes por clase
        if (cropCounters[pred.class_name] >= 5) return

        const img = document.createElement("img");
        img.src = `data:image/jpeg;base64,${pred.crop_base64}`;
        img.className = "crop-img";

        const infoDiv = document.createElement("div");
        infoDiv.className = "crop-info";
        infoDiv.innerHTML = `
          <span>Conf: ${(pred.confidence * 100).toFixed(1)}%</span>
          ${pred.calibre_relativo ? `<span>Calibre: ${pred.calibre_relativo}</span>` : ''}
        `;

        const container = document.createElement("div");
        container.className = "crop-container";
        container.appendChild(img);
        container.appendChild(infoDiv);

        // Clasificar según el tipo de clase
        switch(pred.class_name) {
          case "inmadura":
            inmaduraDiv.appendChild(container);
            break;
          case "pocoMadura":
            pocoMaduraDiv.appendChild(container);
            break;
          case "madura":
            maduraDiv.appendChild(container);
            break;
          case "buenEstado":
            buenEstadoDiv.appendChild(container);
            break;
          case "malEstado":
            malEstadoDiv.appendChild(container);
            break;
        }
        // Incrementar contador de la clase
        cropCounters[pred.class_name]++;
      });
    });

    /** Función auxiliar para calcular promedio de un array */
    const avg = arr =>
      arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3) : "N/A";

    // Mostrar resultados
    resultDiv.innerHTML = `
      <div class="results-container">
        <div class="results-section">
          <h5>Conteo total</h5>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Inmadura:</span>
              <span class="stat-value">${totalStats.inmadura}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Poco madura:</span>
              <span class="stat-value">${totalStats.pocoMadura}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Madura:</span>
              <span class="stat-value">${totalStats.madura}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Buen Estado:</span>
              <span class="stat-value">${totalStats.buenEstado}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Mal Estado:</span>
              <span class="stat-value">${totalStats.malEstado}</span>
            </div>
          </div>
        </div>

        <div class="results-section">
          <h5>Métricas promedio</h5>
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-label">Calibre medio:</span>
              <span class="metric-value">${avg(calibresMedios)} cm</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Desviación calibre:</span>
              <span class="metric-value">${avg(desviacionesCalibre)} cm</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">% Defectos:</span>
              <span class="metric-value">${avg(porcentajesDefectos)}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">% Fuera calibre:</span>
              <span class="metric-value">${avg(porcentajesFueraCalibre)}%</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Índice color medio:</span>
              <span class="metric-value">${avg(indicesColorMedio)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Desv. color:</span>
              <span class="metric-value">${avg(desviacionesColor)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // ====================
    // Bloque final: gráficos
    // ====================

   // Función auxiliar para convertir string/N/A a número
   const safeNum = val => (isNaN(parseFloat(val)) ? 0 : parseFloat(val));

   // Variables independientes para cada gráfico - DEBEN COINCIDIR CON LAS QUE USAS
   let chartMetrics = null;
   let chartDistribucionMadurez = null;
   let chartDistribucionEstado = null;
   let chartEvolucion = null;

   // 1️⃣ Gráfico de métricas (barras comparativas)
   const ctxBar = document.getElementById("chartMetrics").getContext("2d");
   if (chartMetrics) chartMetrics.destroy();
   chartMetrics = new Chart(ctxBar, {
     type: "bar",
     data: {
       labels: ["% Defectos", "% Fuera calibre", "Calibre medio", "Índice color"],
       datasets: [
         {
           label: "Valor promedio",
           data: [
             safeNum(avg(porcentajesDefectos)),
             safeNum(avg(porcentajesFueraCalibre)),
             safeNum(avg(calibresMedios)),
             safeNum(avg(indicesColorMedio))
           ],
           backgroundColor: ["#e74c3c", "#f39c12", "#2ecc71", "#3498db"]
         }
       ]
     },
     options: {
       responsive: true,
       plugins: {
         title: {
           display: true,
           text: "Métricas promedio del lote",
           font: { size: 18 }
         },
         tooltip: {
           callbacks: {
             label: ctx => `${ctx.dataset.label}: ${ctx.formattedValue}`
           }
         }
       },
       scales: {
         y: { beginAtZero: true, title: { display: true, text: "Valor" } }
       }
     }
   });

   // 2️⃣ Gráfico de distribución de colores (pie chart)
   const ctxPieMadurez = document.getElementById("chartDistribucionMadurez").getContext("2d");
   if (chartDistribucionMadurez) chartDistribucionMadurez.destroy();
   chartDistribucionMadurez = new Chart(ctxPieMadurez, {
     type: "pie",
     data: {
       labels: ["Inmadura", "Poco madura", "Madura"],
       datasets: [
         {
           label: "Distribución de madurez de frutas",
           data: [
             totalStats.inmadura,
             totalStats.pocoMadura,
             totalStats.madura
           ],
           backgroundColor: ["#27ae60", "#f1c40f", "#e67e22"]
         }
       ]
     },
     options: {
       responsive: true,
       plugins: {
         title: {
           display: true,
           text: "Distribución de madurez",
           font: { size: 12 }
         }
       }
     }
   });

   // 3️⃣ Gráfico de distribución de estados (pie chart)
   const ctxPieEstado = document.getElementById("chartDistribucionEstado").getContext("2d");
   if (chartDistribucionEstado) chartDistribucionEstado.destroy();
   chartDistribucionEstado = new Chart(ctxPieEstado, {
     type: "pie",
     data: {
       labels: ["Buen Estado", "Mal Estado"], // Corregí "buenEstao" a "Buen Estado"
       datasets: [
         {
           label: "Distribución de estado de frutas",
           data: [
             totalStats.buenEstado,
             totalStats.malEstado
           ],
           backgroundColor: ["#2ecc71", "#e74c3c"]
         }
       ]
     },
     options: {
       responsive: true,
       plugins: {
         title: {
           display: true,
           text: "Distribución de estados",
           font: { size: 12 }
         }
       }
     }
   });

   // 4️⃣ Gráfico de evolución (línea de calibres por imagen procesada)
   if (calibresMedios.length > 1 && indicesColorMedio.length === calibresMedios.length) {
     const ctxLine = document.getElementById("chartEvolucion").getContext("2d");
     if (chartEvolucion) chartEvolucion.destroy();
     chartEvolucion = new Chart(ctxLine, {
       type: "line",
       data: {
         labels: calibresMedios.map((_, i) => `Img ${i + 1}`),
         datasets: [
           {
             label: "Calibre medio",
             data: calibresMedios,
             borderColor: "#8e44ad",
             fill: false,
             tension: 0.2
           },
           {
             label: "Índice color medio",
             data: indicesColorMedio,
             borderColor: "#2980b9",
             fill: false,
             tension: 0.2
           }
         ]
       },
       options: {
         responsive: true,
         plugins: {
           title: {
             display: true,
             text: "Evolución de calibre y color por imagen",
             font: { size: 18 }
           },
           tooltip: {
             mode: 'index',
             intersect: false
           }
         },
         interaction: {
           mode: 'nearest',
           axis: 'x',
           intersect: false
         },
         scales: {
           y: { beginAtZero: true }
         }
       }
     });
   }

   } catch (err) {
     console.error(err);
     resultDiv.innerHTML = `
       <div class="alert alert-danger">
         <strong>Error al procesar imágenes:</strong> ${err.message}
       </div>
     `;
   }
   }

   /** Inicia la carga y procesamiento de imágenes cuando el DOM está listo */
   document.addEventListener("DOMContentLoaded", loadAndProcessImages);
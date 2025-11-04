from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import numpy as np
import cv2
import base64
import traceback
from concurrent.futures import ThreadPoolExecutor

# --- Configuración de FastAPI ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

executor = ThreadPoolExecutor(max_workers=4)

# --- Configuración de modelos y parámetros ---
MODEL_CONFIGS = {
    "estado": {"path": "best.pt", "clases_defecto": {"malEstado"}},
    "color": {"path": "bestColor.pt", "color_index_map": {"inmadura": 0, "pocoMadura": 50, "madura": 100}},
}

PX_TO_CM = 0.04
calibre_min_cm = 6.9
calibre_max_cm = 8.5

# Cargamos los modelos
models = {name: YOLO(cfg["path"]) for name, cfg in MODEL_CONFIGS.items()}

# --- Funciones auxiliares ---
def run_model(model, img):
    """Ejecuta un modelo YOLO sobre una imagen."""
    return model.predict(img)

def encode_crop(img, bbox):
    """Recorta la imagen según bbox y la codifica en base64."""
    x1, y1, x2, y2 = bbox
    crop = img[y1:y2, x1:x2]
    if crop.size == 0:
        return ""
    _, buffer = cv2.imencode('.jpg', crop)
    return base64.b64encode(buffer).decode("utf-8")

def process_predictions(results, model_name, img):
    """Procesa los resultados de un modelo, calculando estadísticas y crops."""
    h, w = img.shape[:2]
    predictions = []
    stats = {}
    calibres_por_clase = {}
    defectos_count = 0
    fuera_calibre_count = 0

    cfg = MODEL_CONFIGS[model_name]

    for box in results[0].boxes:
        x1, y1, x2, y2 = map(lambda v: int(round(v.item())), box.xyxy[0])
        conf = float(box.conf[0])
        cls_id = int(box.cls[0])
        class_name = models[model_name].names[cls_id]


        x1, x2 = max(0, x1), min(w, x2)
        y1, y2 = max(0, y1), min(h, y2)

        calibre_cm = None
        stats[class_name] = stats.get(class_name, 0) + 1

        if model_name == "estado":
            # Cálculo de calibre
            ancho_px = (x2 - x1)
            alto_px = (y2 - y1)
            ancho_cm = ancho_px * PX_TO_CM
            alto_cm = alto_px * PX_TO_CM
            calibre_cm = (ancho_cm + alto_cm) / 2.0

            if class_name not in calibres_por_clase:
                calibres_por_clase[class_name] = []
            calibres_por_clase[class_name].append(calibre_cm)

            if class_name in cfg.get("clases_defecto", set()):
                defectos_count += 1

            if calibre_cm < calibre_min_cm or calibre_cm > calibre_max_cm:
                fuera_calibre_count += 1

        crop_b64 = encode_crop(img, (x1, y1, x2, y2))
        predictions.append({
            "bbox": [x1, y1, x2, y2],
            "confidence": conf,
            "class_id": cls_id,
            "class_name": class_name,
            "crop_base64": crop_b64,
            "calibre_relativo": round(calibre_cm, 4) if calibre_cm is not None else None
        })

    # Preparar resultados específicos por modelo
    result_data = {
        "predictions": predictions,
        "stats": stats
    }

    if model_name == "estado":
        total = sum(stats.values()) if stats else 1
        stats_percentage = {
            clase: f"{(count / total * 100):.1f}%"
            for clase, count in stats.items()
        }

        result_data.update({
            "stats_percentage": stats_percentage,
            "calibre_medio_por_clase": {clase: round(np.mean(calibres), 4)
                                        for clase, calibres in calibres_por_clase.items()},
            "desviacion_calibre_por_clase": {clase: round(np.std(calibres), 4)
                                             for clase, calibres in calibres_por_clase.items()},
            "porcentaje_defectos": round((defectos_count / total) * 100, 1),
            "porcentaje_fuera_calibre": round((fuera_calibre_count / total) * 100, 1)
        })

    elif model_name == "color":
        color_values = []
        color_predictions = {k: [] for k in cfg["color_index_map"]}
        for p in predictions:
            cls_name = p["class_name"]
            if cls_name in cfg["color_index_map"]:
                color_values.append(cfg["color_index_map"][cls_name])
                color_predictions[cls_name].append({
                    "bbox": p["bbox"],
                    "crop_base64": p["crop_base64"]
                })

        result_data.update({
            "indice_color_medio": round(np.mean(color_values), 1) if color_values else 0,
            "desviacion_color": round(np.std(color_values), 1) if color_values else 0,
            "color_predictions": color_predictions
        })

    return result_data

# --- Endpoint principal ---
@app.post("/predict/")
async def predict(files: list[UploadFile] = File(...)):
    try:
        all_results = []

        for file in files:
            image_data = await file.read()
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                raise HTTPException(status_code=400, detail=f"Imagen no válida: {file.filename}")

            # Ejecutar todos los modelos en paralelo
            futures = {name: executor.submit(run_model, m, img) for name, m in models.items()}
            model_results = {name: futures[name].result() for name in models.keys()}

            # Procesar resultados manteniendo separados por modelo
            processed_results = {}
            for name, res in model_results.items():
                processed_results[name] = process_predictions(res, name, img)

            # Combinar resultados sin sobrescribir
            combined = {
                "filename": file.filename,
                "color_stats": processed_results["color"]["stats"],
                "estado_stats": processed_results["estado"]["stats"],
            }

            # Agregar todas las métricas específicas de cada modelo
            for name, res in processed_results.items():
                for key, value in res.items():
                    if key not in ["predictions", "stats"]:
                        combined[f"{name}_{key}"] = value

            # Agregar todas las predicciones
            all_predictions = []
            for name, res in processed_results.items():
                all_predictions.extend(res.get("predictions", []))
            combined["predictions"] = all_predictions

            all_results.append(combined)

        return {"results": all_results}

    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error interno en el servidor")
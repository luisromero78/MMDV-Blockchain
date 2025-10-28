# 🧠 Reto 2 – Análisis y simulación del funcionamiento de una red blockchain

Comparativa entre los protocolos de consenso **Proof of Work (PoW)** y **Proof of Stake (PoS)**  
Proyecto desarrollado por **Luis Romero – MMDV Blockchain Lab**

---

## 📘 Documentación técnica
[📄 Descargar PDF](./Documentacion_Reto2_LuisRomero_MMDV_clean.pdf)

## 🎨 Presentación visual
[📊 Ver presentación](./MMDV_Reto2_Presentacion_v4.pdf)

## 🎬 Reel resumen
[▶️ Ver reel en formato vertical](./MMDV_Reto2_Reel_vFinal_Extended.mp4)

---

## 💻 Simulación y resultados

La simulación fue desarrollada en **Python 3.11**, utilizando las librerías `hashlib`, `time`, `random` y `json`.  
Se implementaron los protocolos de consenso:

- **Proof of Work (PoW):** validación mediante minería computacional con dificultad ajustable.  
- **Proof of Stake (PoS):** validación mediante selección ponderada de validadores según su participación.

El script genera un archivo CSV con los tiempos de ejecución de ambos protocolos.

📄 **Archivos incluidos:**
- [🧠 Código fuente – `Reto2_LuisRomero.py`](./Reto2_LuisRomero.py)  
- [📊 Resultados CSV – `resultados_reto2_timings.csv`](./resultados_reto2_timings.csv)

---

### 🔬 **Resumen de resultados**

| Protocolo | Tiempo total | Promedio por bloque | Observaciones |
|------------|---------------|----------------------|----------------|
| PoW | 6.00 s | 1.20 s | Mayor consumo de recursos, alta seguridad |
| PoS | 0.05 s | 0.01 s | Alta eficiencia, bajo consumo energético |

---

> “Trust is not imposed, it is validated.”  
> — *MMDV Blockchain*

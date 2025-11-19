from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import requests
import base64
from requests_oauthlib import OAuth1

app = FastAPI(
    title="MMDV X Bot",
    version="1.0.0",
    description="Bot de X para MMDV, desplegado en Render.",
)

# ---------- MODELOS ----------

class TweetRequest(BaseModel):
    text: str


class TweetWithImagePayload(BaseModel):
    text: str
    # Puede ser:
    #  - base64 "puro"
    #  - ó un data URL tipo "data:image/png;base64,AAAA..."
    image_base64: str


# ---------- CONFIG X (OAuth 1.0a User Context) ----------

TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_TOKEN_SECRET = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")


def get_oauth1():
    """
    Devuelve el objeto OAuth1 para firmar TODAS las peticiones
    (texto y texto+imagen) con contexto de usuario.
    """
    if not all(
        [
            TWITTER_API_KEY,
            TWITTER_API_SECRET,
            TWITTER_ACCESS_TOKEN,
            TWITTER_ACCESS_TOKEN_SECRET,
        ]
    ):
        raise RuntimeError("Faltan variables de entorno de X (OAuth1)")
    return OAuth1(
        TWITTER_API_KEY,
        TWITTER_API_SECRET,
        TWITTER_ACCESS_TOKEN,
        TWITTER_ACCESS_TOKEN_SECRET,
    )


# ---------- ENDPOINTS BÁSICOS ----------

@app.get("/")
def root():
    return {"status": "ok", "message": "MMDV X Bot funcionando ✔️"}


@app.get("/health")
def health():
    return {"ok": True}


# ---------- HELPERS X ----------

def upload_image_to_x(image_bytes: bytes) -> str:
    """
    Sube una imagen a X y devuelve media_id_string.
    Usa API v1.1 + OAuth1 usuario.
    """
    oauth = get_oauth1()
    url = "https://upload.twitter.com/1.1/media/upload.json"

    files = {"media": image_bytes}

    try:
        resp = requests.post(url, files=files, auth=oauth, timeout=30)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": "Error de red al subir la imagen a X", "error": str(e)},
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=resp.status_code,
            detail={
                "message": "Error al subir la imagen a X",
                "x_status": resp.status_code,
                "x_body": resp.text,
            },
        )

    data = resp.json()
    media_id = data.get("media_id_string") or data.get("media_id")
    if not media_id:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "X no devolvió media_id para la imagen",
                "x_body": data,
            },
        )

    return media_id


def post_tweet_to_x(text: str, media_ids: list[str] | None = None):
    """
    Publica un tweet (con o sin imagen) usando API v2 + OAuth1 usuario.
    """
    oauth = get_oauth1()
    url = "https://api.twitter.com/2/tweets"

    payload: dict = {"text": text}
    if media_ids:
        payload["media"] = {"media_ids": media_ids}

    try:
        resp = requests.post(url, json=payload, auth=oauth, timeout=30)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": "Error de red al publicar el tweet", "error": str(e)},
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=resp.status_code,
            detail={
                "message": "Error al publicar el tweet en X",
                "x_status": resp.status_code,
                "x_body": resp.text,
            },
        )

    return resp.json()


# ---------- ENDPOINT: SOLO TEXTO ----------

@app.post("/tweet")
def tweet_text(payload: TweetRequest):
    """
    Publica un tweet de solo texto usando OAuth1 usuario.
    """
    data = post_tweet_to_x(payload.text)
    return {
        "message": "Tweet de texto publicado correctamente",
        "x_response": data,
    }


# ---------- ENDPOINT: TEXTO + IMAGEN ----------

@app.post("/tweet-with-image")
def tweet_with_image(payload: TweetWithImagePayload):
    """
    Publica un tweet con una sola imagen.

    Acepta:
    - base64 "puro"
    - o data URL tipo "data:image/png;base64,AAAA..."
    """
    img_b64 = (payload.image_base64 or "").strip()

    if not img_b64:
        raise HTTPException(
            status_code=400,
            detail={"message": "image_base64 está vacío"},
        )

    # Si viene como data URL, quitar el prefijo "data:image/...;base64,"
    if img_b64.startswith("data:image"):
        try:
            img_b64 = img_b64.split(",", 1)[1]
        except Exception:
            raise HTTPException(
                status_code=400,
                detail={"message": "Formato data URL inválido en image_base64"},
            )

    # 1) decodificar base64
    try:
        image_bytes = base64.b64decode(img_b64)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"message": "Base64 inválido en image_base64", "error": str(e)},
        )

    # 2) subir imagen y obtener media_id
    media_id = upload_image_to_x(image_bytes)

    # 3) publicar tweet con ese media_id
    data = post_tweet_to_x(payload.text, media_ids=[media_id])

    return {
        "message": "Tweet con imagen publicado correctamente",
        "media_id": media_id,
        "x_response": data,
    }

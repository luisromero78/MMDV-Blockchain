from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import requests
import base64
from requests_oauthlib import OAuth1

app = FastAPI(
    title="MMDV X Bot",
    version="1.1.0",
    description="Bot de X para MMDV, desplegado en Render.",
)

# ---------- MODELOS ----------

class TweetRequest(BaseModel):
    text: str

class TweetWithImagePayload(BaseModel):
    text: str
    # Puede ser:
    #  - UNA URL (http/https) a la imagen
    #  - O un string base64 (con o sin prefijo "data:image/...;base64,")
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
    if not all([TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET]):
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
            detail={"message": "X no devolvió media_id para la imagen", "x_body": data},
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


# ---------- ENDPOINT: TEXTO + IMAGEN (URL o BASE64) ----------

def _get_image_bytes_from_payload(image_field: str) -> bytes:
    """
    Acepta:
      - una URL http/https
      - o un string base64 (con o sin prefijo data:image/...;base64,)
    y devuelve los bytes de la imagen.
    """
    if not image_field or not image_field.strip():
        raise HTTPException(
            status_code=400,
            detail={"message": "image_base64 está vacío"},
        )

    raw = image_field.strip()

    # Caso 1: URL -> la descargamos
    if raw.startswith("http://") or raw.startswith("https://"):
        try:
            resp = requests.get(raw, timeout=30)
        except Exception as e:
            raise HTTPException(
                status_code=502,
                detail={"message": "Error de red al descargar la imagen desde la URL", "error": str(e)},
            )

        if resp.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail={
                    "message": "No se pudo descargar la imagen desde la URL",
                    "http_status": resp.status_code,
                    "http_body": resp.text,
                },
            )

        return resp.content

    # Caso 2: Base64 (con o sin prefijo data:image/...)
    b64_str = raw
    if raw.startswith("data:image"):
        # quitar "data:image/...;base64,"
        try:
            b64_str = raw.split(",", 1)[1]
        except Exception:
            raise HTTPException(
                status_code=400,
                detail={"message": "Formato data:image inválido en image_base64"},
            )

    try:
        image_bytes = base64.b64decode(b64_str)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"message": "Base64 inválido en image_base64", "error": str(e)},
        )

    return image_bytes


@app.post("/tweet-with-image")
def tweet_with_image(payload: TweetWithImagePayload):
    """
    Publica un tweet con una sola imagen.
    - payload.image_base64 puede ser:
        * una URL http/https
        * o un base64 (con o sin prefijo data:image/...;base64,)
    """
    # 1) obtener bytes de la imagen (URL o base64)
    image_bytes = _get_image_bytes_from_payload(payload.image_base64)

    # 2) subir imagen y obtener media_id
    media_id = upload_image_to_x(image_bytes)

    # 3) publicar tweet con ese media_id
    data = post_tweet_to_x(payload.text, media_ids=[media_id])

    return {
        "message": "Tweet con imagen publicado correctamente",
        "media_id": media_id,
        "x_response": data,
    }

@app.post("/tweet-with-image-url")
def tweet_with_image_url(payload: TweetWithImageUrlPayload):
    """
    Publica un tweet con texto + imagen descargada desde una URL.
    Esto nos permite usar el response_format=URL de OpenAI en Make.
    """
    access_token = TWITTER_USER_ACCESS_TOKEN
    if not access_token:
        raise HTTPException(status_code=500, detail="Falta TWITTER_USER_ACCESS_TOKEN")

    # 1️⃣ Descargar la imagen desde la URL que nos pasa Make
    try:
        img_resp = requests.get(payload.image_url, timeout=10)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"message": "Error al descargar la imagen", "error": str(e)},
        )

    if img_resp.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "No se pudo descargar la imagen",
                "status": img_resp.status_code,
                "url": payload.image_url,
            },
        )

    image_bytes = img_resp.content

    # 2️⃣ Subir imagen a X
    upload_url = "https://upload.twitter.com/1.1/media/upload.json"
    headers_upload = {
        "Authorization": f"Bearer {access_token}",
    }
    files = {
        "media": image_bytes,
    }

    resp_upload = requests.post(upload_url, headers=headers_upload, files=files)
    data_upload = resp_upload.json()

    if "media_id_string" not in data_upload:
        raise HTTPException(
            status_code=400,
            detail={"message": "Error al subir la imagen a X", "x_response": data_upload},
        )

    media_id = data_upload["media_id_string"]

    # 3️⃣ Crear tweet con la imagen
    tweet_url = "https://api.twitter.com/2/tweets"
    tweet_body = {
        "text": payload.text,
        "media": {"media_ids": [media_id]},
    }
    headers_tweet = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    resp_tweet = requests.post(tweet_url, headers=headers_tweet, json=tweet_body)
    data_tweet = resp_tweet.json()

    if resp_tweet.status_code != 201:
        raise HTTPException(
            status_code=resp_tweet.status_code,
            detail={"message": "Error al crear el tweet", "x_response": data_tweet},
        )

    return {"message": "Tweet publicado con imagen vía URL", "tweet": data_tweet}


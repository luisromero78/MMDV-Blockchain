from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import requests
from urllib.parse import urlencode
from base64 import b64decode
from requests_oauthlib import OAuth1

app = FastAPI(
    title="MMDV X Bot",
    version="0.6.0",
    description="Bot de X para MMDV, desplegado en Render.",
)

# ---------- MODELOS ----------

class TweetRequest(BaseModel):
    text: str

class TweetWithImagePayload(BaseModel):
    text: str
    # IMPORTANTE: solo el base64 puro, SIN 'data:image/png;base64,'
    image_base64: str


# ---------- CONFIG GLOBAL X ----------

TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")

TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID")
TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET")

# OAuth 1.0a (para subir imágenes)
TWITTER_API_KEY = os.getenv("TWITTER_API_KEY")
TWITTER_API_SECRET = os.getenv("TWITTER_API_SECRET")
TWITTER_ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
TWITTER_ACCESS_TOKEN_SECRET = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")

TWITTER_REDIRECT_URI = "https://mmdv-blockchain.onrender.com/auth/callback"
TWITTER_SCOPES = "tweet.read tweet.write users.read offline.access"

# ---------- HELPERS ----------

def get_bearer_headers() -> dict:
    """
    Headers para llamadas con Bearer token (texto simple a /2/tweets).
    """
    if not TWITTER_BEARER_TOKEN:
        raise RuntimeError("TWITTER_BEARER_TOKEN no está configurado en Render.")
    return {
        "Authorization": f"Bearer {TWITTER_BEARER_TOKEN}",
        "Content-Type": "application/json",
    }


def get_oauth1_session() -> OAuth1:
    """
    Crea el objeto OAuth1 para las llamadas que requieren OAuth 1.0a
    (subida de imágenes, etc.).
    """
    missing = [
        name
        for name, value in [
            ("TWITTER_API_KEY", TWITTER_API_KEY),
            ("TWITTER_API_SECRET", TWITTER_API_SECRET),
            ("TWITTER_ACCESS_TOKEN", TWITTER_ACCESS_TOKEN),
            ("TWITTER_ACCESS_TOKEN_SECRET", TWITTER_ACCESS_TOKEN_SECRET),
        ]
        if not value
    ]
    if missing:
        raise RuntimeError(
            f"Faltan variables de entorno para OAuth1: {', '.join(missing)}"
        )

    return OAuth1(
        TWITTER_API_KEY,
        TWITTER_API_SECRET,
        TWITTER_ACCESS_TOKEN,
        TWITTER_ACCESS_TOKEN_SECRET,
    )


# ---------- ENDPOINTS BÁSICOS ----------

@app.get("/")
async def root():
    return {"message": "MMDV X Bot en marcha 🧠🍷"}


@app.post("/tweet")
async def post_tweet(payload: TweetRequest):
    """
    Publica un post SOLO TEXTO usando API v2 con Bearer token.
    """
    url = "https://api.twitter.com/2/tweets"
    headers = get_bearer_headers()
    body = {"text": payload.text}

    resp = requests.post(url, headers=headers, json=body)

    if resp.status_code != 201:
        raise HTTPException(
            status_code=resp.status_code,
            detail={
                "message": "Error al publicar el tweet de texto",
                "x_status": resp.status_code,
                "x_body": resp.text,
            },
        )

    return resp.json()


# ---------- AUTH (PKCE) PARA FUTURO SI QUEREMOS REFRESCAR TOKENS ----------

@app.get("/auth/login")
async def auth_login():
    """
    Construye la URL de autorización (opcional, para flujo OAuth2/PKCE).
    De momento no la estamos usando para las imágenes.
    """
    params = {
        "response_type": "code",
        "client_id": TWITTER_CLIENT_ID,
        "redirect_uri": TWITTER_REDIRECT_URI,
        "scope": TWITTER_SCOPES,
        "state": "mmdv-state",
        "code_challenge": "challenge",
        "code_challenge_method": "plain",
    }
    url = "https://twitter.com/i/oauth2/authorize?" + urlencode(params)
    return {"auth_url": url}


@app.get("/auth/callback")
async def auth_callback(request: Request):
    """
    Endpoint de callback (no lo estamos usando aún para refrescar tokens).
    """
    params = dict(request.query_params)
    return {"received_params": params}


# ---------- ENDPOINT TWEET + IMAGEN ----------

@app.post("/tweet-with-image")
async def tweet_with_image(payload: TweetWithImagePayload):
    """
    1) Sube una imagen PNG a X con OAuth 1.0a (upload.twitter.com v1.1)
    2) Publica un tweet con ese media_id usando API v2 (tweets)
    """
    # 1. Decodificar el base64 que nos llega del cliente
    try:
        image_bytes = b64decode(payload.image_base64)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"message": "image_base64 no es un base64 válido", "error": str(e)},
        )

    # 2. Subir imagen a X con OAuth1
    upload_url = "https://upload.twitter.com/1.1/media/upload.json"
    oauth1 = get_oauth1_session()

    files = {
        # OJO: aquí ya van los bytes puros de la imagen
        "media": ("image.png", image_bytes, "image/png"),
    }

    upload_resp = requests.post(upload_url, files=files, auth=oauth1)

    if upload_resp.status_code != 200:
        # Devolvemos TODO lo que X responde para poder depurar
        return JSONResponse(
            status_code=upload_resp.status_code,
            content={
                "detail": {
                    "message": "Error al subir la imagen a X",
                    "x_status": upload_resp.status_code,
                    "x_body": upload_resp.text,
                }
            },
        )

    media_id = upload_resp.json().get("media_id_string") or upload_resp.json().get("media_id")
    if not media_id:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Respuesta de X sin media_id al subir imagen",
                "x_body": upload_resp.text,
            },
        )

    # 3. Crear tweet con esa imagen (API v2).
    #    También lo firmamos con OAuth1 para ir “a juego” con la subida.
    tweet_url = "https://api.twitter.com/2/tweets"
    tweet_body = {
        "text": payload.text,
        "media": {"media_ids": [str(media_id)]},
    }

    tweet_resp = requests.post(tweet_url, json=tweet_body, auth=oauth1)

    if tweet_resp.status_code != 201:
        return JSONResponse(
            status_code=tweet_resp.status_code,
            content={
                "detail": {
                    "message": "Imagen subida, pero error al publicar el tweet",
                    "x_status": tweet_resp.status_code,
                    "x_body": tweet_resp.text,
                }
            },
        )

    return tweet_resp.json()


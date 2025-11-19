from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
import requests
import base64
from urllib.parse import urlencode

# =========================================================
#  CONFIG APP
# =========================================================

app = FastAPI(
    title="MMDV X Bot",
    version="0.8.0",
    description="Bot de X para MMDV, desplegado en Render.",
)

# =========================================================
#  MODELOS
# =========================================================

class TweetRequest(BaseModel):
    text: str


class TweetWithImagePayload(BaseModel):
    text: str
    # Importante: SIN el prefijo "data:image/png;base64,"
    image_base64: str


# =========================================================
#  CONFIG TWITTER/X
# =========================================================

TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID")
TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET")
TWITTER_USER_ACCESS_TOKEN = os.getenv("TWITTER_USER_ACCESS_TOKEN")

TWITTER_REDIRECT_URI = os.getenv(
    "TWITTER_REDIRECT_URI",
    "https://mmdv-blockchain.onrender.com/auth/callback",
)

TWITTER_SCOPES = os.getenv(
    "TWITTER_SCOPES",
    "tweet.read tweet.write users.read offline.access",
)

# Para PKCE (simple, estático)
CODE_VERIFIER = os.getenv("TWITTER_CODE_VERIFIER", "mmdv-static-code-verifier")

# Endpoints de X
TWITTER_API_TWEET_URL = "https://api.twitter.com/2/tweets"
TWITTER_API_MEDIA_UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json"
TWITTER_API_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
TWITTER_API_AUTH_URL = "https://twitter.com/i/oauth2/authorize"

if not TWITTER_USER_ACCESS_TOKEN:
    raise RuntimeError(
        "Falta TWITTER_USER_ACCESS_TOKEN en las variables de entorno. "
        "Configúralo en Render antes de arrancar la app."
    )


# =========================================================
#  ENDPOINTS BÁSICOS
# =========================================================

@app.get("/")
def root():
    return {"message": "MMDV X Bot is running", "docs": "/docs", "health": "/health"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "mmdv-x-bot"}


# =========================================================
#  TWEETS SIN IMAGEN
# =========================================================

@app.post("/tweet")
def create_tweet(payload: TweetRequest):
    headers = {
        "Authorization": f"Bearer {TWITTER_USER_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    data = {"text": payload.text}

    resp = requests.post(
        TWITTER_API_TWEET_URL,
        headers=headers,
        json=data,
        timeout=30,
    )

    if not resp.ok:
        raise HTTPException(
            status_code=resp.status_code,
            detail={
                "message": "Error al publicar el tweet en X",
                "x_response": resp.text,
            },
        )

    return resp.json()


# =========================================================
#  TWEETS CON IMAGEN
# =========================================================

@app.post("/tweet-with-image")
def tweet_with_image(payload: TweetWithImagePayload):
    # 1) Decodificar el base64 -> bytes
    try:
        image_bytes = base64.b64decode(payload.image_base64, validate=True)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"message": "image_base64 no es un base64 válido", "error": str(e)},
        )

    # 2) Subir la imagen a X (media/upload)
    media_headers = {
        "Authorization": f"Bearer {TWITTER_USER_ACCESS_TOKEN}",
    }
    files = {
        "media": ("image.png", image_bytes, "image/png"),
    }

    media_resp = requests.post(
        TWITTER_API_MEDIA_UPLOAD_URL,
        headers=media_headers,
        files=files,
        timeout=30,
    )

    if not media_resp.ok:
        raise HTTPException(
            status_code=media_resp.status_code,
            detail={
                "message": "Error al subir la imagen a X",
                "x_response": media_resp.text,
            },
        )

    media_json = media_resp.json()
    media_id = media_json.get("media_id_string")

    if not media_id:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "No se obtuvo media_id_string al subir la imagen",
                "x_response": media_json,
            },
        )

    # 3) Crear el tweet con esa imagen
    tweet_headers = {
        "Authorization": f"Bearer {TWITTER_USER_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    tweet_body = {
        "text": payload.text,
        "media": {"media_ids": [media_id]},
    }

    tweet_resp = requests.post(
        TWITTER_API_TWEET_URL,
        headers=tweet_headers,
        json=tweet_body,
        timeout=30,
    )

    if not tweet_resp.ok:
        raise HTTPException(
            status_code=tweet_resp.status_code,
            detail={
                "message": "Error al publicar el tweet con imagen en X",
                "x_response": tweet_resp.text,
            },
        )

    return tweet_resp.json()


# =========================================================
#  AUTH (OPCIONAL, PARA FUTURO)
# =========================================================

@app.get("/auth/login")
def auth_login():
    """
    Genera la URL de login de X y redirige allí.
    Necesita TWITTER_CLIENT_ID configurado.
    """
    if not TWITTER_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="TWITTER_CLIENT_ID no está configurado en las variables de entorno",
        )

    params = {
        "response_type": "code",
        "client_id": TWITTER_CLIENT_ID,
        "redirect_uri": TWITTER_REDIRECT_URI,
        "scope": TWITTER_SCOPES,
        "state": "mmdv-state",
        "code_challenge": CODE_VERIFIER,
        "code_challenge_method": "plain",
    }

    url = f"{TWITTER_API_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url)


@app.get("/auth/callback")
async def auth_callback(request: Request, code: str | None = None, state: str | None = None):
    """
    Callback de X. Intercambia el "code" por un access_token.
    (Por ahora solo devuelve el JSON tal cual para copiar/pegar manualmente.)
    """
    if code is None:
        raise HTTPException(status_code=400, detail="Falta el parámetro 'code' en la URL")

    if not TWITTER_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="TWITTER_CLIENT_ID no está configurado en las variables de entorno",
        )

    data = {
        "grant_type": "authorization_code",
        "client_id": TWITTER_CLIENT_ID,
        "redirect_uri": TWITTER_REDIRECT_URI,
        "code_verifier": CODE_VERIFIER,
        "code": code,
    }

    resp = requests.post(
        TWITTER_API_TOKEN_URL,
        data=data,
        timeout=30,
    )

    if not resp.ok:
        raise HTTPException(
            status_code=resp.status_code,
            detail={
                "message": "Error al intercambiar el código por token en X",
                "x_response": resp.text,
            },
        )

    return resp.json()


@app.get("/auth/check-token")
def auth_check_token():
    """
    Simple: comprueba si hay TWITTER_USER_ACCESS_TOKEN cargado.
    """
    return {"has_user_access_token": bool(TWITTER_USER_ACCESS_TOKEN)}


# =========================================================
#  MAIN LOCAL (no se usa en Render, pero útil para pruebas)
# =========================================================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

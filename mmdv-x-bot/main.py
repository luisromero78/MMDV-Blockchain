from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import os
import requests
from urllib.parse import urlencode
from base64 import b64encode
import base64

app = FastAPI(
    title="MMDV X Bot",
    version="0.6.0",
    description="Bot de X para MMDV, desplegado en Render.",
)

# ---------- MODELOS ----------

class TweetRequest(BaseModel):
    text: str


class TweetWithImagePayload(BaseModel):
    # Cadena base64 SIN el prefijo "data:image/png;base64,"
    text: str
    image_base64: str


# ---------- CONFIG GLOBAL X ----------

TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")  # por si lo usamos en el futuro
TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID")
TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET")
TWITTER_USER_ACCESS_TOKEN = os.getenv("TWITTER_USER_ACCESS_TOKEN")

TWITTER_REDIRECT_URI = "https://mmdv-blockchain.onrender.com/auth/callback"
TWITTER_SCOPES = "tweet.read tweet.write users.read offline.access"


def get_basic_auth_header() -> str:
    """
    Construye Authorization: Basic <base64(client_id:client_secret)>
    para el intercambio code -> tokens (Authorization Code con client secreto).
    """
    if not TWITTER_CLIENT_ID or not TWITTER_CLIENT_SECRET:
        raise RuntimeError("Faltan TWITTER_CLIENT_ID o TWITTER_CLIENT_SECRET")

    creds = f"{TWITTER_CLIENT_ID}:{TWITTER_CLIENT_SECRET}".encode("utf-8")
    return "Basic " + b64encode(creds).decode("utf-8")


# ---------- ENDPOINTS BÁSICOS ----------

@app.get("/health")
def health():
    return {"status": "ok", "service": "mmdv-x-bot"}


# ---------- TWEET SOLO TEXTO ----------

@app.post("/tweet")
def create_tweet(payload: TweetRequest):
    access_token = os.getenv("TWITTER_USER_ACCESS_TOKEN")
    if not access_token:
        raise HTTPException(
            status_code=500,
            detail="No hay TWITTER_USER_ACCESS_TOKEN configurado en el servidor",
        )

    url = "https://api.x.com/2/tweets"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    data = {"text": payload.text}

    resp = requests.post(url, headers=headers, json=data)

    if resp.status_code != 201:
        try:
            error_body = resp.json()
        except Exception:
            error_body = resp.text

        raise HTTPException(
            status_code=resp.status_code,
            detail={"message": "Error al crear el tweet", "x_response": error_body},
        )

    return resp.json()


# ---------- TWEET CON IMAGEN (UPLOAD + TWEET) ----------

@app.post("/tweet-with-image")
def tweet_with_image(payload: TweetWithImagePayload):
    access_token = os.getenv("TWITTER_USER_ACCESS_TOKEN")
    if not access_token:
        raise HTTPException(status_code=500, detail="Falta TWITTER_USER_ACCESS_TOKEN")

    # 1) Subir imagen a X (endpoint legacy de media)
    upload_url = "https://upload.twitter.com/1.1/media/upload.json"

    files = {
        "media": base64.b64decode(payload.image_base64)
    }

    headers_upload = {
        "Authorization": f"Bearer {access_token}",
    }

    resp_upload = requests.post(upload_url, headers=headers_upload, files=files)
    data_upload = resp_upload.json()

    if "media_id_string" not in data_upload:
        raise HTTPException(
            status_code=400,
            detail={"message": "Error al subir la imagen a X", "x_response": data_upload},
        )

    media_id = data_upload["media_id_string"]

    # 2) Crear tweet con la imagen
    tweet_url = "https://api.x.com/2/tweets"

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

    return {"message": "Tweet publicado con imagen", "tweet": data_tweet}


# ---------- OAUTH 2.0: LOGIN Y CALLBACK ----------

@app.get("/auth/login")
def auth_login():
    """
    Devuelve la URL de autorización de X para autorizar el bot.
    """
    if not TWITTER_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="No hay TWITTER_CLIENT_ID configurado",
        )

    params = {
        "response_type": "code",
        "client_id": TWITTER_CLIENT_ID,
        "redirect_uri": TWITTER_REDIRECT_URI,
        "scope": TWITTER_SCOPES,
        "state": "mmdv-x-bot",
        # PKCE ultra-simplificado (plain). Para producción: usar verificador aleatorio.
        "code_challenge": "plainchallenge",
        "code_challenge_method": "plain",
    }

    authorize_url = "https://x.com/i/oauth2/authorize?" + urlencode(params)
    return {"authorize_url": authorize_url}


@app.get("/auth/callback")
def auth_callback(code: str | None = None, state: str | None = None, request: Request | None = None):
    """
    Recibe el 'code' de X y lo intercambia por access_token + refresh_token.
    Devuelve el JSON para que copies el access_token y lo pongas en Render.
    """
    if not code:
        raise HTTPException(status_code=400, detail="Falta parámetro 'code' en la URL de callback")

    token_url = "https://api.x.com/2/oauth2/token"

    data = {
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": TWITTER_REDIRECT_URI,
        "code_verifier": "plainchallenge",  # debe coincidir EXACTO con code_challenge
    }

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": get_basic_auth_header(),
    }

    resp = requests.post(token_url, headers=headers, data=data)

    try:
        body = resp.json()
    except Exception:
        body = {"raw": resp.text}

    if resp.status_code != 200:
        raise HTTPException(
            status_code=resp.status_code,
            detail={
                "message": "Error al intercambiar el code por tokens",
                "x_response": body,
            },
        )

    return {
        "message": "Tokens obtenidos correctamente",
        "tokens": body,
        "state": state,
    }


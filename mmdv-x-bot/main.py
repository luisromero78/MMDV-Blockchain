from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import os
import requests
from urllib.parse import urlencode
from base64 import b64encode

app = FastAPI(
    title="MMDV X Bot",
    version="0.3.0",
    description="Bot de X para MMDV, desplegado en Render.",
)

# ---------- MODELOS ----------

class TweetRequest(BaseModel):
    text: str


# ---------- ENDPOINTS BÁSICOS ----------

@app.get("/health")
def health():
    return {"status": "ok", "service": "mmdv-x-bot"}


# ---------- CONFIG GLOBAL X ----------

TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")  # app-only (solo lectura)
TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID")
TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET")

# callback que has puesto en el Developer Portal de X
TWITTER_REDIRECT_URI = "https://mmdv-blockchain.onrender.com/auth/callback"

# scopes mínimos para poder postear en tu nombre
TWITTER_SCOPES = "tweet.read tweet.write users.read offline.access"


def get_basic_auth_header() -> str:
    """
    Construye el header Authorization: Basic <base64(client_id:client_secret)>
    para el intercambio de code -> token (confidential client).
    """
    if not TWITTER_CLIENT_ID or not TWITTER_CLIENT_SECRET:
        raise RuntimeError("Faltan TWITTER_CLIENT_ID o TWITTER_CLIENT_SECRET")

    creds = f"{TWITTER_CLIENT_ID}:{TWITTER_CLIENT_SECRET}".encode("utf-8")
    return "Basic " + b64encode(creds).decode("utf-8")


# ---------- PUBLICAR TWEET (de momento seguirá fallando 403 hasta usar user-token) ----------

@app.post("/tweet")
def create_tweet(payload: TweetRequest):
    """
    Intenta crear un tweet.
    De momento sigue usando el Bearer de app (TWITTER_BEARER_TOKEN),
    que X NO acepta para escribir (solo lectura). Lo dejaremos así
    hasta que tengamos el access_token de usuario guardado.
    """
    if not TWITTER_BEARER_TOKEN:
        raise HTTPException(status_code=500, detail="No hay TWITTER_BEARER_TOKEN configurado")

    url = "https://api.x.com/2/tweets"
    headers = {
        "Authorization": f"Bearer {TWITTER_BEARER_TOKEN}",
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
            detail={
                "message": "Error al crear el tweet",
                "x_response": error_body,
            },
        )

    return resp.json()


# ---------- OAUTH 2.0: LOGIN Y CALLBACK ----------

@app.get("/auth/login")
def auth_login():
    """
    Devuelve la URL de autorización de X para que autorices el bot.
    """
    if not TWITTER_CLIENT_ID:
        raise HTTPException(status_code=500, detail="No hay TWITTER_CLIENT_ID configurado")

    params = {
        "response_type": "code",
        "client_id": TWITTER_CLIENT_ID,
        "redirect_uri": TWITTER_REDIRECT_URI,
        "scope": TWITTER_SCOPES,
        "state": "mmdv-x-bot",
        # OJO: para simplificar usamos PKCE en modo 'plain'
        "code_challenge": "plainchallenge",
        "code_challenge_method": "plain",
    }

    authorize_url = "https://x.com/i/oauth2/authorize?" + urlencode(params)
    return {"authorize_url": authorize_url}


@app.get("/auth/callback")
def auth_callback(code: str = None, state: str = None, request: Request = None):
    """
    Recibe el 'code' de X y lo intercambia por access_token + refresh_token.
    Devolvemos el JSON tal cual para que puedas copiar los tokens.
    """
    if not code:
        raise HTTPException(status_code=400, detail="Falta parámetro 'code' en la URL de callback")

    token_url = "https://api.x.com/2/oauth2/token"

    data = {
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": TWITTER_REDIRECT_URI,
        "code_verifier": "plainchallenge",  # debe coincidir EXACTAMENTE con code_challenge
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

    # Aquí verás access_token, refresh_token, scope, token_type, expires_in...
    return {
        "message": "Tokens obtenidos correctamente",
        "tokens": body,
        "state": state,
    }

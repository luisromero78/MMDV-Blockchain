from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import os
import requests
from urllib.parse import urlencode
from base64 import b64encode

app = FastAPI(
    title="MMDV X Bot",
    version="0.4.0",
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

# App-only (solo lectura, lo dejamos por si lo usamos más adelante)
TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")

# Credenciales de la app (confidential client)
TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID")
TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET")

# Tokens de USUARIO (los que acabas de obtener con /auth/callback)
TWITTER_USER_ACCESS_TOKEN = os.getenv("TWITTER_USER_ACCESS_TOKEN")
TWITTER_USER_REFRESH_TOKEN = os.getenv("TWITTER_USER_REFRESH_TOKEN")

# Callback que has puesto en el Developer Portal de X
TWITTER_REDIRECT_URI = "https://mmdv-blockchain.onrender.com/auth/callback"

# Scopes mínimos para poder postear en tu nombre
TWITTER_SCOPES = "tweet.read tweet.write users.read offline.access"

# Endpoints OAuth2 de X
TOKEN_URL = "https://api.x.com/2/oauth2/token"
TWEET_URL = "https://api.x.com/2/tweets"


def get_basic_auth_header() -> str:
    """
    Construye el header Authorization: Basic <base64(client_id:client_secret)>
    para el intercambio de code -> token y para el refresh_token
    (confidential client).
    """
    if not TWITTER_CLIENT_ID or not TWITTER_CLIENT_SECRET:
        raise RuntimeError("Faltan TWITTER_CLIENT_ID o TWITTER_CLIENT_SECRET")

    creds = f"{TWITTER_CLIENT_ID}:{TWITTER_CLIENT_SECRET}".encode("utf-8")
    return "Basic " + b64encode(creds).decode("utf-8")


def refresh_user_access_token() -> str:
    """
    Usa el refresh_token para conseguir un nuevo access_token de usuario.
    Actualiza las variables globales TWITTER_USER_ACCESS_TOKEN y
    TWITTER_USER_REFRESH_TOKEN.
    """
    global TWITTER_USER_ACCESS_TOKEN, TWITTER_USER_REFRESH_TOKEN

    if not TWITTER_USER_REFRESH_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="No hay TWITTER_USER_REFRESH_TOKEN configurado para refrescar el token",
        )

    data = {
        "grant_type": "refresh_token",
        "refresh_token": TWITTER_USER_REFRESH_TOKEN,
        "client_id": TWITTER_CLIENT_ID,
    }

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": get_basic_auth_header(),
    }

    resp = requests.post(TOKEN_URL, headers=headers, data=data)

    try:
        body = resp.json()
    except Exception:
        body = {"raw": resp.text}

    if resp.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Error al refrescar el access_token de X",
                "x_response": body,
            },
        )

    new_access = body.get("access_token")
    new_refresh = body.get("refresh_token") or TWITTER_USER_REFRESH_TOKEN

    if not new_access:
        raise HTTPException(
            status_code=500,
            detail="No se recibió un nuevo access_token al refrescar el token",
        )

    # Actualizamos en memoria (en Render seguirán viniendo del env al arrancar)
    TWITTER_USER_ACCESS_TOKEN = new_access
    TWITTER_USER_REFRESH_TOKEN = new_refresh

    return new_access


# ---------- PUBLICAR TWEET (USANDO TOKEN DE USUARIO) ----------

@app.post("/tweet")
def create_tweet(payload: TweetRequest):
    """
    Crea un tweet usando el access_token de USUARIO (OAuth2 user context).
    Si el token está caducado/invalidado (401/403), intenta refrescarlo y reintenta una vez.
    """
    if not TWITTER_USER_ACCESS_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="No hay TWITTER_USER_ACCESS_TOKEN configurado. "
                   "Primero debes obtenerlo con /auth/login y /auth/callback "
                   "y guardarlo en las variables de entorno de Render.",
        )

    def _post_with_token(token: str):
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        data = {"text": payload.text}
        return requests.post(TWEET_URL, headers=headers, json=data)

    # 1º intento con el token actual
    resp = _post_with_token(TWITTER_USER_ACCESS_TOKEN)

    # Si está caducado/invalidado, X suele devolver 401 o 403
    if resp.status_code in (401, 403):
        # Intentamos refrescar el token y reintentamos una vez
        new_token = refresh_user_access_token()
        resp = _post_with_token(new_token)

    try:
        body = resp.json()
    except Exception:
        body = {"raw": resp.text}

    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=resp.status_code,
            detail={
                "message": "Error al crear el tweet",
                "x_response": body,
            },
        )

    return {
        "message": "Tweet publicado correctamente",
        "x_response": body,
    }


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

    resp = requests.post(TOKEN_URL, headers=headers, data=data)

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

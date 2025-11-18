from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import os
import requests
from urllib.parse import urlencode

app = FastAPI(
    title="MMDV X Bot",
    version="0.2.0",
    description="Bot de X para MMDV, desplegado en Render.",
)

# ---------- MODELOS ----------

class TweetRequest(BaseModel):
    text: str


# ---------- ENDPOINTS BÁSICOS ----------

@app.get("/health")
def health():
    return {"status": "ok", "service": "mmdv-x-bot"}


# ---------- PUBLICAR TWEET (de momento sigue usando Bearer de app) ----------

TWITTER_BEARER_TOKEN = os.getenv("TWITTER_BEARER_TOKEN")

@app.post("/tweet")
def create_tweet(payload: TweetRequest):
    """
    Intenta crear un tweet usando el Bearer Token de app.
    OJO: X exige user-context para escribir; con Bearer de app
    seguirá devolviendo 403 hasta que usemos OAuth 2 user-context.
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
        # Devolvemos el mensaje de error de X para verlo en Swagger
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

TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID")
# En X has configurado este callback:
TWITTER_REDIRECT_URI = "https://mmdv-blockchain.onrender.com/auth/callback"

# Scopes mínimos para postear en nombre del usuario
TWITTER_SCOPES = "tweet.read tweet.write users.read offline.access"


@app.get("/auth/login")
def auth_login():
    """
    Devuelve la URL de autorización de X para que autorices el bot.

    Paso 1: llamas a este endpoint
    Paso 2: copias/abres la URL que devuelve en el navegador
    Paso 3: X te pedirá autorización y redirigirá a /auth/callback
    """

    if not TWITTER_CLIENT_ID:
        raise HTTPException(status_code=500, detail="No hay TWITTER_CLIENT_ID configurado")

    params = {
        "response_type": "code",
        "client_id": TWITTER_CLIENT_ID,
        "redirect_uri": TWITTER_REDIRECT_URI,
        "scope": TWITTER_SCOPES,
        "state": "mmdv-x-bot",  # para probar nos vale algo fijo
        "code_challenge": "plainchallenge",  # placeholder por ahora
        "code_challenge_method": "plain",
    }

    authorize_url = "https://x.com/i/oauth2/authorize?" + urlencode(params)

    return {"authorize_url": authorize_url}


@app.get("/auth/callback")
def auth_callback(code: str = None, state: str = None, request: Request = None):
    """
    Stub para ver que X nos devuelve el 'code'.
    Más adelante aquí cambiaremos 'code' por access_token + refresh_token.
    """
    if not code:
        raise HTTPException(status_code=400, detail="Falta parámetro 'code' en la URL de callback")

    return {
        "message": "Callback recibido correctamente",
        "code": code,
        "state": state,
    }

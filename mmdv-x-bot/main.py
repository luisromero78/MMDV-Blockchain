from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import requests
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN")

app = FastAPI()


class TweetRequest(BaseModel):
    text: str


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "mmdv-x-bot"}


@app.post("/tweet")
def create_tweet(payload: TweetRequest):
    """
    Endpoint mínimo:
    - Recibe un JSON { "text": "mensaje" }
    - Llama a la API de X (cuando tengamos un token válido)
    """

    if not X_BEARER_TOKEN:
        raise HTTPException(
            status_code=500,
            detail="X_BEARER_TOKEN no está definido en las variables de entorno",
        )

    url = "https://api.x.com/2/tweets"
    headers = {
        "Authorization": f"Bearer {X_BEARER_TOKEN}",
        "Content-Type": "application/json",
    }
    data = {
        "text": payload.text
    }

    # Llamada real a X
    response = requests.post(url, headers=headers, json=data)

    if response.status_code >= 400:
        # Para debug: devolvemos la respuesta de X
        raise HTTPException(
            status_code=response.status_code,
            detail={
                "message": "Error al crear el tweet",
                "x_response": response.json()
            },
        )

    return {
        "status": "sent",
        "tweet_response": response.json()
    }


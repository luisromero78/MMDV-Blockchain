import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from requests_oauthlib import OAuth1Session

app = FastAPI(title="MMDV X Bot")

class Tweet(BaseModel):
    text: str


API_KEY = os.getenv("TWITTER_API_KEY")
API_SECRET = os.getenv("TWITTER_API_SECRET")
ACCESS_TOKEN = os.getenv("TWITTER_ACCESS_TOKEN")
ACCESS_TOKEN_SECRET = os.getenv("TWITTER_ACCESS_TOKEN_SECRET")


@app.get("/health")
def health():
    return {"status": "ok", "service": "mmdv-x-bot"}


@app.post("/tweet")
def create_tweet(tweet: Tweet):
    if not all([API_KEY, API_SECRET, ACCESS_TOKEN, ACCESS_TOKEN_SECRET]):
        raise HTTPException(
            status_code=500,
            detail="Faltan credenciales de X en las variables de entorno",
        )

    url = "https://api.x.com/2/tweets"

    oauth = OAuth1Session(
        API_KEY,
        client_secret=API_SECRET,
        resource_owner_key=ACCESS_TOKEN,
        resource_owner_secret=ACCESS_TOKEN_SECRET,
    )

    response = oauth.post(url, json={"text": tweet.text})

    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise HTTPException(status_code=response.status_code, detail=detail)

    return response.json()

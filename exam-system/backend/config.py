from dotenv import load_dotenv
import os

load_dotenv()  # Убедись, что он вызывается до os.getenv()
CLIENT_ID = "1371875153104994314"
CLIENT_SECRET = "wkRUWX3N4CFvoPhDghJ2Iwf83mTHYMjp"
REDIRECT_URI = "http://localhost:5000/callback"

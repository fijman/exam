
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, redirect, request, session, jsonify, send_from_directory
from flask_cors import CORS
import requests
from config import *
from db import db
from models import User
import os
import sqlite3

app = Flask(__name__, static_folder='../templates', static_url_path='/')
app.secret_key = os.urandom(24)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_HTTPONLY'] = True

CORS(app, supports_credentials=True)

db.init_app(app)

with app.app_context():
    db.create_all()

BASE_DISCORD_API_URL = "https://discord.com/api"


@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/login')
def login():
    return redirect(
        f"{BASE_DISCORD_API_URL}/oauth2/authorize"
        f"?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}"
        f"&response_type=code&scope=identify"
    )

@app.route('/callback')
def callback():
    code = request.args.get("code")
    if not code:
        return "Missing code", 400

    token_response = requests.post(f"{BASE_DISCORD_API_URL}/oauth2/token", data={
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': REDIRECT_URI,
        'scope': 'identify'
    }, headers={'Content-Type': 'application/x-www-form-urlencoded'})

    token_json = token_response.json()
    access_token = token_json.get("access_token")
    if not access_token:
        return "Token error", 400

    user_response = requests.get(f"{BASE_DISCORD_API_URL}/users/@me", headers={
        "Authorization": f"Bearer {access_token}"
    })

    user_data = user_response.json()
    user_id = user_data["id"]
    user = User.query.get(user_id)

    if not user:
        user = User(
            id=user_id,
            username=user_data["username"],
            discriminator=user_data["discriminator"],
            avatar=user_data["avatar"]
        )
        db.session.add(user)
        db.session.commit()

    session["user_id"] = user_id
    return redirect("/")  # Вернёт пользователя на главную
@app.route('/api/all_questions')
def all_questions():
    db_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'exam_database.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    questions = conn.execute(
        'SELECT id, test_type, text, points, explanation FROM questions'
    ).fetchall()
    conn.close()
    return jsonify([dict(q) for q in questions])
@app.route('/exam')
def exam():
    if not session.get("user_id"):
        return redirect('/')  # если пользователь не авторизован, отправить на главную
    return send_from_directory(app.static_folder, 'exam.html')

@app.route('/api/questions/<exam_type>')
def get_questions(exam_type):
    if not session.get("user_id"):
        return jsonify({"error": "Unauthorized"}), 401
    db_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'exam_database.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    questions = conn.execute(
        'SELECT id, text, points, explanation FROM questions WHERE test_type = ?',
        (exam_type,)
    ).fetchall()
    conn.close()
    return jsonify([dict(q) for q in questions])


@app.route('/logout')
def logout():
    session.clear()
    return jsonify({"success": True})

@app.route('/me')
def get_user():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"authenticated": False})
    user = User.query.get(user_id)
    if not user:
        return jsonify({"authenticated": False})
    return jsonify({
        "authenticated": True,
        "user": {
            "id": user.id,
            "username": f"{user.username}#{user.discriminator}",
            "avatar": user.avatar,
            "access_level": user.access_level
        }
    })
if __name__ == '__main__':
    app.run(debug=True)

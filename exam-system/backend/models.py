from db import db

class User(db.Model):
    id = db.Column(db.String(50), primary_key=True)  # Discord ID
    username = db.Column(db.String(100), nullable=False)
    discriminator = db.Column(db.String(10), nullable=False)
    avatar = db.Column(db.String(100))
    access_level = db.Column(db.String(20), default="user")

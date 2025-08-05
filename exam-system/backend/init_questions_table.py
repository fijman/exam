import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'exam_database.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute('''
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    text TEXT NOT NULL,
    points INTEGER NOT NULL,
    explanation TEXT NOT NULL
)
''')
conn.commit()
conn.close()
print("Таблица questions создана (если её не было).")
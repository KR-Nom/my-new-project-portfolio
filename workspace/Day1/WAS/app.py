import os

import psycopg2
from flask import Flask, jsonify, request
from psycopg2.extras import RealDictCursor

app = Flask(__name__)


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "board"),
        user=os.getenv("DB_USER", "board_user"),
        password=os.getenv("DB_PASSWORD", "board_password"),
    )


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/posts")
def list_posts():
    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT id, title, content, author, created_at
                FROM posts
                ORDER BY id DESC
                """
            )
            posts = cursor.fetchall()
    return jsonify(posts)


@app.get("/api/posts/<int:post_id>")
def get_post(post_id):
    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT id, title, content, author, created_at FROM posts WHERE id = %s",
                (post_id,),
            )
            post = cursor.fetchone()

    if post is None:
        return {"error": "게시글을 찾을 수 없습니다."}, 404
    return jsonify(post)


@app.post("/api/posts")
def create_post():
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    content = str(data.get("content", "")).strip()
    author = str(data.get("author", "")).strip()

    if not title or not content or not author:
        return {"error": "title, content, author는 필수입니다."}, 400

    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                INSERT INTO posts (title, content, author)
                VALUES (%s, %s, %s)
                RETURNING id, title, content, author, created_at
                """,
                (title, content, author),
            )
            post = cursor.fetchone()
    return jsonify(post), 201


@app.delete("/api/posts/<int:post_id>")
def delete_post(post_id):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM posts WHERE id = %s", (post_id,))
            if cursor.rowcount == 0:
                return {"error": "게시글을 찾을 수 없습니다."}, 404
    return {"message": "게시글이 삭제되었습니다."}

@app.put("/api/posts/<int:post_id>")
def put_post(post_id):
    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            data = request.get_json(silent=True) or {}
            title = data.get("title")
            content = data.get("content")
            author = data.get("author")
            cursor.execute(
                """
                UPDATE posts
                SET title = %s, content = %s, author = %s
                WHERE id = %s
                RETURNING id, title, content, author, created_at
                """,
                (title, content, author, post_id)
            )
            post = cursor.fetchone()
            if post is None:
                return {"error": "게시글을 찾을 수 없습니다."}, 404
            return jsonify(post)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)

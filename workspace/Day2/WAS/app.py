import os

import psycopg2
from flask import Flask, jsonify, redirect, render_template, request, url_for
from psycopg2.extras import RealDictCursor

app = Flask(__name__)
CATEGORIES = ["공지", "자유", "질문", "후기"]


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "board_day2"),
        user=os.getenv("DB_USER", "board_user"),
        password=os.getenv("DB_PASSWORD", "board_password"),
    )


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "day2-was"}


@app.get("/api/categories")
def list_categories():
    return jsonify(["전체", *CATEGORIES])


@app.route("/server-board", methods=["GET", "POST"])
def server_board():
    """방법 3: Flask가 DB 조회 결과를 HTML에 넣어 완성된 페이지를 반환한다."""
    if request.method == "POST":
        category = request.form.get("category", "자유").strip()
        title = request.form.get("title", "").strip()
        content = request.form.get("content", "").strip()
        author = request.form.get("author", "").strip()
        if category not in CATEGORIES or not title or not content or not author:
            return render_server_board("모든 항목을 올바르게 입력해주세요."), 400
        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO posts (category, title, content, author) VALUES (%s, %s, %s, %s)",
                    (category, title, content, author),
                )
        return redirect(url_for("server_board"))
    return render_server_board()


def render_server_board(error_message=None):
    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """SELECT id, category, title, content, author, is_notice, views, created_at
                   FROM posts ORDER BY is_notice DESC, id DESC LIMIT 20"""
            )
            posts = cursor.fetchall()
    return render_template(
        "server_board.html",
        posts=posts,
        categories=CATEGORIES[1:],
        error_message=error_message,
    )


@app.get("/api/posts")
def list_posts():
    page = max(request.args.get("page", 1, type=int), 1)
    size = min(max(request.args.get("size", 5, type=int), 1), 20)
    category = request.args.get("category", "전체")
    keyword = request.args.get("keyword", "").strip()
    offset = (page - 1) * size
    conditions = []
    values = []
    if category != "전체":
        conditions.append("category = %s")
        values.append(category)
    if keyword:
        conditions.append("(title ILIKE %s OR content ILIKE %s OR author ILIKE %s)")
        like_keyword = f"%{keyword}%"
        values.extend([like_keyword, like_keyword, like_keyword])
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(f"SELECT COUNT(*) AS total FROM posts {where}", values)
            total = cursor.fetchone()["total"]
            cursor.execute(
                f"""SELECT id, category, title, content, author, is_notice, views, created_at
                    FROM posts {where}
                    ORDER BY is_notice DESC, id DESC LIMIT %s OFFSET %s""",
                values + [size, offset],
            )
            posts = cursor.fetchall()
    return jsonify({"items": posts, "page": page, "size": size, "total": total})


@app.get("/api/posts/<int:post_id>")
def get_post(post_id):
    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """UPDATE posts SET views = views + 1
                   WHERE id = %s
                   RETURNING id, category, title, content, author, is_notice, views, created_at""",
                (post_id,),
            )
            post = cursor.fetchone()
    if post is None:
        return {"error": "게시글을 찾을 수 없습니다."}, 404
    return jsonify(post)


@app.post("/api/posts")
def create_post():
    data = request.get_json(silent=True) or {}
    category = str(data.get("category", "자유")).strip()
    title = str(data.get("title", "")).strip()
    content = str(data.get("content", "")).strip()
    author = str(data.get("author", "")).strip()
    if category not in CATEGORIES[1:]:
        return {"error": "등록 가능한 카테고리가 아닙니다."}, 400
    if not title or not content or not author:
        return {"error": "title, content, author는 필수입니다."}, 400
    if len(title) > 200 or len(author) > 50:
        return {"error": "제목은 200자, 작성자는 50자 이하여야 합니다."}, 400
    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """INSERT INTO posts (category, title, content, author)
                   VALUES (%s, %s, %s, %s)
                   RETURNING id, category, title, content, author, is_notice, views, created_at""",
                (category, title, content, author),
            )
            post = cursor.fetchone()
    return jsonify(post), 201


@app.put("/api/posts/<int:post_id>")
def update_post(post_id):
    data = request.get_json(silent=True) or {}
    category = str(data.get("category", "자유")).strip()
    title = str(data.get("title", "")).strip()
    content = str(data.get("content", "")).strip()
    author = str(data.get("author", "")).strip()
    if category not in CATEGORIES[1:] or not title or not content or not author:
        return {"error": "모든 항목을 올바르게 입력해주세요."}, 400
    if len(title) > 200 or len(author) > 50:
        return {"error": "제목은 200자, 작성자는 50자 이하여야 합니다."}, 400
    with get_connection() as connection:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """UPDATE posts SET category=%s, title=%s, content=%s, author=%s
                   WHERE id=%s
                   RETURNING id, category, title, content, author, is_notice, views, created_at""",
                (category, title, content, author, post_id),
            )
            post = cursor.fetchone()
    if post is None:
        return {"error": "게시글을 찾을 수 없습니다."}, 404
    return jsonify(post)


@app.delete("/api/posts/<int:post_id>")
def delete_post(post_id):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM posts WHERE id = %s", (post_id,))
            if cursor.rowcount == 0:
                return {"error": "게시글을 찾을 수 없습니다."}, 404
    return {"message": "게시글이 삭제되었습니다."}


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)

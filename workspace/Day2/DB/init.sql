CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    category VARCHAR(30) NOT NULL DEFAULT '자유',
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(50) NOT NULL,
    is_notice BOOLEAN NOT NULL DEFAULT FALSE,
    views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO posts (category, title, content, author, is_notice)
VALUES ('공지', 'Day2 게시판에 오신 것을 환영합니다.', 'Compose로 실행한 확장 게시판입니다.', '관리자', TRUE);

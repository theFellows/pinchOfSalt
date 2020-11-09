DROP TABLE IF EXISTS bookmarks;

CREATE TABLE bookmarks(
    id TEXT,
    name VARCHAR(200),
    category VARCHAR(200),
    area VARCHAR(200),
    image_url TEXT,
    video_url TEXT,
    ingredients TEXT,
    instructions TEXT,
    id_user TEXT
);

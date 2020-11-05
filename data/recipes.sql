DROP TABLE IF EXISTS recipes;

CREATE TABLE recipes(
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    category VARCHAR(200),
    area VARCHAR(200),
    image_url TEXT,
    video_url TEXT,
    ingredients TEXT,
    instructions TEXT
);

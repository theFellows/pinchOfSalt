DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS users;

CREATE TABLE recipes(
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    category VARCHAR(200),
    area VARCHAR(200),
    image_url TEXT,
    video_url TEXT,
    ingredients TEXT,
    instructions TEXT,
    id_user TEXT
);

CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password TEXT
);


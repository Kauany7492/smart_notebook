DROP DATABASE IF EXISTS smart_notebook;
CREATE DATABASE smart_notebook;
USE smart_notebook;

CREATE TABLE notebooks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#ffffff'
);

CREATE TABLE notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notebook_id INT NOT NULL,
    content TEXT,
    transcription TEXT,
    quick_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);
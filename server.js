require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

app.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        res.render('index', { notebooks: rows });
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/cadernos', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        res.render('cadernos', { notebooks: rows });
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/notebooks/create', async (req, res) => {
    try {
        await db.query('INSERT INTO notebooks (name, color) VALUES (?, ?)', [req.body.name, req.body.color]);
        res.redirect('/cadernos');
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/notebook/:id', async (req, res) => {
    try {
        const [all] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        const [nb] = await db.query('SELECT * FROM notebooks WHERE id = ?', [req.params.id]);
        const [nts] = await db.query('SELECT * FROM notes WHERE notebook_id = ? ORDER BY created_at DESC', [req.params.id]);
        if (!nb.length) return res.redirect('/cadernos');
        res.render('notebook', { notebooks: all, notebook: nb[0], notes: nts });
    } catch (e) { res.redirect('/cadernos'); }
});

app.get('/notebook/:id/podcast', async (req, res) => {
    try {
        const [nb] = await db.query('SELECT * FROM notebooks WHERE id = ?', [req.params.id]);
        res.render('podcast', { notebook: nb[0] });
    } catch (e) { res.redirect('/'); }
});

app.post('/notebooks/:id/process', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Crie um Plano de Ação HTML: ${req.body.quickNote} ${req.body.transcription}`;
        const result = await model.generateContent(prompt);
        await db.query('INSERT INTO notes (notebook_id, content) VALUES (?, ?)', [req.params.id, result.response.text()]);
        res.sendStatus(200);
    } catch (e) { res.status(500).send(e.message); }
});

app.delete('/delete-note/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
        res.sendStatus(200);
    } catch (e) { res.sendStatus(500); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
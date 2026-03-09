require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- CONFIGURAÇÕES DO APP ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CONEXÃO COM O BANCO DE DADOS ---
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    ssl: { 
        minVersion: 'TLSv1.2', 
        rejectUnauthorized: true 
    }
});

// --- ROTAS DO SISTEMA ---

// Rota 1: Home (Mostra os 2 cadernos mais recentes)
app.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        res.render('index', { notebooks: rows });
    } catch (error) {
        console.error("Erro na Home:", error);
        res.status(500).send("Erro ao carregar a Home.");
    }
});

// Rota 2: Listagem de todos os Cadernos (Com Busca)
app.get('/cadernos', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        res.render('cadernos', { notebooks: rows });
    } catch (error) {
        console.error("Erro ao carregar cadernos:", error);
        res.status(500).send("Erro ao carregar cadernos.");
    }
});

// Rota 3: Criar um Novo Caderno
app.post('/notebooks/create', async (req, res) => {
    const { name, color } = req.body;
    try {
        await db.query('INSERT INTO notebooks (name, color) VALUES (?, ?)', [name, color]);
        res.redirect('/cadernos');
    } catch (error) {
        console.error("Erro ao criar:", error);
        res.status(500).send("Erro ao criar caderno.");
    }
});

// Rota 4: Visualizar Caderno e suas Notas
app.get('/notebook/:id', async (req, res) => {
    try {
        const [allNotebooks] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        const [notebookRes] = await db.query('SELECT * FROM notebooks WHERE id = ?', [req.params.id]);
        const [notes] = await db.query('SELECT * FROM notes WHERE notebook_id = ? ORDER BY created_at DESC', [req.params.id]);

        if (notebookRes.length === 0) return res.redirect('/cadernos');

        res.render('notebook', { 
            notebooks: allNotebooks, 
            notebook: notebookRes[0], 
            notes: notes 
        });
    } catch (error) {
        console.error("Erro no notebook:", error);
        res.redirect('/cadernos');
    }
});

// Rota 5: Modo Podcast
app.get('/notebook/:id/podcast', async (req, res) => {
    try {
        const [notebookRes] = await db.query('SELECT * FROM notebooks WHERE id = ?', [req.params.id]);
        if (notebookRes.length === 0) return res.redirect('/');
        res.render('podcast', { notebook: notebookRes[0] });
    } catch (error) {
        res.redirect('/');
    }
});

// Rota 6: Processar Notas com Gemini IA
app.post('/notebooks/:id/process', async (req, res) => {
    const { transcription, quickNote } = req.body;
    const notebookId = req.params.id;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
            Atue como um organizador Notion. 
            Crie um Plano de Ação estruturado em HTML.
            Dados: ${quickNote} | ${transcription}
            Use tags como <h3>, <ul>, <li> e <table>.
        `;

        const result = await model.generateContent(prompt);
        const aiText = result.response.text();

        await db.query('INSERT INTO notes (notebook_id, content) VALUES (?, ?)', [notebookId, aiText]);
        res.sendStatus(200);
    } catch (error) {
        console.error("Erro na IA:", error);
        res.status(500).send("Erro ao processar.");
    }
});

// Rota 7: Excluir Nota
app.delete('/delete-note/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
        res.sendStatus(200);
    } catch (error) {
        res.status(500).send("Erro ao deletar.");
    }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

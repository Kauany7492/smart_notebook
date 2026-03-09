require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configurações do Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexão com o Banco de Dados (TiDB Cloud)
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

// --- ROTAS ---

// 1. HOME: Mostra os 2 cadernos mais recentes
app.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        res.render('index', { notebooks: rows });
    } catch (error) {
        console.error("Erro na Home:", error);
        res.status(500).send("Erro ao carregar a Home.");
    }
});

// 2. PÁGINA DE CADERNOS: Lista todos e permite busca
app.get('/cadernos', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        res.render('cadernos', { notebooks: rows });
    } catch (error) {
        console.error("Erro ao listar cadernos:", error);
        res.status(500).send("Erro ao carregar cadernos.");
    }
});

// 3. CRIAR NOVO CADERNO
app.post('/notebooks/create', async (req, res) => {
    const { name, color } = req.body;
    try {
        await db.query('INSERT INTO notebooks (name, color) VALUES (?, ?)', [name, color]);
        res.redirect('/cadernos');
    } catch (error) {
        console.error("Erro ao criar caderno:", error);
        res.status(500).send("Erro ao criar caderno.");
    }
});

// 4. VISUALIZAR CADERNO ESPECÍFICO
app.get('/notebook/:id', async (req, res) => {
    try {
        const [allNotebooks] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        const [notebookResult] = await db.query('SELECT * FROM notebooks WHERE id = ?', [req.params.id]);
        const [notes] = await db.query('SELECT * FROM notes WHERE notebook_id = ? ORDER BY created_at DESC', [req.params.id]);

        if (notebookResult.length === 0) return res.redirect('/cadernos');

        res.render('notebook', { 
            notebooks: allNotebooks, 
            notebook: notebookResult[0], 
            notes: notes 
        });
    } catch (error) {
        console.error("Erro ao abrir caderno:", error);
        res.redirect('/cadernos');
    }
});

// 5. PÁGINA DE PODCAST
app.get('/notebook/:id/podcast', async (req, res) => {
    try {
        const [notebookResult] = await db.query('SELECT * FROM notebooks WHERE id = ?', [req.params.id]);
        if (notebookResult.length === 0) return res.redirect('/');
        res.render('podcast', { notebook: notebookResult[0] });
    } catch (error) {
        console.error("Erro no podcast:", error);
        res.redirect('/');
    }
});

// 6. PROCESSAR COM IA (GEMINI)
app.post('/notebooks/:id/process', async (req, res) => {
    const { transcription, quickNote } = req.body;
    const notebookId = req.params.id;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
            Você é um assistente especializado em produtividade no estilo Notion.
            Transforme o seguinte conteúdo em um "Plano de Ação" extremamente organizado.
            Use Tabelas para prazos, Checklists para tarefas e Negrito para termos chave.
            Conteúdo para processar: 
            Rascunho: ${quickNote}
            Transcrição: ${transcription}
            Responda APENAS com o HTML das tags internas (ex: <h3>, <ul>, <li>, <table>), sem <html> ou <body>.
        `;

        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text();

        await db.query('INSERT INTO notes (notebook_id, content) VALUES (?, ?)', [notebookId, aiResponse]);
        res.sendStatus(200);
    } catch (error) {
        console.error("Erro na IA Gemini:", error);
        res.status(500).send("Erro ao processar com IA.");
    }
});

// 7. EXCLUIR NOTA
app.delete('/delete-note/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
        res.sendStatus(200);
    } catch (error) {
        console.error("Erro ao deletar nota:", error);
        res.status(500).send("Erro ao deletar.");
    }
});

// Porta e Inicialização
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

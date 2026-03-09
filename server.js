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
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
});

// --- ROTAS ---

// 1. HOME: Mostra os 2 cadernos mais recentes
app.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        res.render('index', { notebooks: rows }); // O index.ejs usará .slice(0,2)
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao carregar a Home.");
    }
});

// 2. PÁGINA DE CADERNOS: Lista todos e permite busca
app.get('/cadernos', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        res.render('cadernos', { notebooks: rows });
    } catch (error) {
        console.error(error);
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
        console.error(error);
        res.status(500).send("Erro ao criar caderno.");
    }
});

// 4. VISUALIZAR CADERNO ESPECÍFICO
app.get('/notebook/:id', async (req, res) => {
    try {
        const [allNotebooks] = await db.query('SELECT * FROM notebooks ORDER BY created_at DESC');
        const [notebook] = await db.query('SELECT * FROM notebooks WHERE id = ?',

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.json());

// --- ROTAS DE CADERNOS (NOTION STYLE) ---

// Listar todos os cadernos
app.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM notebooks');
        res.render('index', { notebooks: rows });
    } catch (error) {
        console.error("Erro ao listar cadernos:", error);
        res.status(500).send("Erro ao carregar o banco de dados.");
    }
});

// Criar novo caderno
app.post('/create-notebook', async (req, res) => {
    const { name, color } = req.body;
    try {
        await db.query('INSERT INTO notebooks (name, color) VALUES (?, ?)', [name, color || '#ffffff']);
        res.json({ success: true });
    } catch (error) {
        console.error("Erro ao criar caderno:", error);
        res.status(500).json({ error: "Erro ao salvar no banco." });
    }
});

// Deletar caderno
app.delete('/delete-notebook/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM notebooks WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erro ao deletar." });
    }
});

// --- ROTAS DE NOTAS (PLANO DE AÇÃO) ---

// Ver caderno específico e suas notas
app.get('/notebook/:id', async (req, res) => {
    try {
        const [notebook] = await db.query('SELECT * FROM notebooks WHERE id = ?', [req.params.id]);
        const [notes] = await db.query('SELECT * FROM notes WHERE notebook_id = ? ORDER BY created_at DESC', [req.params.id]);
        
        if (notebook.length === 0) return res.redirect('/');
        
        res.render('notebook', { notebook: notebook[0], notes });
    } catch (error) {
        console.error("Erro ao abrir caderno:", error);
        res.redirect('/');
    }
});

// Processar Áudio e Notas com Gemini IA
app.post('/notebook/:id/process', async (req, res) => {
    const { transcription, quickNote } = req.body;
    
    try {
        // ATUALIZAÇÃO: Usando gemini-1.5-flash-latest para evitar erro 404
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        
        const prompt = `Atue como um assistente de produtividade estilo Notion. 
                        Organize o seguinte conteúdo em um "Plano de Ação" estruturado.
                        Transcrição do áudio: ${transcription}. 
                        Notas rápidas do usuário: ${quickNote}.
                        Use formatação Markdown elegante.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Salva no banco de dados
        await db.query('INSERT INTO notes (notebook_id, content, transcription, quick_note) VALUES (?, ?, ?, ?)', 
            [req.params.id, responseText, transcription, quickNote]);
        
        res.json({ success: true });
    } catch (error) {
        console.error("Erro na IA Google Gemini:", error);
        res.status(500).json({ error: "A IA não conseguiu processar. Verifique sua chave API." });
    }
});

// Deletar nota específica
app.delete('/delete-note/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM notes WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erro ao apagar nota." });
    }
});

// --- ROTA PODCAST REVISÃO ---
app.get('/notebook/:id/podcast', async (req, res) => {
    try {
        const [notebook] = await db.query('SELECT * FROM notebooks WHERE id = ?', [req.params.id]);
        const [notes] = await db.query('SELECT * FROM notes WHERE notebook_id = ?', [req.params.id]);
        res.render('podcast', { notebook: notebook[0], notes });
    } catch (error) {
        res.redirect('/');
    }
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`
    🚀 Notion AI Online!
    📍 Local: http://localhost:${PORT}
    🌸 Estilo: Notion Clean & Minimalist
    `);

});

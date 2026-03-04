const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Altere se seu usuário for diferente
    password: '1234',      // Altere se tiver senha
    database: 'smart_notebook',
    waitForConnections: true,
    connectionLimit: 10
});

module.exports = pool;
import express from 'express';
import { DatabaseService } from './DatabaseService.js';

export class WebAdminService {
  private app: express.Application;
  private port: number;
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000') + 1;
    this.dbService = dbService;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.static('public'));
    this.app.use(express.json());

    // Простая аутентификация
    this.app.use((req, res, next) => {
      const token = req.query.token || req.headers.authorization;
      if (token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    });

    // Получить все таблицы
    this.app.get('/api/tables', (req, res) => {
      const db = this.dbService.getDb();
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      res.json(tables);
    });

    // Получить данные из таблицы
    this.app.get('/api/table/:name', (req, res) => {
      const db = this.dbService.getDb();
      try {
        const data = db.prepare(`SELECT * FROM ${req.params.name} LIMIT 100`).all();
        res.json(data);
      } catch (error: any) {
        res.status(400).json({ error: error?.message || 'Database error' });
      }
    });

    // Выполнить SQL запрос
    this.app.post('/api/query', (req, res) => {
      const db = this.dbService.getDb();
      try {
        const result = db.prepare(req.body.sql).all();
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error?.message || 'Query error' });
      }
    });

    // Простая HTML страница
    this.app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>SQLite Admin</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .query-box { width: 100%; height: 100px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>SQLite Database Admin</h1>
          <div>
            <h3>Execute SQL Query:</h3>
            <textarea class="query-box" id="sqlQuery" placeholder="SELECT * FROM users;"></textarea>
            <button onclick="executeQuery()">Execute</button>
          </div>
          <div id="result"></div>

          <script>
            const token = new URLSearchParams(window.location.search).get('token');
            
            async function executeQuery() {
              const sql = document.getElementById('sqlQuery').value;
              try {
                const response = await fetch('/api/query?token=' + token, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sql })
                });
                const data = await response.json();
                displayResult(data);
              } catch (error) {
                document.getElementById('result').innerHTML = '<p style="color: red;">Error: ' + error.message + '</p>';
              }
            }

            function displayResult(data) {
              if (Array.isArray(data) && data.length > 0) {
                const table = '<table><tr>' + 
                  Object.keys(data[0]).map(key => '<th>' + key + '</th>').join('') +
                  '</tr>' +
                  data.map(row => '<tr>' + Object.values(row).map(val => '<td>' + val + '</td>').join('') + '</tr>').join('') +
                  '</table>';
                document.getElementById('result').innerHTML = table;
              } else {
                document.getElementById('result').innerHTML = '<p>No results or query executed successfully</p>';
              }
            }

            // Load tables on page load
            window.onload = async () => {
              try {
                const response = await fetch('/api/tables?token=' + token);
                const tables = await response.json();
                console.log('Available tables:', tables);
              } catch (error) {
                console.error('Error loading tables:', error);
              }
            };
          </script>
        </body>
        </html>
      `);
    });
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Web admin interface available at port ${this.port}`);
      console.log(`Access with: ?token=${process.env.ADMIN_TOKEN}`);
    });
  }
}

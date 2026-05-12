require('dotenv').config();

const { createApp } = require('./app');
const { createDb } = require('./db');

const db = createDb(process.env.SQLITE_PATH || './data/app.db');
const app = createApp(db);
const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

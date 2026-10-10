import express from 'express';

import { api_ping } from './backend/api/ping.js';

const port = process.env.PORT || 3000;
const app = express();

// Permet de rendre accessible les fichiers dans le dossier "assets" via l'URL "http://localhost:3000/assets"
app.use("/assets", express.static("assets"));

// Permet de rendre accessible les fichiers dans le dossier "pages" via l'URL "http://localhost:3000/"
app.use("/", express.static("pages"));

// Permet d'exécuter le code JavaScript (la fonction api_ping) lorsque l'URL "http://localhost:3000/api/ping" est appelée
app.get('/api/ping', api_ping);

app.listen(port);
console.log(`Server is running on http://localhost:${port}`);
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import app from './src/server/app.js';

const port = Number(process.env.PORT || 3000);

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`RDU Clinics Satun running at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Unable to start local server', error);
  process.exitCode = 1;
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Domínio próprio via CNAME, então o site vive na raiz. A variável existe para
  // um eventual deploy de preview em `usuario.github.io/repositorio/`.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    target: 'es2022',
    // O three.js já sai num chunk próprio por causa do import dinâmico da cena
    // em GamePage — não é preciso forçar manualChunks.
    chunkSizeWarningLimit: 900,
  },
});

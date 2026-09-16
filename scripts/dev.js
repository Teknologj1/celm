#!/usr/bin/env node
"use strict";

/* Servidor de desenvolvimento: serve o site gerado e executa as funções de
 * /api no mesmo processo, imitando o que a Vercel faz em produção.
 *
 *   npm run dev
 *
 * Usa os arquivos de data/ como armazenamento, sem tocar no repositório
 * remoto. Para apontar ao GitHub, defina GITHUB_TOKEN e GITHUB_REPO. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const RAIZ = path.join(__dirname, "..");
const SAIDA = path.join(RAIZ, "dist");
const PORTA = Number(process.env.PORT) || 3000;

/* Desenvolvimento grava em data/ por padrão. Para exercitar o caminho real
   do GitHub, rode com CELM_ARMAZENAMENTO=github e as credenciais definidas. */
if (!process.env.CELM_ARMAZENAMENTO) process.env.CELM_ARMAZENAMENTO = "local";
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "desenvolvimento-local-" + "x".repeat(32);
}

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function gerar() {
  execFileSync(process.execPath, [path.join(RAIZ, "build.js"), "--out", "dist"], {
    stdio: "inherit"
  });
}

function servirArquivo(res, arquivo, status = 200) {
  const extensao = path.extname(arquivo).toLowerCase();
  res.statusCode = status;
  res.setHeader("Content-Type", TIPOS[extensao] || "application/octet-stream");
  res.setHeader("Cache-Control", "no-store");
  fs.createReadStream(arquivo).pipe(res);
}

/* Recarrega o módulo a cada chamada, para que editar a função valha na hora. */
function carregarFuncao(nome) {
  const arquivo = path.join(RAIZ, "api", nome + ".js");
  if (!fs.existsSync(arquivo)) return null;
  delete require.cache[require.resolve(arquivo)];
  Object.keys(require.cache)
    .filter((c) => c.includes(path.join("api", "_lib")))
    .forEach((c) => delete require.cache[c]);
  return require(arquivo);
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let caminho = decodeURIComponent(url.pathname);

  if (caminho.startsWith("/api/")) {
    const nome = caminho.slice(5).replace(/\/+$/, "");
    const funcao = carregarFuncao(nome);

    if (!funcao) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ erro: `Rota /api/${nome} não existe.` }));
    }

    try {
      return await funcao(req, res);
    } catch (falha) {
      console.error(`Erro em /api/${nome}:`, falha);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ erro: falha.message }));
    }
  }

  /* Estático, com as mesmas regras de URL da Vercel (cleanUrls +
     trailingSlash): /admin/login.html é servido em /admin/login/. */
  let arquivo = path.join(SAIDA, caminho);

  if (caminho.endsWith("/")) {
    const comoIndice = path.join(SAIDA, caminho, "index.html");
    const comoPagina = path.join(SAIDA, caminho.replace(/\/$/, "") + ".html");
    arquivo = fs.existsSync(comoIndice) ? comoIndice : comoPagina;
  }
  if (!arquivo.startsWith(SAIDA)) {
    res.statusCode = 403;
    return res.end("Acesso negado.");
  }

  if (fs.existsSync(arquivo) && fs.statSync(arquivo).isDirectory()) {
    arquivo = path.join(arquivo, "index.html");
  }
  if (!fs.existsSync(arquivo) && fs.existsSync(arquivo + ".html")) {
    arquivo += ".html";
  }
  if (!fs.existsSync(arquivo)) {
    const pagina404 = path.join(SAIDA, "404.html");
    if (fs.existsSync(pagina404)) return servirArquivo(res, pagina404, 404);
    res.statusCode = 404;
    return res.end("Não encontrado.");
  }

  return servirArquivo(res, arquivo);
});

gerar();
servidor.listen(PORTA, () => {
  console.log(`\n  Site:   http://localhost:${PORTA}/`);
  console.log(`  Painel: http://localhost:${PORTA}/admin/`);
  const alvo = process.env.CELM_ARMAZENAMENTO === "local"
    ? "arquivos locais em data/ (nada é enviado ao GitHub)"
    : `repositório ${process.env.GITHUB_REPO || "(GITHUB_REPO não definido)"}`;
  console.log(`  Dados:  ${alvo}\n`);
});

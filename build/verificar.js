#!/usr/bin/env node
"use strict";

/* Verificação pós-build: confere se todo link interno aponta para um
   arquivo que realmente existe. Uso: `npm test`. */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const IGNORAR = /^(https?:|mailto:|tel:|#|data:|javascript:)/i;

/* Em um GitHub Pages de projeto o site fica sob /<repo>/. Links absolutos
   (usados no 404) carregam esse prefixo, que não existe no disco. */
const BASE_PUBLICA = (() => {
  try {
    const centro = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/centro.json"), "utf8"));
    return centro.siteUrl ? new URL(centro.siteUrl).pathname.replace(/\/?$/, "/") : "/";
  } catch (erro) {
    return "/";
  }
})();

function listarHtml(dir, encontrados = []) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name.startsWith(".") || entrada.name === "node_modules") continue;
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) listarHtml(completo, encontrados);
    else if (entrada.name.endsWith(".html")) encontrados.push(completo);
  }
  return encontrados;
}

function resolver(arquivoHtml, href) {
  const semQuery = href.split("#")[0].split("?")[0];
  if (!semQuery) return null;

  let base;
  if (semQuery.startsWith("/")) {
    const semBase = semQuery.startsWith(BASE_PUBLICA)
      ? semQuery.slice(BASE_PUBLICA.length)
      : semQuery.replace(/^\/+/, "");
    base = path.join(RAIZ, semBase);
  } else {
    base = path.resolve(path.dirname(arquivoHtml), semQuery);
  }

  return semQuery.endsWith("/") || !path.extname(base)
    ? path.join(base, "index.html")
    : base;
}

const arquivos = listarHtml(RAIZ);
const problemas = [];
let total = 0;

for (const arquivo of arquivos) {
  const html = fs.readFileSync(arquivo, "utf8");
  const relativo = path.relative(RAIZ, arquivo);

  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = m[1];
    if (IGNORAR.test(href)) continue;
    total += 1;

    const alvo = resolver(arquivo, href);
    if (alvo && !fs.existsSync(alvo)) {
      problemas.push(`${relativo}: link quebrado -> ${href}`);
    }
  }

  /* O 404 é servido de caminhos arbitrários; seus links devem ser absolutos. */
  if (relativo === "404.html") {
    for (const m of html.matchAll(/href="((?!https?:|mailto:|tel:|#|\/)[^"]+)"/g)) {
      problemas.push(`404.html: link relativo -> ${m[1]}`);
    }
  }

  const titulos = html.match(/<h1[ >]/g) || [];
  if (titulos.length !== 1) {
    problemas.push(`${relativo}: esperado exatamente 1 <h1>, encontrado ${titulos.length}`);
  }
  if (!/<meta name="description" content="[^"]+"/.test(html)) {
    problemas.push(`${relativo}: meta description ausente ou vazia`);
  }
}

if (problemas.length) {
  console.error(`✗ ${problemas.length} problema(s) encontrado(s):`);
  problemas.forEach((p) => console.error("  - " + p));
  process.exit(1);
}

console.log(`✓ ${arquivos.length} páginas verificadas, ${total} links internos válidos`);

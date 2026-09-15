#!/usr/bin/env node
"use strict";

/* Gerador do site estático.
 *
 * Lê os arquivos de /data e escreve as páginas HTML na raiz do projeto,
 * prontas para o GitHub Pages. Uso: `npm run build`. */

const fs = require("fs");
const path = require("path");

const { carregar, RAIZ } = require("./build/dados");
const paginas = require("./build/paginas");

/* Diretórios gerados — apagados e reescritos a cada build. */
const GERADOS = ["empresas", "categorias", "torres", "vantagens", "o-centro", "cadastro"];
const ARQUIVOS_RAIZ = ["index.html", "404.html", "sitemap.xml", "robots.txt"];

function escrever(destinoRelativo, conteudo) {
  const destino = path.join(RAIZ, destinoRelativo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, conteudo, "utf8");
  return destinoRelativo;
}

function limpar() {
  GERADOS.forEach((dir) => {
    fs.rmSync(path.join(RAIZ, dir), { recursive: true, force: true });
  });
  ARQUIVOS_RAIZ.forEach((arquivo) => {
    fs.rmSync(path.join(RAIZ, arquivo), { force: true });
  });
}

function sitemap(dados, rotas) {
  const base = (dados.centro.siteUrl || "").replace(/\/$/, "");
  if (!base) return null;

  const hoje = dados.centro.atualizadoEm || new Date().toISOString().slice(0, 10);
  const urls = rotas.map((rota) => {
    const prioridade = rota === "" ? "1.0" : rota.split("/").length > 2 ? "0.6" : "0.8";
    return `  <url>\n    <loc>${base}/${rota}</loc>\n    <lastmod>${hoje}</lastmod>\n    <priority>${prioridade}</priority>\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

function construir() {
  const dados = carregar();
  const rotas = [];
  const escritos = [];

  limpar();

  const registrar = (rota, arquivo, html) => {
    rotas.push(rota);
    escritos.push(escrever(arquivo, html));
  };

  registrar("", "index.html", paginas.home(dados));
  registrar("empresas/", "empresas/index.html", paginas.diretorio(dados));
  registrar("categorias/", "categorias/index.html", paginas.listaCategorias(dados));
  registrar("torres/", "torres/index.html", paginas.listaTorres(dados));
  registrar("vantagens/", "vantagens/index.html", paginas.vantagens(dados));
  registrar("o-centro/", "o-centro/index.html", paginas.oCentro(dados));
  registrar("cadastro/", "cadastro/index.html", paginas.cadastro(dados));

  dados.empresas.forEach((empresa) => {
    registrar(
      `empresas/${empresa.slug}/`,
      `empresas/${empresa.slug}/index.html`,
      paginas.empresa(dados, empresa)
    );
  });

  dados.torres.forEach((torre) => {
    const base = `torres/${torre.id.toLowerCase()}/`;
    registrar(base, `${base}index.html`, paginas.torre(dados, torre));

    torre.categorias.forEach((categoria) => {
      registrar(
        `${base}${categoria.slug}/`,
        `${base}${categoria.slug}/index.html`,
        paginas.torreCategoria(dados, torre, categoria)
      );
    });
  });

  dados.categorias.forEach((categoria) => {
    registrar(
      `categorias/${categoria.slug}/`,
      `categorias/${categoria.slug}/index.html`,
      paginas.categoria(dados, categoria)
    );
  });

  escritos.push(escrever("404.html", paginas.naoEncontrado(dados)));

  const xml = sitemap(dados, rotas);
  if (xml) {
    escritos.push(escrever("sitemap.xml", xml));
    escritos.push(
      escrever(
        "robots.txt",
        `User-agent: *\nAllow: /\n\nSitemap: ${dados.centro.siteUrl.replace(/\/$/, "")}/sitemap.xml\n`
      )
    );
  }

  /* Evita que o GitHub Pages processe o site com Jekyll. */
  escrever(".nojekyll", "");

  console.log(`✓ ${escritos.length} arquivos gerados`);
  console.log(`  ${dados.estatisticas.empresas} empresas · ${dados.estatisticas.categorias} categorias · ${dados.estatisticas.torres} torres`);
  if (dados.centro.demoMode) {
    console.log("  ⚠ demoMode ativo: o site exibe o aviso de conteúdo de demonstração.");
  }
}

try {
  construir();
} catch (erro) {
  console.error("✗ Falha ao gerar o site:\n" + erro.message);
  process.exit(1);
}

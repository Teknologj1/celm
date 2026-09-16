"use strict";

/* Camada de acesso aos dados.
 *
 * Hoje a fonte é um conjunto de arquivos JSON versionados em /data.
 * Quando o site ganhar um backend, basta reescrever `carregar()` para
 * consumir a API (ou o banco) e devolver o mesmo formato normalizado —
 * nenhuma outra parte do gerador precisa mudar.
 */

const fs = require("fs");
const path = require("path");

const RAIZ = path.join(__dirname, "..");
const DIR_DADOS = path.join(RAIZ, "data");

function lerJson(arquivo) {
  const caminho = path.join(DIR_DADOS, arquivo);
  try {
    return JSON.parse(fs.readFileSync(caminho, "utf8"));
  } catch (erro) {
    throw new Error(`Falha ao ler data/${arquivo}: ${erro.message}`);
  }
}

/* Converte "Clínica Cerrado Saúde" em "clinica-cerrado-saude". */
function slugificar(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Ordem alfabética: usada nas buscas encadeadas (torre → categoria). */
function porNome(a, b) {
  return a.nome.localeCompare(b.nome, "pt-BR");
}

/* Ordem da lista geral: quem enviou imagem aparece primeiro; dentro de cada
   grupo, ordem alfabética. */
function porVitrine(a, b) {
  if (a.temImagem !== b.temImagem) return a.temImagem ? -1 : 1;
  return porNome(a, b);
}

/* Monograma exibido quando a empresa ainda não enviou logotipo. */
function iniciaisDe(nome) {
  const ignorar = new Set(["de", "da", "do", "e", "dos", "das", "&"]);
  const palavras = String(nome).replace(/&/g, " ").split(/\s+/)
    .filter((p) => p && !ignorar.has(p.toLowerCase()));
  return palavras.slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
}

function validar(centro, categorias, empresas) {
  const problemas = [];
  const slugsCategoria = new Set(categorias.map((c) => c.slug));
  const vistos = new Set();

  if (!centro.nome) problemas.push("data/centro.json: campo 'nome' é obrigatório.");

  empresas.forEach((empresa, i) => {
    const onde = `data/empresas.json[${i}] (${empresa.nome || "sem nome"})`;
    if (!empresa.nome) problemas.push(`${onde}: campo 'nome' é obrigatório.`);
    if (!empresa.torre) problemas.push(`${onde}: campo 'torre' é obrigatório.`);
    if (!slugsCategoria.has(empresa.categoria)) {
      problemas.push(`${onde}: categoria "${empresa.categoria}" não existe em data/categorias.json.`);
    }
    const slug = empresa.slug || slugificar(empresa.nome);
    if (vistos.has(slug)) problemas.push(`${onde}: slug duplicado "${slug}".`);
    vistos.add(slug);
  });

  if (problemas.length) {
    throw new Error("Dados inválidos:\n  - " + problemas.join("\n  - "));
  }
}

function carregar() {
  const centro = lerJson("centro.json");

  /* Na Vercel o endereço é outro. Definir SITE_URL nas variáveis de ambiente
     faz o canonical, o sitemap e o robots apontarem para o domínio certo,
     sem precisar editar o JSON a cada mudança de hospedagem. */
  if (process.env.SITE_URL) centro.siteUrl = process.env.SITE_URL.replace(/\/$/, "");
  const categorias = lerJson("categorias.json");
  const brutas = lerJson("empresas.json");
  const anuncios = lerJson("anuncios.json");

  validar(centro, categorias, brutas);

  const porSlug = new Map(categorias.map((c) => [c.slug, c]));

  const empresas = brutas
    .map((empresa) => {
      const categoria = porSlug.get(empresa.categoria);
      return Object.assign({}, empresa, {
        slug: empresa.slug || slugificar(empresa.nome),
        tags: empresa.tags || [],
        andar: Number(empresa.andar) || 0,
        demo: empresa.demo === true,
        destaque: empresa.destaque === true,
        logo: empresa.logo || "",
        capa: empresa.capa || "",
        temImagem: Boolean(empresa.logo || empresa.capa),
        iniciais: iniciaisDe(empresa.nome),
        categoriaNome: categoria.nome,
        categoriaIcone: categoria.icone,
        categoriaSinonimos: categoria.sinonimos || []
      });
    })
    .sort(porNome);

  const categoriasComContagem = categorias
    .map((categoria) =>
      Object.assign({}, categoria, {
        empresas: empresas.filter((e) => e.categoria === categoria.slug)
      })
    )
    .filter((categoria) => categoria.empresas.length > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  /* Cada torre carrega as categorias que existem nela, o que permite a
     navegação encadeada torre → categoria → empresas. */
  const torres = (centro.torres || []).map((torre) => {
    const daTorre = empresas.filter((e) => e.torre === torre.id).sort(porNome);
    return Object.assign({}, torre, {
      total: daTorre.length,
      empresas: daTorre,
      categorias: categoriasComContagem
        .map((categoria) =>
          Object.assign({}, categoria, {
            empresas: daTorre.filter((e) => e.categoria === categoria.slug).sort(porNome)
          })
        )
        .filter((categoria) => categoria.empresas.length > 0)
    });
  });

  const vantagens = empresas
    .filter((e) => e.beneficio)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const anunciosPorEspaco = anuncios.reduce((mapa, anuncio) => {
    if (!mapa[anuncio.espaco]) mapa[anuncio.espaco] = [];
    mapa[anuncio.espaco].push(anuncio);
    return mapa;
  }, {});

  return {
    centro,
    torres,
    empresas,
    /* lista geral: prioriza quem enviou imagem */
    vitrine: empresas.slice().sort(porVitrine),
    anuncios: anunciosPorEspaco,
    categorias: categoriasComContagem,
    vantagens,
    estatisticas: {
      empresas: empresas.length,
      categorias: categoriasComContagem.length,
      torres: torres.length,
      vantagens: vantagens.length,
      comImagem: empresas.filter((e) => e.temImagem).length
    }
  };
}

/* Versão enxuta enviada ao navegador para a busca do diretório. */
function paraBusca(empresas) {
  return empresas.map((e) => ({
    slug: e.slug,
    nome: e.nome,
    descricao: e.descricao,
    categoria: e.categoria,
    categoriaNome: e.categoriaNome,
    categoriaIcone: e.categoriaIcone,
    sinonimos: e.categoriaSinonimos,
    tags: e.tags,
    torre: e.torre,
    andar: e.andar,
    sala: e.sala,
    responsavel: e.responsavel || "",
    logo: e.logo,
    iniciais: e.iniciais,
    temImagem: e.temImagem,
    demo: e.demo
  }));
}

module.exports = { carregar, paraBusca, slugificar, porNome, porVitrine, RAIZ };

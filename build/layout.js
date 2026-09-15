"use strict";

/* Casca comum das páginas: <head>, cabeçalho, rodapé e helpers de link. */

function escapar(texto) {
  return String(texto == null ? "" : texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Caminho relativo à raiz do site, para que funcione em qualquer
   subdiretório (GitHub Pages de projeto, por exemplo). */
function url(profundidade, caminho, baseFixa) {
  if (baseFixa != null) return baseFixa + (caminho || "");
  const prefixo = profundidade > 0 ? "../".repeat(profundidade) : "";
  const destino = prefixo + (caminho || "");
  return destino === "" ? "./" : destino;
}

/* Data vinda de data/centro.json: mantém o HTML gerado idêntico entre
   builds, para que o CI consiga detectar páginas desatualizadas. */
function dataPorExtenso(iso) {
  if (!iso) return "—";
  const [ano, mes, dia] = String(iso).split("-").map(Number);
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${String(dia).padStart(2, "0")} de ${meses[mes - 1]} de ${ano}`;
}

const MENU = [
  { href: "", rotulo: "Início", chave: "inicio" },
  { href: "empresas/", rotulo: "Empresas", chave: "empresas" },
  { href: "categorias/", rotulo: "Categorias", chave: "categorias" },
  { href: "vantagens/", rotulo: "Vantagens", chave: "vantagens" },
  { href: "o-centro/", rotulo: "O Centro", chave: "centro" }
];

function cabecalho(dados, profundidade, atual, baseFixa) {
  const u = (caminho) => url(profundidade, caminho, baseFixa);

  const itens = MENU.map((item) => {
    const marcado = item.chave === atual ? ' aria-current="page"' : "";
    return `<a href="${u(item.href)}"${marcado}>${escapar(item.rotulo)}</a>`;
  }).join("\n        ");

  const aviso = dados.centro.demoMode
    ? `<div class="aviso-demo">
    <div class="container">
      <strong>Conteúdo de demonstração.</strong>
      <span>As empresas listadas são fictícias e servem apenas para ilustrar o formato do guia, até que os dados reais dos condôminos sejam cadastrados.</span>
    </div>
  </div>`
    : "";

  return `${aviso}
  <header class="topo">
    <div class="container">
      <a class="marca" href="${u("")}">
        <span class="marca-sigla" aria-hidden="true">${escapar(dados.centro.sigla)}</span>
        <span class="marca-texto">
          <b>${escapar(dados.centro.nome)}</b>
          <span>${escapar(dados.centro.tagline)}</span>
        </span>
      </a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-principal">
        ☰ <span class="sr-only">Abrir menu</span>
      </button>
      <nav class="nav" id="nav-principal" aria-label="Navegação principal">
        ${itens}
        <a class="btn btn-sm" href="${u("cadastro/")}">Cadastrar empresa</a>
      </nav>
    </div>
  </header>`;
}

function rodape(dados, profundidade, baseFixa) {
  const u = (caminho) => url(profundidade, caminho, baseFixa);
  const endereco = dados.centro.endereco;

  const topoCategorias = dados.categorias
    .slice()
    .sort((a, b) => b.empresas.length - a.empresas.length)
    .slice(0, 6)
    .map((c) => `<li><a href="${u("categorias/" + c.slug + "/")}">${escapar(c.nome)}</a></li>`)
    .join("\n            ");

  return `<footer class="rodape">
    <div class="container">
      <div class="rodape-grade">
        <div>
          <h4>${escapar(dados.centro.sigla)}</h4>
          <p style="color: var(--ink-soft); margin: 0 0 12px;">${escapar(dados.centro.descricaoCurta)}</p>
          <a class="btn btn-sm btn-secundario" href="${u("cadastro/")}">Cadastrar ou atualizar empresa</a>
        </div>
        <div>
          <h4>Navegar</h4>
          <ul>
            ${MENU.map((i) => `<li><a href="${u(i.href)}">${escapar(i.rotulo)}</a></li>`).join("\n            ")}
          </ul>
        </div>
        <div>
          <h4>Categorias em destaque</h4>
          <ul>
            ${topoCategorias}
          </ul>
        </div>
        <div>
          <h4>Onde estamos</h4>
          <address>
            ${escapar(endereco.logradouro)}<br>
            ${escapar(endereco.complemento)}<br>
            ${escapar(endereco.bairro)} — ${escapar(endereco.cidade)}/${escapar(endereco.uf)}<br>
            CEP ${escapar(endereco.cep)}
          </address>
        </div>
      </div>
      <div class="rodape-base">
        <span>Guia de empresas mantido pelos condôminos do ${escapar(dados.centro.nome)}.</span>
        <span>Atualizado em ${escapar(dataPorExtenso(dados.centro.atualizadoEm))}.</span>
      </div>
    </div>
  </footer>`;
}

/* Monta a página completa. */
function pagina(dados, opcoes) {
  const profundidade = opcoes.profundidade || 0;
  const baseFixa = opcoes.baseFixa;
  const u = (caminho) => url(profundidade, caminho, baseFixa);
  const tituloCompleto = opcoes.titulo
    ? `${opcoes.titulo} | ${dados.centro.sigla} — ${dados.centro.nome}`
    : `${dados.centro.nome} | ${dados.centro.tagline}`;

  const canonical = dados.centro.siteUrl && opcoes.caminho != null
    ? `${dados.centro.siteUrl.replace(/\/$/, "")}/${opcoes.caminho}`
    : "";

  const scripts = (opcoes.scripts || [])
    .map((src) => `  <script src="${u("assets/js/" + src)}" defer></script>`)
    .join("\n");

  const dadosEstruturados = opcoes.jsonLd
    ? `  <script type="application/ld+json">${JSON.stringify(opcoes.jsonLd)}</script>\n`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapar(tituloCompleto)}</title>
  <meta name="description" content="${escapar(opcoes.descricao || dados.centro.descricaoCurta)}">
  <meta name="theme-color" content="#0f4c75">
${canonical ? `  <link rel="canonical" href="${escapar(canonical)}">\n` : ""}  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapar(tituloCompleto)}">
  <meta property="og:description" content="${escapar(opcoes.descricao || dados.centro.descricaoCurta)}">
  <meta property="og:locale" content="pt_BR">
${canonical ? `  <meta property="og:url" content="${escapar(canonical)}">\n` : ""}  <link rel="icon" href="${u("assets/img/favicon.svg")}" type="image/svg+xml">
  <link rel="stylesheet" href="${u("assets/css/style.css")}">
${dadosEstruturados}</head>
<body>
  <a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
${cabecalho(dados, profundidade, opcoes.atual, baseFixa)}
  <main id="conteudo">
${opcoes.conteudo}
  </main>
${rodape(dados, profundidade, baseFixa)}
  <script src="${u("assets/js/app.js")}" defer></script>
${scripts}
</body>
</html>
`;
}

module.exports = { pagina, escapar, url };

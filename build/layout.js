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

/* O menu principal carrega só o que leva a algum lugar. "Vantagens" entra
   quando existe ao menos uma condição cadastrada — menu com página vazia é
   promessa não cumprida. "Anuncie" não é página de visitante: vive no rodapé
   e em cada espaço publicitário livre, que é onde um anunciante repara. */
const MENU_FIXO = [
  { href: "", rotulo: "Início", chave: "inicio" },
  { href: "empresas/", rotulo: "Empresas", chave: "empresas" },
  { href: "torres/", rotulo: "Torres", chave: "torres" },
  { href: "categorias/", rotulo: "Categorias", chave: "categorias" },
  { href: "o-centro/", rotulo: "O Centro", chave: "centro" }
];

function menuRodape(dados) {
  const itens = [];
  /* O boletim mora dentro de "O Centro"; o rodapé é o atalho direto para
     quem já sabe o que procura. Só aparece quando há alguma edição. */
  if ((dados.boletins || []).length) {
    itens.push({ href: "o-centro/#boletim", rotulo: "Boletim informativo" });
  }
  itens.push({ href: "anuncie/", rotulo: "Anuncie" });
  return itens;
}

function menu(dados) {
  const itens = MENU_FIXO.slice();
  if (dados.empresas.some((e) => e.beneficio)) {
    itens.splice(4, 0, { href: "vantagens/", rotulo: "Vantagens", chave: "vantagens" });
  }
  return itens;
}

function cabecalho(dados, profundidade, atual, baseFixa) {
  const u = (caminho) => url(profundidade, caminho, baseFixa);

  const itens = menu(dados).map((item) => {
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
        <span class="marca-logo"></span>
        <span class="sr-only">${escapar(dados.centro.nome)}</span>
      </a>
      <button class="abre-busca" type="button" data-abre-busca>
        <span aria-hidden="true">🔎</span>
        <span class="abre-busca-rotulo">Buscar empresa</span>
        <kbd>/</kbd>
      </button>
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
          <span class="marca-logo marca-logo-rodape"></span>
          <p style="color: var(--ink-soft); margin: 16px 0 12px;">${escapar(dados.centro.descricaoCurta)}</p>
          <a class="btn btn-sm btn-secundario" href="${u("cadastro/")}">Cadastrar ou atualizar empresa</a>
        </div>
        <div>
          <h4>Navegar</h4>
          <ul>
            ${menu(dados).concat(menuRodape(dados)).map((i) => `<li><a href="${u(i.href)}">${escapar(i.rotulo)}</a></li>`).join("\n            ")}
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
${assinatura(dados, profundidade, baseFixa)}
    </div>
  </footer>`;
}

/* Crédito de quem fez o site. Fica na última linha do rodapé, separado do
   que é do condomínio: o guia é dos condôminos, a construção é de quem
   assina aqui. */
function assinatura(dados, profundidade, baseFixa) {
  const dev = dados.centro.desenvolvedor;
  if (!dev || !dev.nome) return "";

  const contatos = [];
  if (dev.instagram) {
    const arroba = dev.instagram.replace(/^@/, "");
    contatos.push(`<a href="https://instagram.com/${escapar(arroba)}" rel="noopener" target="_blank">@${escapar(arroba)}</a>`);
  }
  if (dev.email) {
    contatos.push(`<a href="mailto:${escapar(dev.email)}">${escapar(dev.email)}</a>`);
  }

  const u = (caminho) => url(profundidade, caminho, baseFixa);

  return `      <div class="rodape-assinatura">
        <span class="assinatura-autor">
          ${dev.logo ? `<img class="assinatura-logo" src="${u(dev.logo)}" alt="" width="309" height="160" loading="lazy">` : ""}
          <span>Desenvolvido por <strong>${escapar(dev.nome)}</strong></span>
        </span>
        ${contatos.length ? `<span class="assinatura-contatos">${contatos.join("<span aria-hidden=\"true\"> · </span>")}</span>` : ""}
      </div>`;
}

/* Monta a página completa. */
/* Camada da busca rápida. O índice não vai embutido: pesaria em cada uma
   das dezenas de páginas e cresceria junto com o cadastro. Ele é um arquivo
   só, buscado quando alguém abre a busca pela primeira vez e reaproveitado
   do cache do navegador daí em diante. */
function camadaDeBusca(dados, profundidade, baseFixa) {
  return `
  <div class="busca-rapida" id="busca-rapida" hidden
       data-base="${url(profundidade, "", baseFixa)}"
       data-indice="${url(profundidade, "assets/busca.json", baseFixa)}">
    <div class="busca-caixa" role="dialog" aria-modal="true" aria-label="Buscar empresa">
      <div class="busca-topo">
        <span class="busca-lupa" aria-hidden="true">🔎</span>
        <label class="sr-only" for="busca-rapida-campo">Buscar empresa, serviço, sala ou torre</label>
        <input id="busca-rapida-campo" type="search" autocomplete="off" role="combobox"
               aria-expanded="true" aria-controls="busca-rapida-lista"
               placeholder="Busque por empresa, serviço, sala ou torre...">
        <button class="btn btn-secundario btn-sm" type="button" id="busca-rapida-fechar">Fechar</button>
      </div>
      <ul class="busca-resultados" id="busca-rapida-lista" role="listbox"
          aria-label="Resultados"></ul>
      <div class="busca-rodape">
        <span><kbd>↑</kbd> <kbd>↓</kbd> para navegar · <kbd>Enter</kbd> para abrir · <kbd>Esc</kbd> para fechar</span>
        <span id="busca-rapida-contagem" aria-live="polite"></span>
      </div>
    </div>
  </div>`;
}

function pagina(dados, opcoes) {
  const profundidade = opcoes.profundidade || 0;
  const baseFixa = opcoes.baseFixa;
  const u = (caminho) => url(profundidade, caminho, baseFixa);
  const tituloCompleto = opcoes.titulo
    ? `${opcoes.titulo} | ${dados.centro.sigla} — ${dados.centro.descritor}`
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
  <script>document.documentElement.classList.add("js");</script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapar(tituloCompleto)}</title>
  <meta name="description" content="${escapar(opcoes.descricao || dados.centro.descricaoCurta)}">
  <meta name="theme-color" content="#081b26">
${canonical ? `  <link rel="canonical" href="${escapar(canonical)}">\n` : ""}  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapar(tituloCompleto)}">
  <meta property="og:description" content="${escapar(opcoes.descricao || dados.centro.descricaoCurta)}">
  <meta property="og:locale" content="pt_BR">
${canonical ? `  <meta property="og:url" content="${escapar(canonical)}">\n` : ""}  <link rel="icon" href="${u("assets/img/favicon.svg")}" type="image/svg+xml">
  <link rel="preload" href="${u("assets/fonts/inter-variable.woff2")}" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${u("assets/fonts/instrument-serif.woff2")}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${u("assets/css/style.css")}">
${dadosEstruturados}</head>
<body>
  <a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
${cabecalho(dados, profundidade, opcoes.atual, baseFixa)}
  <main id="conteudo">
${opcoes.conteudo}
  </main>
${camadaDeBusca(dados, profundidade, baseFixa)}
${rodape(dados, profundidade, baseFixa)}
  <script src="${u("assets/js/app.js")}" defer></script>
  <script src="${u("assets/js/busca-rapida.js")}" defer></script>
  <script src="${u("assets/js/anuncios.js")}" defer></script>
${scripts}
</body>
</html>
`;
}

module.exports = { pagina, escapar, url, dataPorExtenso };

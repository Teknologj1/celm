"use strict";

const { pagina, escapar, url } = require("./layout");
const { paraBusca } = require("./dados");

/* ---------- componentes reutilizáveis ------------------------------------ */

/* Logotipo da empresa; sem imagem enviada, cai no monograma. */
function marcaEmpresa(empresa, profundidade, tamanho) {
  const classe = "marca-empresa" + (tamanho ? " marca-empresa-" + tamanho : "");
  if (empresa.logo) {
    return `<img class="${classe}" src="${url(profundidade, empresa.logo)}" alt="Logotipo de ${escapar(empresa.nome)}" loading="lazy" width="96" height="96">`;
  }
  return `<span class="${classe} monograma" aria-hidden="true">${escapar(empresa.iniciais)}</span>`;
}

/* Espaço publicitário. Sem anúncio ativo, mostra o espaço disponível —
   o que serve tanto de reserva no layout quanto de vitrine comercial. */
function anuncio(dados, espaco, profundidade, extra) {
  const publicidade = dados.centro.publicidade || {};
  const ativo = (dados.anuncios[espaco] || []).find((a) => a.ativo);

  if (ativo) {
    const interno = `
      ${ativo.imagem ? `<img src="${url(profundidade, ativo.imagem)}" alt="${escapar(ativo.titulo || ativo.anunciante)}" loading="lazy">` : ""}
      <div>
        <b>${escapar(ativo.titulo)}</b>
        ${ativo.texto ? `<p>${escapar(ativo.texto)}</p>` : ""}
        ${ativo.anunciante ? `<small>${escapar(ativo.anunciante)}</small>` : ""}
      </div>`;

    return `<aside class="anuncio ${extra || ""}" aria-label="Publicidade">
        <span class="anuncio-rotulo">Publicidade</span>
        ${ativo.link
          ? `<a class="anuncio-conteudo" href="${escapar(ativo.link)}" rel="noopener sponsored" target="_blank">${interno}</a>`
          : `<div class="anuncio-conteudo">${interno}</div>`}
      </aside>`;
  }

  if (!publicidade.mostrarEspacosVazios) return "";

  const modelo = (dados.anuncios[espaco] || [])[0] || {};
  return `<aside class="anuncio anuncio-vazio ${extra || ""}" aria-label="Espaço publicitário disponível">
        <span class="anuncio-rotulo">Espaço publicitário</span>
        <div class="anuncio-conteudo">
          <div>
            <b>Anuncie para quem trabalha aqui</b>
            <p>${escapar(modelo.formato || "Espaço disponível nesta página")}.</p>
            <a href="${url(profundidade, "anuncie/")}">Ver formatos e condições →</a>
          </div>
        </div>
      </aside>`;
}

function figuraComplexo(imagem, profundidade, classe) {
  if (!imagem || !imagem.src) return "";
  return `<figure class="${classe || "figura"}">
        <img src="${url(profundidade, imagem.src)}" alt="${escapar(imagem.alt || "")}" loading="lazy">
        ${imagem.legenda ? `<figcaption>${escapar(imagem.legenda)}</figcaption>` : ""}
      </figure>`;
}

function cartaoEmpresa(empresa, profundidade) {
  const u = (caminho) => url(profundidade, caminho);
  const tags = empresa.tags.slice(0, 3)
    .map((tag) => `<span class="etiqueta">${escapar(tag)}</span>`)
    .join("");

  return `<a class="cartao${empresa.temImagem ? " cartao-com-imagem" : ""}" href="${u("empresas/" + empresa.slug + "/")}">
          <div class="cartao-topo">
            <span class="cartao-categoria">${escapar(empresa.categoriaIcone)} ${escapar(empresa.categoriaNome)}</span>
            ${empresa.demo ? '<span class="etiqueta etiqueta-demo">demo</span>' : ""}
          </div>
          <div class="cartao-identidade">
            ${marcaEmpresa(empresa, profundidade)}
            <h3>${escapar(empresa.nome)}</h3>
          </div>
          <p>${escapar(empresa.descricao)}</p>
          ${tags ? `<div class="tags">${tags}</div>` : ""}
          <div class="cartao-rodape">
            <span class="etiqueta etiqueta-torre">Torre ${escapar(empresa.torre)} · Sala ${escapar(empresa.sala)}</span>
            <span>Ver ficha →</span>
          </div>
        </a>`;
}

function grade(empresas, profundidade) {
  return `<div class="grade grade-3">
        ${empresas.map((e) => cartaoEmpresa(e, profundidade)).join("\n        ")}
      </div>`;
}

function linkMaps(centro) {
  return "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(centro.endereco.mapsQuery || centro.nome);
}

/* ---------- páginas ------------------------------------------------------- */

function home(dados) {
  const { centro, estatisticas, categorias, torres } = dados;
  /* a vitrine já vem com quem enviou imagem na frente */
  const destaques = dados.vitrine.slice(0, 6);
  const vantagens = dados.vantagens.slice(0, 3);

  const conteudo = `    <section class="hero${centro.imagens && centro.imagens.fachada ? " hero-com-foto" : ""}">
      ${centro.imagens && centro.imagens.fachada ? `<img class="hero-foto" src="${url(0, centro.imagens.fachada.src)}" alt="${escapar(centro.imagens.fachada.alt)}" fetchpriority="high">` : ""}
      <div class="container">
        <span class="hero-etiqueta">🏙️ Torres A e B · ${escapar(centro.endereco.bairro)}, ${escapar(centro.endereco.cidade)}</span>
        <h1>Quem é quem no ${escapar(centro.nome)}</h1>
        <p class="lead">${escapar(centro.descricaoCurta)}</p>

        <form class="busca-hero" role="search" data-busca-redireciona="${url(0, "empresas/")}">
          <label class="sr-only" for="busca-inicial">Buscar empresa, serviço ou profissional</label>
          <input id="busca-inicial" name="q" type="search" autocomplete="off"
                 placeholder="Busque por advogado, contador, clínica, TI...">
          <button class="btn btn-accent" type="submit">Buscar</button>
        </form>

        <div class="hero-atalhos">
          <span>Atalhos:</span>
          ${dados.torres.map((t) => `<a href="${url(0, "torres/" + t.id.toLowerCase() + "/")}">Serviços da ${escapar(t.nome)}</a>`).join("\n          ")}
          <a href="${url(0, "vantagens/")}">Vantagens entre condôminos</a>
          <a href="${url(0, "cadastro/")}">Cadastrar minha empresa</a>
        </div>

        <div class="numeros">
          <div class="numero"><b>${estatisticas.empresas}</b><span>empresas cadastradas</span></div>
          <div class="numero"><b>${estatisticas.categorias}</b><span>áreas de atuação</span></div>
          <div class="numero"><b>${estatisticas.torres}</b><span>torres empresariais</span></div>
          <div class="numero"><b>${estatisticas.vantagens}</b><span>vantagens entre vizinhos</span></div>
        </div>
      </div>
    </section>

    <section class="secao">
      <div class="container">
        <div class="secao-topo">
          <div>
            <span class="olho">Navegue por área</span>
            <h2>Encontre pela categoria</h2>
          </div>
          <a class="btn btn-secundario btn-sm" href="${url(0, "categorias/")}">Ver todas as categorias</a>
        </div>
        <div class="grade grade-4">
          ${categorias.slice().sort((a, b) => b.empresas.length - a.empresas.length || a.nome.localeCompare(b.nome, "pt-BR")).slice(0, 8).map((c) => `<a class="cartao-cat" href="${url(0, "categorias/" + c.slug + "/")}">
            <span class="icone" aria-hidden="true">${escapar(c.icone)}</span>
            <span>
              <b>${escapar(c.nome)}</b>
              <small>${c.empresas.length} ${c.empresas.length === 1 ? "empresa" : "empresas"}</small>
            </span>
          </a>`).join("\n          ")}
        </div>
      </div>
    </section>

    <section class="secao">
      <div class="container">
        ${anuncio(dados, "home", 0, "anuncio-faixa")}
      </div>
    </section>

    <section class="secao secao-alt">
      <div class="container">
        <div class="secao-topo">
          <div>
            <span class="olho">Vizinhos em destaque</span>
            <h2>Empresas do complexo</h2>
            <p style="margin:6px 0 0;color:var(--ink-soft);font-size:.92rem">Empresas que enviaram identidade visual aparecem primeiro nesta lista.</p>
          </div>
          <a class="btn btn-secundario btn-sm" href="${url(0, "empresas/")}">Ver o diretório completo</a>
        </div>
        ${grade(destaques, 0)}
      </div>
    </section>

    <section class="secao">
      <div class="container">
        <div class="secao-topo">
          <div>
            <span class="olho">Sinergia entre condôminos</span>
            <h2>Vantagens de ser vizinho</h2>
          </div>
          <a class="btn btn-secundario btn-sm" href="${url(0, "vantagens/")}">Ver todas as vantagens</a>
        </div>
        <div class="grade grade-2">
          ${vantagens.map((e) => `<div class="vantagem">
            <h3><a href="${url(0, "empresas/" + e.slug + "/")}">${escapar(e.nome)}</a></h3>
            <span class="meta">${escapar(e.categoriaNome)} · Torre ${escapar(e.torre)} · Sala ${escapar(e.sala)}</span>
            <p>${escapar(e.beneficio)}</p>
          </div>`).join("\n          ")}
        </div>
      </div>
    </section>

    <section class="secao secao-alt">
      <div class="container">
        <div class="secao-cabecalho">
          <span class="olho">O complexo</span>
          <h2>Duas torres, um endereço de negócios</h2>
          <p>Conectado ao Shopping Liberty Mall, o centro empresarial reúne escritórios, clínicas e prestadores de serviço em um mesmo endereço — com tudo o que o dia a dia corporativo precisa a poucos passos da sala.</p>
        </div>
        <div class="grade grade-2">
          ${torres.map((t) => `<div class="cartao cartao-torre">
            ${t.imagem ? `<img class="foto-torre" src="${url(0, t.imagem.src)}" alt="${escapar(t.imagem.alt)}" loading="lazy">` : ""}
            <h3>${escapar(t.nome)}</h3>
            <p>${escapar(t.descricao)}</p>
            <div class="cartao-rodape">
              <span class="etiqueta etiqueta-torre">${t.total} ${t.total === 1 ? "empresa" : "empresas"} · ${escapar(t.andares)}</span>
              <a href="${url(0, "torres/" + t.id.toLowerCase() + "/")}">Ver serviços da torre →</a>
            </div>
          </div>`).join("\n          ")}
        </div>
      </div>
    </section>

    <section class="secao">
      <div class="container">
        <div class="chamada">
          <div>
            <h2>Sua empresa ainda não está no guia?</h2>
            <p>O cadastro é gratuito para condôminos e leva menos de cinco minutos. Quanto mais completo o guia, mais negócios circulam entre as duas torres.</p>
          </div>
          <a class="btn btn-accent" href="${url(0, "cadastro/")}">Cadastrar minha empresa</a>
        </div>
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 0,
    caminho: "",
    atual: "inicio",
    conteudo,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: centro.nome,
      description: centro.descricaoCurta,
      url: centro.siteUrl || undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: `${centro.endereco.logradouro} — ${centro.endereco.complemento}`,
        addressLocality: centro.endereco.cidade,
        addressRegion: centro.endereco.uf,
        postalCode: centro.endereco.cep,
        addressCountry: "BR"
      }
    }
  });
}

function diretorio(dados) {
  const opcoesCategoria = dados.categorias
    .map((c) => `<option value="${escapar(c.slug)}">${escapar(c.nome)} (${c.empresas.length})</option>`)
    .join("\n              ");

  const chipsTorre = dados.torres
    .map((t) => `<button class="chip" type="button" data-torre="${escapar(t.id)}" aria-pressed="false">Torre ${escapar(t.id)} · ${t.total}</button>`)
    .join("\n          ");

  const conteudo = `    <section class="secao">
      <div class="container">
        <div class="secao-cabecalho">
          <span class="olho">Diretório</span>
          <h1>Empresas do complexo</h1>
          <p>Busque por nome, serviço ou profissional. Também dá para filtrar por torre e por área de atuação — o resultado muda enquanto você digita.</p>
        </div>

        <form class="painel-filtros" id="form-filtros" role="search">
          <div class="campo">
            <label for="filtro-busca">Buscar</label>
            <input id="filtro-busca" type="search" autocomplete="off" placeholder="Ex.: contador, odontologia, sala 1208">
          </div>
          <div class="campo">
            <label for="filtro-categoria">Categoria</label>
            <select id="filtro-categoria">
              <option value="">Todas as categorias</option>
              ${opcoesCategoria}
            </select>
          </div>
          <div class="campo">
            <label for="filtro-ordem">Ordenar por</label>
            <select id="filtro-ordem">
              <option value="vitrine">Destaque (com foto primeiro)</option>
              <option value="nome">Nome (A–Z)</option>
              <option value="torre">Torre e andar</option>
              <option value="categoria">Categoria</option>
            </select>
          </div>
          <button class="btn btn-secundario" type="button" id="limpar-filtros">Limpar</button>
        </form>

        <div class="chips">
          ${chipsTorre}
        </div>

        <div class="resultado-info">
          <span id="contador" role="status" aria-live="polite">${dados.estatisticas.empresas} empresas encontradas</span>
          <a href="${url(1, "torres/")}">Prefere navegar por torre e tipo de serviço? →</a>
        </div>

        <div id="resultados" class="grade grade-3" data-base="${url(1, "")}">
          ${dados.vitrine.map((e) => cartaoEmpresa(e, 1)).join("\n          ")}
        </div>

        ${anuncio(dados, "diretorio", 1, "anuncio-faixa")}

        <noscript>
          <p class="vazio" style="margin-top:20px">A busca e os filtros precisam de JavaScript. A lista completa de empresas continua visível acima.</p>
        </noscript>
      </div>
    </section>

    <script id="dados-empresas" type="application/json">${JSON.stringify(paraBusca(dados.vitrine))}</script>`;

  return pagina(dados, {
    profundidade: 1,
    caminho: "empresas/",
    atual: "empresas",
    titulo: "Empresas",
    descricao: `Diretório com ${dados.estatisticas.empresas} empresas do ${dados.centro.nome}, buscável por nome, serviço, torre e categoria.`,
    conteudo,
    scripts: ["diretorio.js"]
  });
}

function empresa(dados, item) {
  const u = (caminho) => url(2, caminho);
  const centro = dados.centro;
  const endereco = centro.endereco;

  const contatos = [];
  if (item.telefone) {
    contatos.push(`<div><dt>Telefone</dt><dd><a href="tel:${escapar(item.telefone.replace(/[^0-9+]/g, ""))}">${escapar(item.telefone)}</a></dd></div>`);
  }
  if (item.email) {
    contatos.push(`<div><dt>E-mail</dt><dd><a href="mailto:${escapar(item.email)}">${escapar(item.email)}</a></dd></div>`);
  }
  if (item.site) {
    contatos.push(`<div><dt>Site</dt><dd><a href="${escapar(item.site)}" rel="noopener" target="_blank">${escapar(item.site.replace(/^https?:\/\//, ""))}</a></dd></div>`);
  }
  if (item.instagram) {
    contatos.push(`<div><dt>Instagram</dt><dd><a href="https://instagram.com/${escapar(item.instagram.replace(/^@/, ""))}" rel="noopener" target="_blank">@${escapar(item.instagram.replace(/^@/, ""))}</a></dd></div>`);
  }
  if (item.responsavel) {
    contatos.push(`<div><dt>Responsável</dt><dd>${escapar(item.responsavel)}</dd></div>`);
  }
  if (item.horario) {
    contatos.push(`<div><dt>Atendimento</dt><dd>${escapar(item.horario)}</dd></div>`);
  }

  const acoes = [];
  if (item.whatsapp) {
    acoes.push(`<a class="btn" href="https://wa.me/${escapar(item.whatsapp)}" rel="noopener" target="_blank">Chamar no WhatsApp</a>`);
  }
  if (item.telefone) {
    acoes.push(`<a class="btn btn-secundario" href="tel:${escapar(item.telefone.replace(/[^0-9+]/g, ""))}">Ligar</a>`);
  }
  if (item.email) {
    acoes.push(`<a class="btn btn-secundario" href="mailto:${escapar(item.email)}">Enviar e-mail</a>`);
  }

  const relacionadas = dados.empresas
    .filter((e) => e.categoria === item.categoria && e.slug !== item.slug)
    .slice(0, 3);

  const vizinhas = dados.empresas
    .filter((e) => e.torre === item.torre && e.slug !== item.slug && e.categoria !== item.categoria)
    .slice(0, 3);

  const conteudo = `    <div class="container">
      <nav class="migalhas" aria-label="Trilha de navegação">
        <a href="${u("")}">Início</a><span>›</span>
        <a href="${u("empresas/")}">Empresas</a><span>›</span>
        <a href="${u("categorias/" + item.categoria + "/")}">${escapar(item.categoriaNome)}</a><span>›</span>
        ${escapar(item.nome)}
      </nav>

      <header class="empresa-topo empresa-topo-com-marca">
        ${marcaEmpresa(item, 2, "grande")}
        <div class="empresa-cabecalho-texto">
        <div class="empresa-meta">
          <span class="cartao-categoria">${escapar(item.categoriaIcone)} ${escapar(item.categoriaNome)}</span>
          <span class="etiqueta etiqueta-torre">Torre ${escapar(item.torre)} · Sala ${escapar(item.sala)}</span>
          ${item.demo ? '<span class="etiqueta etiqueta-demo">dados de demonstração</span>' : ""}
        </div>
        <h1>${escapar(item.nome)}</h1>
        <p class="empresa-resumo">${escapar(item.descricao)}</p>
        </div>
      </header>

      <div class="colunas">
        <div>
          <div class="bloco">
            <h2>Contato e atendimento</h2>
            <dl class="lista-dados">
              ${contatos.join("\n              ")}
            </dl>
            ${acoes.length ? `<div class="acoes" style="margin-top:20px">${acoes.join("")}</div>` : ""}
          </div>

          ${item.beneficio ? `<div class="bloco destaque-beneficio">
            <b>🤝 Vantagem para condôminos</b>
            <p>${escapar(item.beneficio)}</p>
          </div>` : ""}

          ${item.tags.length ? `<div class="bloco">
            <h2>Serviços</h2>
            <div class="tags">${item.tags.map((t) => `<span class="etiqueta">${escapar(t)}</span>`).join("")}</div>
          </div>` : ""}
        </div>

        <aside>
          <div class="bloco">
            <h2>Como chegar</h2>
            <dl class="lista-dados">
              <div><dt>Torre</dt><dd>${escapar(item.torre)}</dd></div>
              <div><dt>Andar</dt><dd>${item.andar ? escapar(item.andar) + "º" : "Térreo"}</dd></div>
              <div><dt>Sala</dt><dd>${escapar(item.sala)}</dd></div>
              <div><dt>Endereço</dt><dd>${escapar(endereco.logradouro)}<br>${escapar(endereco.bairro)} — ${escapar(endereco.cidade)}/${escapar(endereco.uf)}</dd></div>
            </dl>
            <div class="acoes" style="margin-top:18px">
              <a class="btn btn-secundario btn-sm" href="${escapar(linkMaps(centro))}" rel="noopener" target="_blank">Abrir no mapa</a>
            </div>
          </div>

          ${anuncio(dados, "empresa", 2, "anuncio-lateral")}

          <div class="bloco">
            <h2>Está aqui também</h2>
            <p style="color:var(--ink-soft);font-size:.92rem">Outras empresas da Torre ${escapar(item.torre)}:</p>
            <ul style="margin:0;padding-left:18px;display:grid;gap:6px">
              ${vizinhas.map((e) => `<li><a href="${u("empresas/" + e.slug + "/")}">${escapar(e.nome)}</a> <small style="color:var(--muted)">· ${escapar(e.categoriaNome)}</small></li>`).join("\n              ") || "<li style=\"color:var(--muted)\">Sem outras empresas cadastradas nesta torre.</li>"}
            </ul>
          </div>
        </aside>
      </div>

      ${relacionadas.length ? `<section class="secao">
        <div class="secao-topo">
          <div>
            <span class="olho">Mesma área</span>
            <h2>Também em ${escapar(item.categoriaNome)}</h2>
          </div>
          <a class="btn btn-secundario btn-sm" href="${u("categorias/" + item.categoria + "/")}">Ver categoria</a>
        </div>
        ${grade(relacionadas, 2)}
      </section>` : ""}
    </div>`;

  return pagina(dados, {
    profundidade: 2,
    caminho: `empresas/${item.slug}/`,
    atual: "empresas",
    titulo: item.nome,
    descricao: `${item.nome} — ${item.categoriaNome} na Torre ${item.torre}, sala ${item.sala}, do ${centro.nome}. ${item.descricao}`.slice(0, 300),
    conteudo,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: item.nome,
      description: item.descricao,
      telephone: item.telefone || undefined,
      email: item.email || undefined,
      url: item.site || undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: `${endereco.logradouro}, Torre ${item.torre}, Sala ${item.sala}`,
        addressLocality: endereco.cidade,
        addressRegion: endereco.uf,
        postalCode: endereco.cep,
        addressCountry: "BR"
      },
      containedInPlace: { "@type": "Place", name: centro.nome }
    }
  });
}

function listaCategorias(dados) {
  const conteudo = `    <section class="secao">
      <div class="container">
        <div class="secao-cabecalho">
          <span class="olho">Por área de atuação</span>
          <h1>Categorias</h1>
          <p>As ${dados.estatisticas.empresas} empresas do complexo, organizadas em ${dados.estatisticas.categorias} áreas de atuação.</p>
        </div>
        <div class="grade grade-3">
          ${dados.categorias.map((c) => `<a class="cartao-cat" href="${url(1, "categorias/" + c.slug + "/")}">
            <span class="icone" aria-hidden="true">${escapar(c.icone)}</span>
            <span>
              <b>${escapar(c.nome)}</b>
              <small>${escapar(c.descricao)}</small>
              <br><small><strong>${c.empresas.length}</strong> ${c.empresas.length === 1 ? "empresa" : "empresas"}</small>
            </span>
          </a>`).join("\n          ")}
        </div>
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 1,
    caminho: "categorias/",
    atual: "categorias",
    titulo: "Categorias",
    descricao: `Empresas do ${dados.centro.nome} organizadas por área de atuação.`,
    conteudo
  });
}

function categoria(dados, cat) {
  const conteudo = `    <div class="container">
      <nav class="migalhas" aria-label="Trilha de navegação">
        <a href="${url(2, "")}">Início</a><span>›</span>
        <a href="${url(2, "categorias/")}">Categorias</a><span>›</span>
        ${escapar(cat.nome)}
      </nav>
    </div>
    <section class="secao" style="padding-top:22px">
      <div class="container">
        <div class="secao-cabecalho">
          <span class="olho">${escapar(cat.icone)} Categoria</span>
          <h1>${escapar(cat.nome)}</h1>
          <p>${escapar(cat.descricao)} São ${cat.empresas.length} ${cat.empresas.length === 1 ? "empresa cadastrada" : "empresas cadastradas"} nas Torres A e B.</p>
        </div>
        <p class="nota-ordem">Empresas em ordem alfabética.</p>
        ${grade(cat.empresas, 2)}
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 2,
    caminho: `categorias/${cat.slug}/`,
    atual: "categorias",
    titulo: cat.nome,
    descricao: `${cat.nome} no ${dados.centro.nome}: ${cat.descricao}`,
    conteudo
  });
}

/* ---------- navegação encadeada: torre → categoria → empresas ----------- */

function listaTorres(dados) {
  const conteudo = `    <section class="secao">
      <div class="container">
        <div class="secao-cabecalho">
          <span class="olho">Navegação por torre</span>
          <h1>Escolha a torre</h1>
          <p>Comece pela torre e desça até o tipo de serviço. É o caminho mais rápido para achar quem resolve o seu problema sem sair do prédio.</p>
        </div>

        <div class="grade grade-2">
          ${dados.torres.map((t) => `<div class="cartao">
            <div class="cartao-topo">
              <span class="cartao-categoria">🏢 ${escapar(t.nome)}</span>
              <span class="etiqueta">${escapar(t.andares)}</span>
            </div>
            <h3><a href="${url(1, "torres/" + t.id.toLowerCase() + "/")}">${escapar(t.nome)}</a></h3>
            <p>${escapar(t.descricao)}</p>
            <div class="tags">
              ${t.categorias.slice(0, 6).map((c) => `<a class="etiqueta" href="${url(1, "torres/" + t.id.toLowerCase() + "/" + c.slug + "/")}">${escapar(c.icone)} ${escapar(c.nome)} (${c.empresas.length})</a>`).join("")}
              ${t.categorias.length > 6 ? `<span class="etiqueta">+${t.categorias.length - 6}</span>` : ""}
            </div>
            <div class="cartao-rodape">
              <span class="etiqueta etiqueta-torre">${t.total} ${t.total === 1 ? "empresa" : "empresas"} · ${t.categorias.length} categorias</span>
              <a href="${url(1, "torres/" + t.id.toLowerCase() + "/")}">Ver serviços →</a>
            </div>
          </div>`).join("\n          ")}
        </div>
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 1,
    caminho: "torres/",
    atual: "torres",
    titulo: "Torres",
    descricao: `Empresas do ${dados.centro.nome} organizadas por torre e por tipo de serviço.`,
    conteudo
  });
}

function torre(dados, item) {
  const base = "torres/" + item.id.toLowerCase() + "/";

  const conteudo = `    <div class="container">
      <nav class="migalhas" aria-label="Trilha de navegação">
        <a href="${url(2, "")}">Início</a><span>›</span>
        <a href="${url(2, "torres/")}">Torres</a><span>›</span>
        ${escapar(item.nome)}
      </nav>
    </div>
    <section class="secao" style="padding-top:22px">
      <div class="container">
        <div class="cabecalho-com-foto">
          ${item.imagem ? `<img class="foto-torre" src="${url(2, item.imagem.src)}" alt="${escapar(item.imagem.alt)}">` : ""}
          <div class="secao-cabecalho" style="margin-bottom:0">
            <span class="olho">Passo 2 de 3 · Tipo de serviço</span>
            <h1>${escapar(item.nome)}</h1>
            <p>${escapar(item.descricao)} São ${item.total} ${item.total === 1 ? "empresa" : "empresas"} em ${item.categorias.length} ${item.categorias.length === 1 ? "categoria" : "categorias"}, do ${escapar(item.andares)}.</p>
          </div>
        </div>

        <div class="grade grade-3" style="margin-bottom:30px">
          ${item.categorias.map((c) => `<a class="cartao-cat" href="${url(2, base + c.slug + "/")}">
            <span class="icone" aria-hidden="true">${escapar(c.icone)}</span>
            <span>
              <b>${escapar(c.nome)}</b>
              <small>${c.empresas.length} ${c.empresas.length === 1 ? "empresa" : "empresas"} nesta torre</small>
            </span>
          </a>`).join("\n          ")}
        </div>

        <div class="resultado-info compacto">
          <span>Prefere ver tudo de uma vez?</span>
          <a href="${url(2, "empresas/?torre=" + encodeURIComponent(item.id))}">Abrir as ${item.total} empresas da ${escapar(item.nome)} no diretório →</a>
        </div>

        ${anuncio(dados, "torre", 2, "anuncio-faixa")}
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 2,
    caminho: base,
    atual: "torres",
    titulo: item.nome,
    descricao: `Serviços disponíveis na ${item.nome} do ${dados.centro.nome}: ${item.categorias.map((c) => c.nome).join(", ")}.`.slice(0, 300),
    conteudo
  });
}

function torreCategoria(dados, item, cat) {
  const base = "torres/" + item.id.toLowerCase() + "/";
  const naOutraTorre = dados.torres
    .filter((t) => t.id !== item.id)
    .map((t) => ({ torre: t, cat: t.categorias.find((c) => c.slug === cat.slug) }))
    .filter((par) => par.cat);

  const conteudo = `    <div class="container">
      <nav class="migalhas" aria-label="Trilha de navegação">
        <a href="${url(3, "")}">Início</a><span>›</span>
        <a href="${url(3, "torres/")}">Torres</a><span>›</span>
        <a href="${url(3, base)}">${escapar(item.nome)}</a><span>›</span>
        ${escapar(cat.nome)}
      </nav>
    </div>
    <section class="secao" style="padding-top:22px">
      <div class="container">
        <div class="secao-cabecalho">
          <span class="olho">${escapar(item.nome)} · ${escapar(cat.icone)} ${escapar(cat.nome)}</span>
          <h1>${escapar(cat.nome)} na ${escapar(item.nome)}</h1>
          <p>${escapar(cat.descricao)}</p>
        </div>

        <div class="chips" style="margin-bottom:24px">
          <a class="chip" href="${url(3, base)}">← Outras categorias da ${escapar(item.nome)}</a>
          ${naOutraTorre.map((par) => `<a class="chip" href="${url(3, "torres/" + par.torre.id.toLowerCase() + "/" + cat.slug + "/")}">${escapar(cat.nome)} na ${escapar(par.torre.nome)} (${par.cat.empresas.length})</a>`).join("\n          ")}
          <a class="chip" href="${url(3, "categorias/" + cat.slug + "/")}">Ver nas duas torres</a>
        </div>

        <p class="nota-ordem">Empresas em ordem alfabética.</p>
        ${grade(cat.empresas, 3)}

        ${anuncio(dados, "torre", 3, "anuncio-faixa")}
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 3,
    caminho: base + cat.slug + "/",
    atual: "torres",
    titulo: `${cat.nome} na ${item.nome}`,
    descricao: `${cat.empresas.length} ${cat.empresas.length === 1 ? "empresa" : "empresas"} de ${cat.nome} na ${item.nome} do ${dados.centro.nome}.`,
    conteudo
  });
}

function vantagens(dados) {
  const porTorre = dados.torres.map((torre) => ({
    torre,
    itens: dados.vantagens.filter((e) => e.torre === torre.id)
  }));

  const conteudo = `    <section class="secao">
      <div class="container">
        <div class="secao-cabecalho">
          <span class="olho">Sinergia entre condôminos</span>
          <h1>Vantagens de ser vizinho</h1>
          <p>Condições especiais que as empresas do complexo oferecem umas às outras. Ao procurar um vizinho, mencione que você é condômino do ${escapar(dados.centro.sigla)}.</p>
        </div>

        ${porTorre.map((grupo) => `<div style="margin-bottom:34px">
          <h2>${escapar(grupo.torre.nome)} <small style="color:var(--muted);font-weight:500;font-size:.9rem">· ${grupo.itens.length} ${grupo.itens.length === 1 ? "oferta" : "ofertas"}</small></h2>
          <div class="grade grade-2">
            ${grupo.itens.map((e) => `<div class="vantagem">
              <h3><a href="${url(1, "empresas/" + e.slug + "/")}">${escapar(e.nome)}</a></h3>
              <span class="meta">${escapar(e.categoriaNome)} · Sala ${escapar(e.sala)}</span>
              <p>${escapar(e.beneficio)}</p>
            </div>`).join("\n            ")}
          </div>
        </div>`).join("\n        ")}

        <div class="chamada">
          <div>
            <h2>Quer oferecer uma vantagem?</h2>
            <p>Toda empresa cadastrada pode publicar uma condição especial para os vizinhos das duas torres. É a forma mais direta de girar negócios dentro do próprio complexo.</p>
          </div>
          <a class="btn btn-accent" href="${url(1, "cadastro/")}">Publicar minha oferta</a>
        </div>
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 1,
    caminho: "vantagens/",
    atual: "vantagens",
    titulo: "Vantagens entre condôminos",
    descricao: `Descontos e condições especiais oferecidos entre as empresas do ${dados.centro.nome}.`,
    conteudo
  });
}

function oCentro(dados) {
  const { centro, torres, estatisticas } = dados;

  const conteudo = `    <section class="secao">
      <div class="container">
        <div class="secao-cabecalho">
          <span class="olho">O complexo</span>
          <h1>${escapar(centro.nome)}</h1>
          <p>${escapar(centro.descricaoCurta)}</p>
        </div>

        ${figuraComplexo(centro.imagens && centro.imagens.fachada, 1, "figura figura-larga")}

        <div class="grade grade-2" style="margin-bottom:34px">
          ${torres.map((t) => `<div class="cartao cartao-torre">
            ${t.imagem ? `<img class="foto-torre" src="${url(1, t.imagem.src)}" alt="${escapar(t.imagem.alt)}" loading="lazy">` : ""}
            <h3>${escapar(t.nome)}</h3>
            <p>${escapar(t.descricao)}</p>
            <div class="cartao-rodape">
              <span class="etiqueta etiqueta-torre">${escapar(t.andares)}</span>
              <a href="${url(1, "torres/" + t.id.toLowerCase() + "/")}">${t.total} ${t.total === 1 ? "empresa" : "empresas"} →</a>
            </div>
          </div>`).join("\n          ")}
        </div>

        ${centro.imagens && centro.imagens.galeria && centro.imagens.galeria.length ? `<h2>O complexo por dentro</h2>
        <div class="grade grade-3" style="margin-bottom:34px">
          ${centro.imagens.galeria.map((img) => figuraComplexo(img, 1)).join("\n          ")}
        </div>` : ""}

        <h2>Estrutura</h2>
        <div class="grade grade-3" style="margin-bottom:34px">
          ${centro.estrutura.map((item) => `<div class="cartao">
            <div class="item-estrutura">
              <span class="icone" aria-hidden="true">${escapar(item.icone)}</span>
              <span>
                <b>${escapar(item.titulo)}</b>
                <p>${escapar(item.texto)}</p>
              </span>
            </div>
          </div>`).join("\n          ")}
        </div>

        <div class="colunas">
          <div class="bloco">
            <h2>Localização</h2>
            <p>O centro empresarial fica em ${escapar(centro.endereco.bairro)}, ${escapar(centro.endereco.cidade)}, conectado ao Shopping Liberty Mall — o que coloca alimentação, bancos e serviços a poucos minutos da sua sala.</p>
            <dl class="lista-dados">
              <div><dt>Endereço</dt><dd>${escapar(centro.endereco.logradouro)}<br>${escapar(centro.endereco.complemento)}</dd></div>
              <div><dt>Cidade</dt><dd>${escapar(centro.endereco.bairro)} — ${escapar(centro.endereco.cidade)}/${escapar(centro.endereco.uf)}</dd></div>
              <div><dt>CEP</dt><dd>${escapar(centro.endereco.cep)}</dd></div>
            </dl>
            <div class="acoes" style="margin-top:18px">
              <a class="btn btn-secundario btn-sm" href="${escapar(linkMaps(centro))}" rel="noopener" target="_blank">Abrir no Google Maps</a>
            </div>
          </div>

          <div>
            <div class="bloco">
              <h2>Administração</h2>
              <dl class="lista-dados">
                <div><dt>E-mail</dt><dd><a href="mailto:${escapar(centro.contato.administracao)}">${escapar(centro.contato.administracao)}</a></dd></div>
                <div><dt>Telefone</dt><dd>${escapar(centro.contato.telefone)}</dd></div>
                <div><dt>Portaria</dt><dd>${escapar(centro.contato.horarioPortaria)}</dd></div>
              </dl>
            </div>
            <div class="bloco">
              <h2>O guia em números</h2>
              <dl class="lista-dados">
                <div><dt>Empresas</dt><dd>${estatisticas.empresas}</dd></div>
                <div><dt>Categorias</dt><dd>${estatisticas.categorias}</dd></div>
                <div><dt>Vantagens</dt><dd>${estatisticas.vantagens}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 1,
    caminho: "o-centro/",
    atual: "centro",
    titulo: "O Centro Empresarial",
    descricao: `Estrutura, torres e localização do ${centro.nome}, em ${centro.endereco.bairro}, ${centro.endereco.cidade}.`,
    conteudo
  });
}

function cadastro(dados) {
  const opcoesCategoria = dados.categorias
    .map((c) => `<option value="${escapar(c.nome)}">${escapar(c.nome)}</option>`)
    .join("\n              ");

  const opcoesTorre = dados.torres
    .map((t) => `<option value="${escapar(t.id)}">${escapar(t.nome)}</option>`)
    .join("\n              ");

  const conteudo = `    <section class="secao">
      <div class="container">
        <div class="secao-cabecalho">
          <span class="olho">Gratuito para condôminos</span>
          <h1>Cadastre ou atualize sua empresa</h1>
          <p>Preencha os campos abaixo e o formulário abrirá um e-mail já preenchido para a administração do guia. Assim que os dados forem conferidos, sua empresa entra no diretório.</p>
        </div>

        <div class="colunas">
          <form class="bloco" id="form-cadastro" data-destino="${escapar(dados.centro.contato.administracao)}">
            <div class="grade grade-2" style="margin-bottom:14px">
              <div class="campo">
                <label for="c-nome">Nome da empresa *</label>
                <input id="c-nome" name="Empresa" type="text" required>
              </div>
              <div class="campo">
                <label for="c-categoria">Categoria *</label>
                <select id="c-categoria" name="Categoria" required>
                  <option value="">Selecione</option>
                  ${opcoesCategoria}
                  <option value="Outra">Outra (descreva abaixo)</option>
                </select>
              </div>
              <div class="campo">
                <label for="c-torre">Torre *</label>
                <select id="c-torre" name="Torre" required>
                  <option value="">Selecione</option>
                  ${opcoesTorre}
                </select>
              </div>
              <div class="campo">
                <label for="c-sala">Sala *</label>
                <input id="c-sala" name="Sala" type="text" required placeholder="Ex.: 1208">
              </div>
              <div class="campo">
                <label for="c-responsavel">Responsável</label>
                <input id="c-responsavel" name="Responsável" type="text">
              </div>
              <div class="campo">
                <label for="c-telefone">Telefone / WhatsApp</label>
                <input id="c-telefone" name="Telefone" type="tel" placeholder="(61) 90000-0000">
              </div>
              <div class="campo">
                <label for="c-email">E-mail de contato</label>
                <input id="c-email" name="E-mail" type="email">
              </div>
              <div class="campo">
                <label for="c-site">Site ou Instagram</label>
                <input id="c-site" name="Site" type="text">
              </div>
              <div class="campo">
                <label for="c-horario">Horário de atendimento</label>
                <input id="c-horario" name="Horário" type="text" placeholder="Seg a sex, 9h às 18h">
              </div>
              <div class="campo">
                <label for="c-servicos">Principais serviços</label>
                <input id="c-servicos" name="Serviços" type="text" placeholder="Separe por vírgulas">
              </div>
            </div>

            <div class="campo" style="margin-bottom:14px">
              <label for="c-descricao">Descrição da empresa *</label>
              <textarea id="c-descricao" name="Descrição" required placeholder="Em duas ou três linhas, o que sua empresa faz."></textarea>
            </div>

            <div class="campo" style="margin-bottom:18px">
              <label for="c-beneficio">Vantagem oferecida aos condôminos</label>
              <textarea id="c-beneficio" name="Vantagem" placeholder="Ex.: 10% de desconto para empresas das Torres A e B."></textarea>
            </div>

            <div class="acoes">
              <button class="btn" type="submit">Gerar e-mail de cadastro</button>
              <button class="btn btn-secundario" type="reset">Limpar</button>
            </div>
            <p id="cadastro-aviso" style="margin-top:14px;color:var(--muted);font-size:.88rem">
              Nada é enviado automaticamente: o botão apenas abre seu programa de e-mail com as informações preenchidas, para você conferir antes de enviar.
            </p>
          </form>

          <aside>
            <div class="bloco">
              <h2>Como funciona</h2>
              <ol style="margin:0;padding-left:20px;display:grid;gap:10px;color:var(--ink-soft)">
                <li>Você preenche o formulário e envia o e-mail gerado.</li>
                <li>A administração do guia confere os dados com o cadastro do condomínio.</li>
                <li>A ficha da empresa entra no ar e passa a aparecer nas buscas.</li>
              </ol>
            </div>
            <div class="bloco destaque-beneficio">
              <b>🤝 Dica</b>
              <p>Empresas que publicam uma vantagem para vizinhos aparecem também na página <a href="${url(1, "vantagens/")}">Vantagens</a> — é onde os condôminos procuram quando precisam contratar dentro de casa.</p>
            </div>
            <div class="bloco">
              <h2>Prefere falar direto?</h2>
              <p style="color:var(--ink-soft)">Escreva para <a href="mailto:${escapar(dados.centro.contato.administracao)}">${escapar(dados.centro.contato.administracao)}</a> ou ligue para ${escapar(dados.centro.contato.telefone)}.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 1,
    caminho: "cadastro/",
    atual: "cadastro",
    titulo: "Cadastrar empresa",
    descricao: `Cadastre gratuitamente sua empresa no guia do ${dados.centro.nome}.`,
    conteudo,
    scripts: ["cadastro.js"]
  });
}

function anuncie(dados) {
  const publicidade = dados.centro.publicidade || {};
  const espacos = Object.keys(dados.anuncios).map((espaco) => ({
    espaco,
    modelo: dados.anuncios[espaco][0] || {},
    ocupado: dados.anuncios[espaco].some((a) => a.ativo)
  }));

  const nomes = {
    home: "Página inicial",
    diretorio: "Diretório de empresas",
    empresa: "Fichas de empresa",
    torre: "Páginas de torre e categoria"
  };

  const conteudo = `    <section class="secao">
      <div class="container">
        <div class="secao-cabecalho">
          <span class="olho">Mídia</span>
          <h1>Anuncie no guia do complexo</h1>
          <p>O guia é consultado por quem já está dentro do ${escapar(dados.centro.nome)}: condôminos procurando fornecedor, clientes localizando uma sala e visitantes decidindo onde almoçar. São ${dados.estatisticas.empresas} empresas cadastradas em ${dados.estatisticas.torres} torres.</p>
        </div>

        <div class="grade grade-2">
          ${espacos.map((item) => `<div class="cartao">
            <div class="cartao-topo">
              <span class="cartao-categoria">📢 ${escapar(nomes[item.espaco] || item.espaco)}</span>
              <span class="etiqueta ${item.ocupado ? "" : "etiqueta-destaque"}">${item.ocupado ? "ocupado" : "disponível"}</span>
            </div>
            <p>${escapar(item.modelo.formato || "Formato a definir")}.</p>
          </div>`).join("\n          ")}
        </div>

        <div class="chamada" style="margin-top:32px">
          <div>
            <h2>Quer reservar um espaço?</h2>
            <p>Fale com a administração do guia para receber formatos, medidas e valores. Condôminos têm condição diferenciada.</p>
          </div>
          <a class="btn btn-accent" href="mailto:${escapar(publicidade.contato || dados.centro.contato.administracao)}">Falar com o comercial</a>
        </div>

        <div class="bloco" style="margin-top:28px">
          <h2>Como funciona na prática</h2>
          <p style="color:var(--ink-soft)">Cada espaço é um registro em <code>data/anuncios.json</code>. Para colocar uma campanha no ar, basta preencher o anúncio correspondente com título, texto, imagem e link, marcar <code>"ativo": true</code> e publicar. Enquanto nenhum anúncio está ativo, o espaço exibe um convite para anunciar, sem quebrar o layout da página.</p>
        </div>
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 1,
    caminho: "anuncie/",
    atual: "anuncie",
    titulo: "Anuncie",
    descricao: `Espaços publicitários disponíveis no guia de empresas do ${dados.centro.nome}.`,
    conteudo
  });
}

/* O 404 pode ser servido a partir de qualquer caminho, então seus links
   precisam ser absolutos em relação à raiz do site. */
function naoEncontrado(dados) {
  let base = "/";
  try {
    if (dados.centro.siteUrl) {
      base = new URL(dados.centro.siteUrl).pathname.replace(/\/?$/, "/");
    }
  } catch (erro) {
    base = "/";
  }
  const u = (caminho) => base + (caminho || "");

  const conteudo = `    <section class="secao">
      <div class="container texto-centro">
        <span class="olho">Erro 404</span>
        <h1>Página não encontrada</h1>
        <p style="color:var(--ink-soft);max-width:56ch;margin-inline:auto">
          O endereço acessado não existe ou a empresa saiu do guia. Use a busca do diretório para encontrar quem você procura.
        </p>
        <div class="acoes" style="justify-content:center;margin-top:24px">
          <a class="btn" href="${u("empresas/")}">Ir para o diretório</a>
          <a class="btn btn-secundario" href="${u("")}">Voltar ao início</a>
        </div>
      </div>
    </section>`;

  return pagina(dados, {
    profundidade: 0,
    baseFixa: base,
    atual: "",
    titulo: "Página não encontrada",
    conteudo
  });
}

module.exports = { home, diretorio, empresa, listaCategorias, categoria, listaTorres, torre, torreCategoria, vantagens, oCentro, cadastro, anuncie, naoEncontrado };

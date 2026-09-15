"use strict";

const { pagina, escapar, url } = require("./layout");
const { paraBusca } = require("./dados");

/* ---------- componentes reutilizáveis ------------------------------------ */

function cartaoEmpresa(empresa, profundidade) {
  const u = (caminho) => url(profundidade, caminho);
  const tags = empresa.tags.slice(0, 3)
    .map((tag) => `<span class="etiqueta">${escapar(tag)}</span>`)
    .join("");

  return `<a class="cartao" href="${u("empresas/" + empresa.slug + "/")}">
          <div class="cartao-topo">
            <span class="cartao-categoria">${escapar(empresa.categoriaIcone)} ${escapar(empresa.categoriaNome)}</span>
            ${empresa.demo ? '<span class="etiqueta etiqueta-demo">demo</span>' : ""}
          </div>
          <h3>${escapar(empresa.nome)}</h3>
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
  const destaques = dados.empresas.filter((e) => e.destaque).slice(0, 6);
  const vantagens = dados.vantagens.slice(0, 3);

  const conteudo = `    <section class="hero">
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
          <a href="${url(0, "empresas/?torre=A")}">Torre A</a>
          <a href="${url(0, "empresas/?torre=B")}">Torre B</a>
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

    <section class="secao secao-alt">
      <div class="container">
        <div class="secao-topo">
          <div>
            <span class="olho">Vizinhos em destaque</span>
            <h2>Empresas do complexo</h2>
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
          ${torres.map((t) => `<div class="cartao">
            <h3>${escapar(t.nome)}</h3>
            <p>${escapar(t.descricao)}</p>
            <div class="cartao-rodape">
              <span class="etiqueta etiqueta-torre">${t.total} ${t.total === 1 ? "empresa" : "empresas"} · ${escapar(t.andares)}</span>
              <a href="${url(0, "empresas/?torre=" + encodeURIComponent(t.id))}">Ver empresas →</a>
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
              <option value="nome">Nome</option>
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
          <a href="${url(1, "cadastro/")}">Não encontrou sua empresa? Cadastre-se →</a>
        </div>

        <div id="resultados" class="grade grade-3" data-base="${url(1, "")}">
          ${dados.empresas.map((e) => cartaoEmpresa(e, 1)).join("\n          ")}
        </div>

        <noscript>
          <p class="vazio" style="margin-top:20px">A busca e os filtros precisam de JavaScript. A lista completa de empresas continua visível acima.</p>
        </noscript>
      </div>
    </section>

    <script id="dados-empresas" type="application/json">${JSON.stringify(paraBusca(dados.empresas))}</script>`;

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

      <header class="empresa-topo">
        <div class="empresa-meta">
          <span class="cartao-categoria">${escapar(item.categoriaIcone)} ${escapar(item.categoriaNome)}</span>
          <span class="etiqueta etiqueta-torre">Torre ${escapar(item.torre)} · Sala ${escapar(item.sala)}</span>
          ${item.demo ? '<span class="etiqueta etiqueta-demo">dados de demonstração</span>' : ""}
        </div>
        <h1>${escapar(item.nome)}</h1>
        <p class="empresa-resumo">${escapar(item.descricao)}</p>
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

        <div class="grade grade-2" style="margin-bottom:34px">
          ${torres.map((t) => `<div class="cartao">
            <h3>${escapar(t.nome)}</h3>
            <p>${escapar(t.descricao)}</p>
            <div class="cartao-rodape">
              <span class="etiqueta etiqueta-torre">${escapar(t.andares)}</span>
              <a href="${url(1, "empresas/?torre=" + encodeURIComponent(t.id))}">${t.total} ${t.total === 1 ? "empresa" : "empresas"} →</a>
            </div>
          </div>`).join("\n          ")}
        </div>

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

module.exports = { home, diretorio, empresa, listaCategorias, categoria, vantagens, oCentro, cadastro, naoEncontrado };

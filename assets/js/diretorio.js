/* Diretório de empresas: busca e filtros aplicados no navegador.
   Os dados chegam embutidos na página (<script type="application/json">),
   o que mantém o site funcional sem servidor de API. Para migrar a um
   backend, basta trocar `carregarEmpresas()` por uma chamada fetch. */
(function () {
  "use strict";

  var raiz = document.getElementById("resultados");
  if (!raiz) return;

  var fonte = document.getElementById("dados-empresas");
  var empresas = carregarEmpresas();
  var baseUrl = raiz.getAttribute("data-base") || "";

  var campoBusca = document.getElementById("filtro-busca");
  var campoCategoria = document.getElementById("filtro-categoria");
  var campoOrdem = document.getElementById("filtro-ordem");
  var chipsTorre = Array.prototype.slice.call(document.querySelectorAll("[data-torre]"));
  var contador = document.getElementById("contador");
  var botaoLimpar = document.getElementById("limpar-filtros");

  var estado = { q: "", categoria: "", torre: "", ordem: "vitrine" };

  function carregarEmpresas() {
    if (!fonte) return [];
    try {
      return JSON.parse(fonte.textContent);
    } catch (erro) {
      console.error("Não foi possível ler os dados das empresas:", erro);
      return [];
    }
  }

  /* Remove acentos e caixa para que "clinica" encontre "Clínica". */
  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  function indexar(empresa) {
    return normalizar([
      empresa.nome,
      empresa.descricao,
      empresa.categoriaNome,
      empresa.responsavel,
      "sala " + empresa.sala,
      empresa.andar + "o andar",
      "torre " + empresa.torre,
      (empresa.tags || []).join(" "),
      /* termos equivalentes: quem busca "dentista" deve achar "Odontologia" */
      (empresa.sinonimos || []).join(" ")
    ].join(" "));
  }

  empresas.forEach(function (empresa) {
    empresa._indice = indexar(empresa);
  });

  var catalogoCategorias = (function () {
    var vistos = {};
    empresas.forEach(function (e) {
      if (!vistos[e.categoria]) vistos[e.categoria] = { slug: e.categoria, nome: e.categoriaNome };
    });
    return Object.keys(vistos).map(function (slug) { return vistos[slug]; })
      .sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
  })();

  function lerUrl() {
    var params = new URLSearchParams(window.location.search);
    estado.q = params.get("q") || "";
    estado.categoria = params.get("categoria") || "";
    estado.torre = params.get("torre") || "";
    estado.ordem = params.get("ordem") || "vitrine";
  }

  function escreverUrl() {
    var params = new URLSearchParams();
    if (estado.q) params.set("q", estado.q);
    if (estado.categoria) params.set("categoria", estado.categoria);
    if (estado.torre) params.set("torre", estado.torre);
    if (estado.ordem && estado.ordem !== "vitrine") params.set("ordem", estado.ordem);
    var query = params.toString();
    history.replaceState(null, "", query ? "?" + query : window.location.pathname);
  }

  /* Cada termo casa o início de uma palavra ("conta" acha "contabilidade").
     Termos de uma ou duas letras exigem a palavra inteira, senão buscar
     "torre b" traria qualquer texto que contenha a letra b. */
  function padraoDoTermo(termo) {
    var escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(termo.length <= 2 ? "(^| )" + escapado + "( |$)" : "(^| )" + escapado);
  }

  function passaTexto(empresa, padroes) {
    return padroes.every(function (padrao) { return padrao.test(empresa._indice); });
  }

  function contar(lista, campo) {
    return lista.reduce(function (acumulado, empresa) {
      acumulado[empresa[campo]] = (acumulado[empresa[campo]] || 0) + 1;
      return acumulado;
    }, {});
  }

  function ordenar(lista) {
    return lista.sort(function (a, b) {
      /* lista geral: quem enviou imagem aparece primeiro */
      if (estado.ordem === "vitrine" && a.temImagem !== b.temImagem) {
        return a.temImagem ? -1 : 1;
      }
      if (estado.ordem === "torre") {
        if (a.torre !== b.torre) return a.torre.localeCompare(b.torre);
        if (a.andar !== b.andar) return a.andar - b.andar;
      }
      if (estado.ordem === "categoria" && a.categoriaNome !== b.categoriaNome) {
        return a.categoriaNome.localeCompare(b.categoriaNome, "pt-BR");
      }
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }

  /* Filtros encadeados: cada controle é contado sobre o resultado dos
     outros, de modo que as categorias oferecidas são só as que existem na
     torre escolhida — e as contagens por torre respeitam a categoria. */
  function calcular() {
    var padroes = normalizar(estado.q).split(/\s+/).filter(Boolean).map(padraoDoTermo);
    var base = empresas.filter(function (empresa) { return passaTexto(empresa, padroes); });

    var naTorre = estado.torre
      ? base.filter(function (e) { return e.torre === estado.torre; })
      : base;
    var naCategoria = estado.categoria
      ? base.filter(function (e) { return e.categoria === estado.categoria; })
      : base;

    return {
      lista: ordenar(naTorre.filter(function (e) {
        return !estado.categoria || e.categoria === estado.categoria;
      })),
      categoriasDisponiveis: contar(naTorre, "categoria"),
      torresDisponiveis: contar(naCategoria, "torre")
    };
  }

  function escapar(texto) {
    return String(texto || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function marca(empresa) {
    if (empresa.logo) {
      return '<img class="marca-empresa" src="' + baseUrl + escapar(empresa.logo) +
             '" alt="Logotipo de ' + escapar(empresa.nome) + '" loading="lazy" width="96" height="96">';
    }
    return '<span class="marca-empresa monograma" aria-hidden="true">' + escapar(empresa.iniciais) + "</span>";
  }

  function cartao(empresa) {
    var tags = (empresa.tags || []).slice(0, 3).map(function (tag) {
      return '<span class="etiqueta">' + escapar(tag) + "</span>";
    }).join("");

    return (
      '<a class="cartao' + (empresa.temImagem ? " cartao-com-imagem" : "") +
        '" href="' + baseUrl + "empresas/" + escapar(empresa.slug) + '/">' +
        '<div class="cartao-topo">' +
          '<span class="cartao-categoria">' + escapar(empresa.categoriaIcone) + " " + escapar(empresa.categoriaNome) + "</span>" +
          (empresa.demo ? '<span class="etiqueta etiqueta-demo">demo</span>' : "") +
        "</div>" +
        '<div class="cartao-identidade">' + marca(empresa) + "<h3>" + escapar(empresa.nome) + "</h3></div>" +
        "<p>" + escapar(empresa.descricao) + "</p>" +
        (tags ? '<div class="tags">' + tags + "</div>" : "") +
        '<div class="cartao-rodape">' +
          '<span class="etiqueta etiqueta-torre">Torre ' + escapar(empresa.torre) + " · Sala " + escapar(empresa.sala) + "</span>" +
          "<span>Ver ficha →</span>" +
        "</div>" +
      "</a>"
    );
  }

  function renderizar(resultado) {
    var lista = resultado.lista;

    contador.textContent = lista.length === 1
      ? "1 empresa encontrada"
      : lista.length + " empresas encontradas";

    if (!lista.length) {
      raiz.className = "";
      raiz.innerHTML =
        '<div class="vazio"><b>Nenhuma empresa encontrada</b>' +
        "<p>Tente outro termo, mude a torre ou limpe os filtros. " +
        "Se a sua empresa ainda não está aqui, " +
        '<a href="' + baseUrl + 'cadastro/">envie o cadastro</a>.</p></div>';
      return;
    }

    raiz.className = "grade grade-3";
    raiz.innerHTML = lista.map(cartao).join("");
  }

  function sincronizarControles(resultado) {
    if (campoBusca && campoBusca.value !== estado.q) campoBusca.value = estado.q;
    if (campoOrdem) campoOrdem.value = estado.ordem;

    if (campoCategoria) {
      var disponiveis = resultado.categoriasDisponiveis;
      var opcoes = ['<option value="">Todas as categorias</option>'];

      catalogoCategorias.forEach(function (categoria) {
        var quantidade = disponiveis[categoria.slug] || 0;
        /* a categoria escolhida continua na lista mesmo se zerar, para que
           o usuário veja o que aconteceu com o filtro dele */
        if (!quantidade && categoria.slug !== estado.categoria) return;
        opcoes.push(
          '<option value="' + escapar(categoria.slug) + '">' +
          escapar(categoria.nome) + " (" + quantidade + ")</option>"
        );
      });

      campoCategoria.innerHTML = opcoes.join("");
      campoCategoria.value = estado.categoria;
    }

    chipsTorre.forEach(function (chip) {
      var torre = chip.getAttribute("data-torre");
      var quantidade = resultado.torresDisponiveis[torre] || 0;
      chip.setAttribute("aria-pressed", String(torre === estado.torre));
      chip.textContent = "Torre " + torre + " · " + quantidade;
      chip.disabled = quantidade === 0 && torre !== estado.torre;
    });
  }

  function atualizar() {
    var resultado = calcular();
    sincronizarControles(resultado);
    escreverUrl();
    renderizar(resultado);
  }

  if (campoBusca) {
    campoBusca.addEventListener("input", function () {
      estado.q = campoBusca.value;
      atualizar();
    });
  }
  if (campoCategoria) {
    campoCategoria.addEventListener("change", function () {
      estado.categoria = campoCategoria.value;
      atualizar();
    });
  }
  if (campoOrdem) {
    campoOrdem.addEventListener("change", function () {
      estado.ordem = campoOrdem.value;
      atualizar();
    });
  }
  chipsTorre.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var valor = chip.getAttribute("data-torre");
      estado.torre = estado.torre === valor ? "" : valor;
      atualizar();
    });
  });
  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", function () {
      estado = { q: "", categoria: "", torre: "", ordem: "vitrine" };
      atualizar();
      if (campoBusca) campoBusca.focus();
    });
  }

  var formulario = document.getElementById("form-filtros");
  if (formulario) {
    formulario.addEventListener("submit", function (evento) { evento.preventDefault(); });
  }

  lerUrl();
  atualizar();
})();

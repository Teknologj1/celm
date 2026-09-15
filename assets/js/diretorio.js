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

  var estado = { q: "", categoria: "", torre: "", ordem: "nome" };

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

  function lerUrl() {
    var params = new URLSearchParams(window.location.search);
    estado.q = params.get("q") || "";
    estado.categoria = params.get("categoria") || "";
    estado.torre = params.get("torre") || "";
    estado.ordem = params.get("ordem") || "nome";
  }

  function escreverUrl() {
    var params = new URLSearchParams();
    if (estado.q) params.set("q", estado.q);
    if (estado.categoria) params.set("categoria", estado.categoria);
    if (estado.torre) params.set("torre", estado.torre);
    if (estado.ordem && estado.ordem !== "nome") params.set("ordem", estado.ordem);
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

  function filtrar() {
    var padroes = normalizar(estado.q).split(/\s+/).filter(Boolean).map(padraoDoTermo);

    var lista = empresas.filter(function (empresa) {
      if (estado.categoria && empresa.categoria !== estado.categoria) return false;
      if (estado.torre && empresa.torre !== estado.torre) return false;
      return padroes.every(function (padrao) { return padrao.test(empresa._indice); });
    });

    lista.sort(function (a, b) {
      if (estado.ordem === "torre") {
        if (a.torre !== b.torre) return a.torre.localeCompare(b.torre);
        if (a.andar !== b.andar) return a.andar - b.andar;
      }
      if (estado.ordem === "categoria" && a.categoriaNome !== b.categoriaNome) {
        return a.categoriaNome.localeCompare(b.categoriaNome, "pt-BR");
      }
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

    return lista;
  }

  function escapar(texto) {
    return String(texto || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function cartao(empresa) {
    var tags = (empresa.tags || []).slice(0, 3).map(function (tag) {
      return '<span class="etiqueta">' + escapar(tag) + "</span>";
    }).join("");

    return (
      '<a class="cartao" href="' + baseUrl + "empresas/" + escapar(empresa.slug) + '/">' +
        '<div class="cartao-topo">' +
          '<span class="cartao-categoria">' + escapar(empresa.categoriaIcone) + " " + escapar(empresa.categoriaNome) + "</span>" +
          (empresa.demo ? '<span class="etiqueta etiqueta-demo">demo</span>' : "") +
        "</div>" +
        "<h3>" + escapar(empresa.nome) + "</h3>" +
        "<p>" + escapar(empresa.descricao) + "</p>" +
        (tags ? '<div class="tags">' + tags + "</div>" : "") +
        '<div class="cartao-rodape">' +
          '<span class="etiqueta etiqueta-torre">Torre ' + escapar(empresa.torre) + " · Sala " + escapar(empresa.sala) + "</span>" +
          "<span>Ver ficha →</span>" +
        "</div>" +
      "</a>"
    );
  }

  function renderizar() {
    var lista = filtrar();

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

  function sincronizarControles() {
    if (campoBusca) campoBusca.value = estado.q;
    if (campoCategoria) campoCategoria.value = estado.categoria;
    if (campoOrdem) campoOrdem.value = estado.ordem;
    chipsTorre.forEach(function (chip) {
      chip.setAttribute("aria-pressed", String(chip.getAttribute("data-torre") === estado.torre));
    });
  }

  function atualizar() {
    sincronizarControles();
    escreverUrl();
    renderizar();
  }

  if (campoBusca) {
    campoBusca.addEventListener("input", function () {
      estado.q = campoBusca.value;
      escreverUrl();
      renderizar();
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
      estado = { q: "", categoria: "", torre: "", ordem: "nome" };
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

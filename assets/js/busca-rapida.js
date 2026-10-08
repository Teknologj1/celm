/* Busca rápida: encontra qualquer empresa do complexo a partir de qualquer
 * página, sem recarregar nada.
 *
 * Abre pelo botão do cabeçalho, pela tecla "/" ou por Ctrl/Cmd+K. O índice
 * é buscado na primeira abertura e fica em cache: embuti-lo em cada página
 * somaria dezenas de kB a cada visita e cresceria junto com o cadastro. */
(function () {
  "use strict";

  var caixa = document.getElementById("busca-rapida");
  if (!caixa) return;

  var base = caixa.getAttribute("data-base") || "";
  var caminhoIndice = caixa.getAttribute("data-indice");

  var empresas = null;
  var carregando = null;
  var campo = document.getElementById("busca-rapida-campo");
  var lista = document.getElementById("busca-rapida-lista");
  var contador = document.getElementById("busca-rapida-contagem");
  var abrir = document.querySelectorAll("[data-abre-busca]");
  var fechar = document.getElementById("busca-rapida-fechar");

  var selecionado = -1;
  var resultados = [];
  var ultimoFoco = null;

  function normalizar(texto) {
    return String(texto || "")
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function indexar(lista) {
    lista.forEach(function (e) {
      e._indice = normalizar([
        e.nome, e.categoriaNome, e.responsavel, "sala " + e.sala,
        "torre " + e.torre, (e.tags || []).join(" "), (e.sinonimos || []).join(" ")
      ].join(" "));
    });
    return lista;
  }

  /* Uma requisição só, na primeira abertura; as seguintes reaproveitam. */
  function carregarIndice() {
    if (empresas) return Promise.resolve(empresas);
    if (carregando) return carregando;

    carregando = fetch(caminhoIndice, { credentials: "same-origin" })
      .then(function (resposta) {
        if (!resposta.ok) throw new Error("HTTP " + resposta.status);
        return resposta.json();
      })
      .then(function (lista) {
        empresas = indexar(lista);
        return empresas;
      })
      .catch(function (falha) {
        carregando = null;
        throw falha;
      });

    return carregando;
  }

  function padraoDoTermo(termo) {
    var escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(termo.length <= 2 ? "(^| )" + escapado + "( |$)" : "(^| )" + escapado);
  }

  function escapar(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function buscar(termo) {
    var padroes = normalizar(termo).split(/\s+/).filter(Boolean).map(padraoDoTermo);
    if (!padroes.length || !empresas) return [];

    return empresas.filter(function (e) {
      return padroes.every(function (p) { return p.test(e._indice); });
    }).slice(0, 8);
  }

  function desenhar() {
    if (!resultados.length) {
      lista.innerHTML = campo.value.trim()
        ? '<li class="busca-vazia">Nada encontrado. Tente o nome do serviço, como “dentista” ou “contador”.</li>'
        : '<li class="busca-dica">Digite o nome da empresa, o serviço, a sala ou a torre.</li>';
      contador.textContent = "";
      return;
    }

    contador.textContent = resultados.length === 1
      ? "1 resultado"
      : resultados.length + " resultados";

    lista.innerHTML = resultados.map(function (e, i) {
      return '<li role="option" id="resultado-' + i + '" aria-selected="' + (i === selecionado) + '">' +
        '<a href="' + base + "empresas/" + escapar(e.slug) + '/"' +
          (i === selecionado ? ' class="ativo"' : '') + '>' +
          '<span class="busca-icone" aria-hidden="true">' + escapar(e.categoriaIcone) + "</span>" +
          "<span class='busca-texto'><strong>" + escapar(e.nome) + "</strong>" +
          "<small>" + escapar(e.categoriaNome) + " · Torre " + escapar(e.torre) +
          " · Sala " + escapar(e.sala) + "</small></span>" +
        "</a></li>";
    }).join("");
  }

  function mover(passo) {
    if (!resultados.length) return;
    selecionado = (selecionado + passo + resultados.length) % resultados.length;
    desenhar();
    var ativo = lista.querySelector(".ativo");
    if (ativo) ativo.scrollIntoView({ block: "nearest" });
    campo.setAttribute("aria-activedescendant", "resultado-" + selecionado);
  }

  function abrirBusca() {
    ultimoFoco = document.activeElement;
    caixa.hidden = false;
    document.body.classList.add("sem-rolagem");
    campo.value = "";
    resultados = [];
    selecionado = -1;
    desenhar();
    campo.focus();

    carregarIndice().catch(function (falha) {
      console.error("Falha ao carregar o índice de busca:", falha);
      lista.innerHTML = '<li class="busca-vazia">Não foi possível carregar a busca agora. ' +
        'Use o <a href="' + base + 'empresas/">diretório completo</a>.</li>';
    });
  }

  function fecharBusca() {
    caixa.hidden = true;
    document.body.classList.remove("sem-rolagem");
    campo.removeAttribute("aria-activedescendant");
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  Array.prototype.forEach.call(abrir, function (gatilho) {
    gatilho.addEventListener("click", function (evento) {
      evento.preventDefault();
      abrirBusca();
    });
  });

  if (fechar) fechar.addEventListener("click", fecharBusca);

  caixa.addEventListener("click", function (evento) {
    if (evento.target === caixa) fecharBusca();
  });

  campo.addEventListener("input", function () {
    if (!empresas) {
      /* ainda chegando: mostra o aviso e refaz a busca quando o índice vier */
      lista.innerHTML = '<li class="busca-dica">Carregando o cadastro...</li>';
      carregarIndice().then(function () {
        resultados = buscar(campo.value);
        selecionado = resultados.length ? 0 : -1;
        desenhar();
      }).catch(function () {});
      return;
    }
    resultados = buscar(campo.value);
    selecionado = resultados.length ? 0 : -1;
    desenhar();
  });

  campo.addEventListener("keydown", function (evento) {
    if (evento.key === "ArrowDown") { evento.preventDefault(); mover(1); }
    else if (evento.key === "ArrowUp") { evento.preventDefault(); mover(-1); }
    else if (evento.key === "Enter") {
      var ativo = lista.querySelector(".ativo");
      if (ativo) { evento.preventDefault(); window.location.href = ativo.getAttribute("href"); }
    }
  });

  document.addEventListener("keydown", function (evento) {
    var digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);

    if (evento.key === "Escape" && !caixa.hidden) {
      fecharBusca();
      return;
    }
    if ((evento.key === "k" || evento.key === "K") && (evento.metaKey || evento.ctrlKey)) {
      evento.preventDefault();
      caixa.hidden ? abrirBusca() : fecharBusca();
      return;
    }
    /* "/" é atalho consagrado de busca — mas só quando não se está digitando. */
    if (evento.key === "/" && !digitando && caixa.hidden) {
      evento.preventDefault();
      abrirBusca();
    }
  });
})();

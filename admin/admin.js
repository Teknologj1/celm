/* Painel da administração: login, listagem, inclusão, edição e remoção.
 *
 * O HTML do painel é público — o que protege os dados é a API, que exige
 * sessão em toda rota. Aqui apenas evitamos mostrar a tela a quem não está
 * autenticado. */
(function () {
  "use strict";

  var ehLogin = document.body.classList.contains("tela-login");

  function api(caminho, opcoes) {
    return fetch("/api/" + caminho, Object.assign({
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" }
    }, opcoes)).then(function (resposta) {
      return resposta.json()
        .catch(function () { return {}; })
        .then(function (corpo) {
          if (!resposta.ok) {
            var falha = new Error(corpo.erro || "Falha na comunicação com o servidor.");
            falha.status = resposta.status;
            falha.problemas = corpo.problemas;
            throw falha;
          }
          return corpo;
        });
    });
  }

  function escapar(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ---------------- tela de login ---------------- */
  if (ehLogin) {
    var formLogin = document.getElementById("form-login");
    var aviso = document.getElementById("aviso");

    formLogin.addEventListener("submit", function (evento) {
      evento.preventDefault();
      if (!formLogin.reportValidity()) return;

      var botao = formLogin.querySelector("button[type=submit]");
      botao.disabled = true;
      botao.textContent = "Entrando...";
      aviso.hidden = true;

      api("login", {
        method: "POST",
        body: JSON.stringify({
          usuario: document.getElementById("usuario").value,
          senha: document.getElementById("senha").value
        })
      }).then(function () {
        window.location.href = "/admin/";
      }).catch(function (falha) {
        aviso.textContent = falha.message;
        aviso.hidden = false;
        botao.disabled = false;
        botao.textContent = "Entrar";
        document.getElementById("senha").value = "";
        document.getElementById("senha").focus();
      });
    });
    return;
  }

  /* ---------------- painel ---------------- */
  var estado = { empresas: [], categorias: [], torres: [], anuncios: null };

  var corpo = document.body;
  var linhas = document.getElementById("linhas");
  var tabela = document.getElementById("tabela");
  var textoEstado = document.getElementById("estado");
  var resumo = document.getElementById("resumo");
  var modal = document.getElementById("modal");
  var form = document.getElementById("form-empresa");
  var problemas = document.getElementById("problemas");
  var salvando = document.getElementById("salvando");
  var busca = document.getElementById("busca");
  var filtroTorre = document.getElementById("filtro-torre");
  var filtroCategoria = document.getElementById("filtro-categoria");

  function normalizar(texto) {
    return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function filtradas() {
    var termo = normalizar(busca.value);
    return estado.empresas.filter(function (e) {
      if (filtroTorre.value && e.torre !== filtroTorre.value) return false;
      if (filtroCategoria.value && e.categoria !== filtroCategoria.value) return false;
      if (!termo) return true;
      return normalizar([e.nome, e.sala, e.responsavel, e.descricao].join(" ")).indexOf(termo) !== -1;
    });
  }

  function nomeCategoria(slug) {
    var achada = estado.categorias.find(function (c) { return c.slug === slug; });
    return achada ? achada.nome : slug;
  }

  function desenhar() {
    var lista = filtradas();

    resumo.textContent = estado.empresas.length + " empresas cadastradas" +
      (lista.length !== estado.empresas.length ? " · " + lista.length + " no filtro atual" : "");

    if (!lista.length) {
      tabela.hidden = true;
      textoEstado.hidden = false;
      textoEstado.textContent = estado.empresas.length
        ? "Nenhuma empresa corresponde ao filtro."
        : "Nenhuma empresa cadastrada ainda. Use “Incluir empresa” para começar.";
      return;
    }

    textoEstado.hidden = true;
    tabela.hidden = false;

    linhas.innerHTML = lista.map(function (e) {
      var contato = e.telefone || e.email || e.whatsapp || "—";
      return "<tr>" +
        "<td><span class='nome-empresa'>" + escapar(e.nome) + "</span>" +
          "<span class='sub'>" + escapar(e.slug) + (e.logo ? " · com logotipo" : "") +
          (e.demo ? " · demo" : "") + "</span></td>" +
        "<td>" + escapar(nomeCategoria(e.categoria)) + "</td>" +
        "<td>Torre " + escapar(e.torre) + "<span class='sub'>Sala " + escapar(e.sala) + "</span></td>" +
        "<td>" + escapar(contato) + "</td>" +
        "<td><div class='acoes-linha'>" +
          "<button class='btn btn-secundario btn-sm' data-editar='" + escapar(e.slug) + "'>Editar</button>" +
          "<button class='btn btn-secundario btn-sm btn-perigo' data-remover='" + escapar(e.slug) + "'>Remover</button>" +
        "</div></td>" +
      "</tr>";
    }).join("");
  }

  function preencherOpcoes() {
    var opcoesCat = estado.categorias.map(function (c) {
      return "<option value='" + escapar(c.slug) + "'>" + escapar(c.nome) + "</option>";
    }).join("");
    var opcoesTorre = estado.torres.map(function (t) {
      return "<option value='" + escapar(t.id) + "'>" + escapar(t.nome) + "</option>";
    }).join("");

    document.getElementById("categoria").innerHTML = "<option value=''>Selecione</option>" + opcoesCat;
    document.getElementById("torre").innerHTML = "<option value=''>Selecione</option>" + opcoesTorre;
    filtroCategoria.innerHTML = "<option value=''>Todas</option>" + opcoesCat;
    filtroTorre.innerHTML = "<option value=''>Todas</option>" + opcoesTorre;
  }

  function abrirModal(empresa) {
    problemas.hidden = true;
    form.reset();
    document.getElementById("slugAtual").value = empresa ? empresa.slug : "";
    document.getElementById("modal-titulo").textContent = empresa
      ? "Editar " + empresa.nome
      : "Incluir empresa";

    if (empresa) {
      ["nome", "categoria", "torre", "andar", "sala", "descricao", "responsavel",
       "telefone", "whatsapp", "email", "site", "instagram", "horario",
       "beneficio", "logo"].forEach(function (campo) {
        var elemento = document.getElementById(campo);
        if (elemento) elemento.value = empresa[campo] == null ? "" : empresa[campo];
      });
      document.getElementById("tags").value = (empresa.tags || []).join(", ");
      document.getElementById("destaque").checked = empresa.destaque === true;
      document.getElementById("demo").checked = empresa.demo === true;
    }

    modal.hidden = false;
    document.getElementById("nome").focus();
  }

  function fecharModal() {
    modal.hidden = true;
  }

  function coletar() {
    return {
      slugAtual: document.getElementById("slugAtual").value || null,
      nome: document.getElementById("nome").value,
      categoria: document.getElementById("categoria").value,
      torre: document.getElementById("torre").value,
      andar: document.getElementById("andar").value,
      sala: document.getElementById("sala").value,
      descricao: document.getElementById("descricao").value,
      responsavel: document.getElementById("responsavel").value,
      telefone: document.getElementById("telefone").value,
      whatsapp: document.getElementById("whatsapp").value,
      email: document.getElementById("email").value,
      site: document.getElementById("site").value,
      instagram: document.getElementById("instagram").value,
      horario: document.getElementById("horario").value,
      tags: document.getElementById("tags").value,
      beneficio: document.getElementById("beneficio").value,
      logo: document.getElementById("logo").value,
      destaque: document.getElementById("destaque").checked,
      demo: document.getElementById("demo").checked
    };
  }

  function mostrarProblemasEm(destino) {
    return function (falha) {
      if (falha.problemas && falha.problemas.length) {
        destino.innerHTML = "<strong>Corrija antes de salvar:</strong><ul>" +
          falha.problemas.map(function (p) { return "<li>" + escapar(p) + "</li>"; }).join("") +
          "</ul>";
      } else {
        destino.textContent = falha.message;
      }
      destino.hidden = false;
    };
  }
  var mostrarProblemas = mostrarProblemasEm(problemas);

  function carregar() {
    return api("empresas").then(function (dados) {
      estado.empresas = dados.empresas || [];
      estado.categorias = dados.categorias || [];
      estado.torres = dados.torres || [];
      preencherOpcoes();
      desenhar();
    });
  }

  /* ---------------- eventos ---------------- */
  document.getElementById("nova").addEventListener("click", function () { abrirModal(null); });
  document.getElementById("fechar").addEventListener("click", fecharModal);
  document.getElementById("cancelar").addEventListener("click", fecharModal);

  modal.addEventListener("click", function (evento) {
    if (evento.target === modal) fecharModal();
  });
  document.addEventListener("keydown", function (evento) {
    if (evento.key !== "Escape") return;
    if (!modal.hidden) fecharModal();
    if (modalSenha && !modalSenha.hidden) fecharSenha();
    if (modalAnuncio && !modalAnuncio.hidden) fecharAnuncio();
  });

  [busca, filtroTorre, filtroCategoria].forEach(function (controle) {
    controle.addEventListener("input", desenhar);
    controle.addEventListener("change", desenhar);
  });

  linhas.addEventListener("click", function (evento) {
    var editar = evento.target.getAttribute("data-editar");
    var remover = evento.target.getAttribute("data-remover");

    if (editar) {
      var empresa = estado.empresas.find(function (e) { return e.slug === editar; });
      if (empresa) abrirModal(empresa);
      return;
    }

    if (remover) {
      var alvo = estado.empresas.find(function (e) { return e.slug === remover; });
      if (!alvo) return;
      if (!window.confirm("Remover “" + alvo.nome + "” do guia?\n\nA página da empresa sai do ar na próxima publicação. O histórico fica guardado e dá para reverter.")) return;

      evento.target.disabled = true;
      evento.target.textContent = "Removendo...";
      api("empresas?slug=" + encodeURIComponent(remover), { method: "DELETE" })
        .then(carregar)
        .catch(function (falha) {
          window.alert("Não foi possível remover: " + falha.message);
          evento.target.disabled = false;
          evento.target.textContent = "Remover";
        });
    }
  });

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    if (!form.reportValidity()) return;

    problemas.hidden = true;
    var botao = document.getElementById("salvar");
    botao.disabled = true;
    salvando.hidden = false;

    api("empresas", { method: "POST", body: JSON.stringify(coletar()) })
      .then(function () {
        fecharModal();
        return carregar();
      })
      .catch(mostrarProblemas)
      .then(function () {
        botao.disabled = false;
        salvando.hidden = true;
      });
  });


  /* ---------------- abas e espaços publicitários ---------------- */
  var abas = document.querySelectorAll(".aba");
  var secoes = {
    empresas: document.getElementById("painel-empresas"),
    anuncios: document.getElementById("painel-anuncios")
  };

  function mostrarAba(nome) {
    Object.keys(secoes).forEach(function (chave) {
      secoes[chave].hidden = chave !== nome;
    });
    Array.prototype.forEach.call(abas, function (aba) {
      var ativa = aba.getAttribute("data-aba") === nome;
      if (ativa) aba.setAttribute("aria-current", "page");
      else aba.removeAttribute("aria-current");
    });
    if (nome === "anuncios" && !estado.anuncios) carregarAnuncios();
  }

  Array.prototype.forEach.call(abas, function (aba) {
    aba.addEventListener("click", function () {
      mostrarAba(aba.getAttribute("data-aba"));
    });
  });

  var listaAnuncios = document.getElementById("lista-anuncios");
  var estadoAnuncios = document.getElementById("estado-anuncios");
  var resumoAnuncios = document.getElementById("resumo-anuncios");
  var modalAnuncio = document.getElementById("modal-anuncio");
  var formAnuncio = document.getElementById("form-anuncio");
  var problemasAnuncio = document.getElementById("problemas-anuncio");
  var salvandoAnuncio = document.getElementById("salvando-anuncio");

  var NOMES_ESPACO = {
    home: "Página inicial",
    diretorio: "Diretório de empresas",
    empresa: "Fichas de empresa",
    torre: "Páginas de torre e categoria"
  };

  function hoje() {
    return new Date().toISOString().slice(0, 10);
  }

  /* Situação real do espaço: no ar, agendado, encerrado ou livre. */
  function situacao(a) {
    if (!a.ativo) return { classe: "livre", rotulo: "livre" };
    if (a.inicio && hoje() < a.inicio) return { classe: "agendado", rotulo: "agendado" };
    if (a.fim && hoje() > a.fim) return { classe: "encerrado", rotulo: "encerrado" };
    return { classe: "no-ar", rotulo: "no ar" };
  }

  function periodoLegivel(a) {
    var br = function (d) { return d ? d.split("-").reverse().join("/") : ""; };
    if (a.inicio && a.fim) return "De " + br(a.inicio) + " a " + br(a.fim);
    if (a.inicio) return "A partir de " + br(a.inicio);
    if (a.fim) return "Até " + br(a.fim);
    return "Sem data definida";
  }

  function desenharAnuncios() {
    var lista = estado.anuncios || [];
    var noAr = lista.filter(function (a) { return situacao(a).classe === "no-ar"; }).length;

    resumoAnuncios.textContent = lista.length + " espaços · " +
      (noAr ? noAr + " no ar" : "nenhum no ar no momento");
    estadoAnuncios.hidden = true;

    listaAnuncios.innerHTML = lista.map(function (a) {
      var s = situacao(a);
      return "<div class='espaco'>" +
        "<div class='espaco-topo'>" +
          "<div><h3>" + escapar(NOMES_ESPACO[a.espaco] || a.espaco) + "</h3>" +
          "<p class='formato'>" + escapar(a.formato || "") + "</p></div>" +
          "<span class='selo selo-" + s.classe + "'>" + s.rotulo + "</span>" +
        "</div>" +
        (a.titulo
          ? "<div class='campanha'><b>" + escapar(a.titulo) + "</b>" +
            (a.texto ? "<p>" + escapar(a.texto) + "</p>" : "") +
            (a.anunciante ? "<p>" + escapar(a.anunciante) + "</p>" : "") + "</div>"
          : "<div class='campanha'><p>Nenhuma campanha preenchida. O site exibe o convite para anunciar.</p></div>") +
        "<span class='periodo'>" + escapar(periodoLegivel(a)) + "</span>" +
        "<div class='espaco-rodape'>" +
          "<button class='btn btn-secundario btn-sm' data-editar-anuncio='" + escapar(a.id) + "'>" +
            (a.titulo ? "Editar campanha" : "Preencher campanha") + "</button>" +
          (a.titulo
            ? "<button class='btn btn-secundario btn-sm' data-alternar='" + escapar(a.id) + "'>" +
              (a.ativo ? "Tirar do ar" : "Colocar no ar") + "</button>"
            : "") +
        "</div>" +
      "</div>";
    }).join("");
  }

  function carregarAnuncios() {
    return api("anuncios").then(function (dados) {
      estado.anuncios = dados.anuncios || [];
      desenharAnuncios();
    }).catch(function (falha) {
      estadoAnuncios.hidden = false;
      estadoAnuncios.textContent = "Não foi possível carregar: " + falha.message;
    });
  }

  function acharAnuncio(id) {
    return (estado.anuncios || []).find(function (a) { return a.id === id; });
  }

  function abrirAnuncio(a) {
    problemasAnuncio.hidden = true;
    document.getElementById("a-id").value = a.id;
    document.getElementById("a-formato").textContent = a.formato || "";
    document.getElementById("titulo-anuncio").textContent =
      (NOMES_ESPACO[a.espaco] || a.espaco);
    document.getElementById("a-ativo").checked = a.ativo === true;
    ["titulo", "texto", "anunciante", "link", "imagem", "inicio", "fim"].forEach(function (campo) {
      document.getElementById("a-" + campo).value = a[campo] || "";
    });
    modalAnuncio.hidden = false;
    document.getElementById("a-titulo").focus();
  }

  function fecharAnuncio() { modalAnuncio.hidden = true; }

  document.getElementById("fechar-anuncio").addEventListener("click", fecharAnuncio);
  document.getElementById("cancelar-anuncio").addEventListener("click", fecharAnuncio);
  modalAnuncio.addEventListener("click", function (e) {
    if (e.target === modalAnuncio) fecharAnuncio();
  });

  listaAnuncios.addEventListener("click", function (evento) {
    var editar = evento.target.getAttribute("data-editar-anuncio");
    var alternar = evento.target.getAttribute("data-alternar");

    if (editar) {
      var a = acharAnuncio(editar);
      if (a) abrirAnuncio(a);
      return;
    }
    if (alternar) {
      var alvo = acharAnuncio(alternar);
      if (!alvo) return;
      evento.target.disabled = true;
      evento.target.textContent = "Aguarde...";
      api("anuncios", {
        method: "POST",
        body: JSON.stringify(Object.assign({}, alvo, { ativo: !alvo.ativo }))
      }).then(carregarAnuncios).catch(function (falha) {
        window.alert("Não foi possível alterar: " + falha.message);
        desenharAnuncios();
      });
    }
  });

  formAnuncio.addEventListener("submit", function (evento) {
    evento.preventDefault();
    problemasAnuncio.hidden = true;

    var botao = document.getElementById("salvar-anuncio");
    botao.disabled = true;
    salvandoAnuncio.hidden = false;

    var corpo = { id: document.getElementById("a-id").value, ativo: document.getElementById("a-ativo").checked };
    ["titulo", "texto", "anunciante", "link", "imagem", "inicio", "fim"].forEach(function (campo) {
      corpo[campo] = document.getElementById("a-" + campo).value;
    });

    api("anuncios", { method: "POST", body: JSON.stringify(corpo) })
      .then(function () { fecharAnuncio(); return carregarAnuncios(); })
      .catch(mostrarProblemasEm(problemasAnuncio))
      .then(function () {
        botao.disabled = false;
        salvandoAnuncio.hidden = true;
      });
  });

  /* ---------------- troca da própria senha ---------------- */
  var modalSenha = document.getElementById("modal-senha");
  var formSenha = document.getElementById("form-senha");
  var avisoSenha = document.getElementById("aviso-senha");
  var okSenha = document.getElementById("ok-senha");

  function fecharSenha() {
    modalSenha.hidden = true;
    formSenha.reset();
    avisoSenha.hidden = true;
    okSenha.hidden = true;
    ["senha-atual", "senha-nova", "senha-nova2"].forEach(function (id) {
      document.getElementById(id).type = "password";
    });
  }

  document.getElementById("trocar-senha").addEventListener("click", function () {
    avisoSenha.hidden = true;
    okSenha.hidden = true;
    modalSenha.hidden = false;
    document.getElementById("senha-atual").focus();
  });

  document.getElementById("fechar-senha").addEventListener("click", fecharSenha);
  document.getElementById("cancelar-senha").addEventListener("click", fecharSenha);
  modalSenha.addEventListener("click", function (evento) {
    if (evento.target === modalSenha) fecharSenha();
  });

  document.getElementById("mostrar-senhas").addEventListener("change", function (evento) {
    var tipo = evento.target.checked ? "text" : "password";
    ["senha-atual", "senha-nova", "senha-nova2"].forEach(function (id) {
      document.getElementById(id).type = tipo;
    });
  });

  formSenha.addEventListener("submit", function (evento) {
    evento.preventDefault();
    if (!formSenha.reportValidity()) return;

    avisoSenha.hidden = true;
    okSenha.hidden = true;

    var atual = document.getElementById("senha-atual").value;
    var nova = document.getElementById("senha-nova").value;
    var repetida = document.getElementById("senha-nova2").value;

    if (nova !== repetida) {
      avisoSenha.textContent = "As senhas novas não conferem.";
      avisoSenha.hidden = false;
      return;
    }

    var botao = document.getElementById("salvar-senha");
    botao.disabled = true;
    botao.textContent = "Trocando...";

    api("senha", {
      method: "POST",
      body: JSON.stringify({ senhaAtual: atual, senhaNova: nova })
    }).then(function (resposta) {
      formSenha.reset();
      okSenha.textContent = "Senha trocada. " + (resposta.aviso || "");
      okSenha.hidden = false;
    }).catch(function (falha) {
      avisoSenha.textContent = falha.message;
      avisoSenha.hidden = false;
    }).then(function () {
      botao.disabled = false;
      botao.textContent = "Trocar senha";
    });
  });

  document.getElementById("sair").addEventListener("click", function () {
    api("logout", { method: "POST" }).then(function () {
      window.location.href = "/admin/login";
    });
  });

  /* Só mostra o painel depois de confirmar a sessão no servidor. */
  api("sessao").then(function (sessao) {
    document.getElementById("quem").textContent = sessao.nome;

    if (sessao.podeAnunciar) {
      document.querySelector('[data-aba="anuncios"]').hidden = false;
    }
    corpo.hidden = false;
    return carregar();
  }).catch(function (falha) {
    if (falha.status === 401) {
      window.location.replace("/admin/login");
      return;
    }
    corpo.hidden = false;
    textoEstado.textContent = "Não foi possível carregar o cadastro: " + falha.message;
  });
})();

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
        window.location.href = "./";
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
  var estado = { empresas: [], categorias: [], torres: [] };

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

  function mostrarProblemas(falha) {
    if (falha.problemas && falha.problemas.length) {
      problemas.innerHTML = "<strong>Corrija antes de salvar:</strong><ul>" +
        falha.problemas.map(function (p) { return "<li>" + escapar(p) + "</li>"; }).join("") +
        "</ul>";
    } else {
      problemas.textContent = falha.message;
    }
    problemas.hidden = false;
  }

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
    if (evento.key === "Escape" && !modal.hidden) fecharModal();
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

  document.getElementById("sair").addEventListener("click", function () {
    api("logout", { method: "POST" }).then(function () {
      window.location.href = "login.html";
    });
  });

  /* Só mostra o painel depois de confirmar a sessão no servidor. */
  api("sessao").then(function (sessao) {
    document.getElementById("quem").textContent = sessao.nome;
    corpo.hidden = false;
    return carregar();
  }).catch(function (falha) {
    if (falha.status === 401) {
      window.location.replace("login.html");
      return;
    }
    corpo.hidden = false;
    textoEstado.textContent = "Não foi possível carregar o cadastro: " + falha.message;
  });
})();

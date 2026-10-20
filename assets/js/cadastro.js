/* Formulário de cadastro de empresa.
 *
 * O envio vai para /api/cadastro, que manda o e-mail para a administração.
 * Se a API disser que o envio por e-mail não está configurado — ou se ela
 * falhar —, o formulário volta ao caminho antigo: abrir o programa de
 * e-mail do visitante com tudo preenchido. Assim ninguém fica sem
 * conseguir se cadastrar por causa de uma chave que faltou. */
(function () {
  "use strict";

  var form = document.getElementById("form-cadastro");
  if (!form) return;

  var aviso = document.getElementById("cadastro-aviso");
  var destino = form.getAttribute("data-destino") || "";
  var botao = form.querySelector('button[type="submit"]');
  var abertoEm = Date.now();

  function coletar() {
    var dados = {};
    Array.prototype.forEach.call(form.elements, function (campo) {
      if (!campo.name || !campo.value.trim()) return;
      dados[campo.name] = campo.value.trim();
    });
    return dados;
  }

  function corpoEmail(dados) {
    var linhas = Object.keys(dados)
      .filter(function (c) { return c !== "ref-interna"; })
      .map(function (chave) { return chave + ": " + dados[chave]; });

    return (
      "Solicitação de cadastro no guia de empresas do centro empresarial.\n\n" +
      linhas.join("\n") +
      "\n\n--\nEnviado pelo formulário do site."
    );
  }

  function dizer(texto, cor) {
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.style.color = cor || "var(--muted)";
  }

  /* Caminho de reserva: o próprio programa de e-mail de quem preencheu. */
  function abrirPrograma(dados) {
    var assunto = "Cadastro no guia: " + (dados.Empresa || "nova empresa");
    window.location.href =
      "mailto:" + encodeURIComponent(destino) +
      "?subject=" + encodeURIComponent(assunto) +
      "&body=" + encodeURIComponent(corpoEmail(dados));

    dizer(
      "Abrimos seu programa de e-mail com os dados preenchidos — confira e " +
      "envie. Se nada abrir, mande as informações para " + destino + ".",
      "var(--ink)"
    );
  }

  function enviar(evento) {
    evento.preventDefault();
    if (!form.reportValidity()) return;

    var dados = coletar();
    var corpo = {};
    Object.keys(dados).forEach(function (c) { corpo[c] = dados[c]; });
    corpo.levou = Date.now() - abertoEm;

    botao.disabled = true;
    dizer("Enviando...");

    fetch("/api/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo)
    })
      .then(function (resposta) {
        return resposta.json().catch(function () { return {}; })
          .then(function (dadosResposta) {
            return { ok: resposta.ok, status: resposta.status, corpo: dadosResposta };
          });
      })
      .then(function (r) {
        if (r.ok && r.corpo.enviado) {
          form.reset();
          dizer(
            "Cadastro enviado para a administração do guia. A conferência " +
            "costuma levar alguns dias; a resposta vai para o e-mail que " +
            "você informou.",
            "var(--ink)"
          );
          return;
        }

        if (r.corpo.codigo === "sem-email") return abrirPrograma(dados);

        if (r.corpo.problemas && r.corpo.problemas.length) {
          dizer("Corrija antes de enviar: " + r.corpo.problemas.join(" "), "var(--erro, #b3261e)");
          return;
        }

        dizer(r.corpo.erro || "Não foi possível enviar agora.", "var(--erro, #b3261e)");
      })
      .catch(function () {
        /* Sem rede ou sem API (o site também roda estático): cai no
           programa de e-mail em vez de deixar o visitante no vazio. */
        abrirPrograma(dados);
      })
      .then(function () {
        botao.disabled = false;
      });
  }

  form.addEventListener("submit", enviar);
})();

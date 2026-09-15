/* Formulário de cadastro de empresa.
 *
 * Sem backend, o envio é feito abrindo um e-mail já preenchido para a
 * administração do guia. Quando existir uma API, troque o corpo de
 * `enviar()` por um fetch POST para o endpoint de cadastro — os campos
 * já saem prontos em `coletar()`. */
(function () {
  "use strict";

  var form = document.getElementById("form-cadastro");
  if (!form) return;

  var aviso = document.getElementById("cadastro-aviso");
  var destino = form.getAttribute("data-destino") || "";

  function coletar() {
    var dados = {};
    Array.prototype.forEach.call(form.elements, function (campo) {
      if (!campo.name || !campo.value.trim()) return;
      dados[campo.name] = campo.value.trim();
    });
    return dados;
  }

  function corpoEmail(dados) {
    var linhas = Object.keys(dados).map(function (chave) {
      return chave + ": " + dados[chave];
    });
    return (
      "Solicitação de cadastro no guia de empresas do centro empresarial.\n\n" +
      linhas.join("\n") +
      "\n\n--\nEnviado pelo formulário do site."
    );
  }

  function enviar(evento) {
    evento.preventDefault();

    if (!form.reportValidity()) return;

    var dados = coletar();
    var assunto = "Cadastro no guia: " + (dados.Empresa || "nova empresa");
    var href =
      "mailto:" + encodeURIComponent(destino) +
      "?subject=" + encodeURIComponent(assunto) +
      "&body=" + encodeURIComponent(corpoEmail(dados));

    window.location.href = href;

    if (aviso) {
      aviso.textContent =
        "Abrimos seu programa de e-mail com os dados preenchidos. " +
        "Se nada abrir, envie as informações manualmente para " + destino + ".";
      aviso.style.color = "var(--ink)";
    }
  }

  form.addEventListener("submit", enviar);
})();

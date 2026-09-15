/* Comportamentos comuns a todas as páginas. */
(function () {
  "use strict";

  var botao = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav-principal");

  if (botao && nav) {
    botao.addEventListener("click", function () {
      var aberto = nav.classList.toggle("aberto");
      botao.setAttribute("aria-expanded", String(aberto));
    });
  }

  /* Busca do topo da home: encaminha para o diretório já filtrado. */
  var formBusca = document.querySelector("[data-busca-redireciona]");
  if (formBusca) {
    formBusca.addEventListener("submit", function (evento) {
      evento.preventDefault();
      var termo = formBusca.querySelector("input[name='q']").value.trim();
      var destino = formBusca.getAttribute("data-busca-redireciona");
      window.location.href = termo ? destino + "?q=" + encodeURIComponent(termo) : destino;
    });
  }
})();

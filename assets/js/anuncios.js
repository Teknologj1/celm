/* Rodízio dos espaços publicitários.
 *
 * Um espaço pode ter várias campanhas em cartaz. Todas já estão no HTML; o
 * que este script faz é escolher qual aparece e trocar por tempo.
 *
 * Três decisões que não são óbvias:
 *
 * 1. O início é sorteado. Se todo mundo começasse pela primeira campanha,
 *    quem fosse cadastrado primeiro levaria quase toda a audiência — quem
 *    abre a página e sai em dez segundos só veria aquele. Sorteando, as
 *    campanhas do mesmo espaço se aproximam da mesma exposição.
 * 2. O relógio para quando o anúncio não está visível. Girar campanha em
 *    espaço fora da tela gasta exibição que ninguém viu e, no celular,
 *    bateria.
 * 3. Passar o mouse ou focar com o teclado congela a troca: trocar o
 *    anúncio debaixo do cursor de quem ia clicar é o melhor jeito de o
 *    clique cair no anunciante errado.
 */
(function () {
  "use strict";

  var espacos = document.querySelectorAll("[data-rodizio]");
  if (!espacos.length) return;

  var semMovimento = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  Array.prototype.forEach.call(espacos, function (espaco) {
    var slides = espaco.querySelectorAll(".anuncio-slide");
    var marcadores = espaco.querySelectorAll(".anuncio-marcadores button");
    if (slides.length < 2) return;

    var contador = espaco.querySelector("[data-contador-atual]");
    var intervalo = (Number(espaco.getAttribute("data-intervalo")) || 8) * 1000;
    var atual = Math.floor(Math.random() * slides.length);
    var relogio = null;
    var visivel = true;
    var parado = false;

    function mostrar(indice) {
      atual = (indice + slides.length) % slides.length;

      Array.prototype.forEach.call(slides, function (slide, i) {
        var ativo = i === atual;
        slide.classList.toggle("ativo", ativo);
        if (ativo) slide.removeAttribute("aria-hidden");
        else slide.setAttribute("aria-hidden", "true");
      });

      Array.prototype.forEach.call(marcadores, function (botao, i) {
        botao.setAttribute("aria-selected", i === atual ? "true" : "false");
      });

      if (contador) contador.textContent = String(atual + 1);
    }

    function tocar() {
      if (relogio || semMovimento || parado || !visivel) return;
      relogio = window.setInterval(function () { mostrar(atual + 1); }, intervalo);
    }

    function pausar() {
      if (!relogio) return;
      window.clearInterval(relogio);
      relogio = null;
    }

    /* Quem clica num marcador quer ver aquele anúncio; o relógio recomeça
       do zero para que ele não troque meio segundo depois. */
    Array.prototype.forEach.call(marcadores, function (botao, i) {
      botao.addEventListener("click", function () {
        pausar();
        mostrar(i);
        tocar();
      });
    });

    espaco.addEventListener("mouseenter", function () { parado = true; pausar(); });
    espaco.addEventListener("mouseleave", function () { parado = false; tocar(); });
    espaco.addEventListener("focusin", function () { parado = true; pausar(); });
    espaco.addEventListener("focusout", function () { parado = false; tocar(); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entradas) {
        visivel = entradas[0].isIntersecting;
        if (visivel) tocar();
        else pausar();
      }, { threshold: 0.25 }).observe(espaco);
    }

    mostrar(atual);
    tocar();
  });

  /* Aba em segundo plano não conta exibição. */
  document.addEventListener("visibilitychange", function () {
    var evento = document.hidden ? "mouseenter" : "mouseleave";
    Array.prototype.forEach.call(espacos, function (espaco) {
      espaco.dispatchEvent(new Event(evento));
    });
  });
})();

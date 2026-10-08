/* Comportamentos comuns a todas as páginas: menu, movimento e busca rápida. */
(function () {
  "use strict";

  var menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- menu ---------- */
  var botao = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav-principal");

  if (botao && nav) {
    botao.addEventListener("click", function () {
      var aberto = nav.classList.toggle("aberto");
      botao.setAttribute("aria-expanded", String(aberto));
    });
  }

  /* ---------- busca da home que leva ao diretório ---------- */
  var formBusca = document.querySelector("[data-busca-redireciona]");
  if (formBusca) {
    formBusca.addEventListener("submit", function (evento) {
      evento.preventDefault();
      var termo = formBusca.querySelector("input[name='q']").value.trim();
      var destino = formBusca.getAttribute("data-busca-redireciona");
      window.location.href = termo ? destino + "?q=" + encodeURIComponent(termo) : destino;
    });
  }

  /* ---------- revelação ao rolar ----------
     Sem IntersectionObserver (ou com menos movimento pedido), tudo já entra
     visível — a animação é enfeite, nunca condição para ler a página. */
  var alvos = document.querySelectorAll(".revelar, .revelar-fila");

  if (menosMovimento || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(alvos, function (alvo) { alvo.classList.add("visivel"); });
  } else if (alvos.length) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("visivel");
        observador.unobserve(entrada.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    Array.prototype.forEach.call(alvos, function (alvo) { observador.observe(alvo); });
  }

  /* ---------- números que contam ---------- */
  var numeros = document.querySelectorAll("[data-contar]");

  function contar(elemento) {
    var destino = Number(elemento.getAttribute("data-contar"));
    if (!Number.isFinite(destino)) return;

    if (menosMovimento) {
      elemento.textContent = String(destino);
      return;
    }

    var duracao = 900;
    var inicio = performance.now();

    function passo(agora) {
      var progresso = Math.min((agora - inicio) / duracao, 1);
      /* desacelera no fim, como algo que chega e assenta */
      var suave = 1 - Math.pow(1 - progresso, 3);
      elemento.textContent = String(Math.round(destino * suave));
      if (progresso < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  if (numeros.length) {
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(numeros, contar);
    } else {
      var observadorNumeros = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          contar(entrada.target);
          observadorNumeros.unobserve(entrada.target);
        });
      }, { threshold: 0.5 });
      Array.prototype.forEach.call(numeros, function (n) { observadorNumeros.observe(n); });
    }
  }

  /* ---------- cabeçalho que reage à rolagem ---------- */
  var topo = document.querySelector(".topo");
  if (topo) {
    var agendado = false;

    window.addEventListener("scroll", function () {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        topo.classList.toggle("rolado", y > 12);
        agendado = false;
      });
    }, { passive: true });
  }
})();

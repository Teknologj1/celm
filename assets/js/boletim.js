/* Leitor do boletim informativo.
 *
 * Desenha as páginas do PDF na própria página, em canvas. É mais trabalho
 * do que jogar o arquivo num <iframe>, mas é o que funciona no celular: o
 * Chrome do Android oferece baixar em vez de exibir, e o Safari do iPhone
 * mostra só a primeira página sem rolagem. Desenhando, o comportamento é o
 * mesmo em todo lugar e ninguém precisa instalar nada.
 *
 * O motor (pdf.js, ~1,7 MB com o worker) só é buscado quando a seção se
 * aproxima da tela — quem nunca rola até lá não paga por ele. */
(function () {
  "use strict";

  var leitor = document.getElementById("boletim-leitor");
  if (!leitor || !("IntersectionObserver" in window)) return;

  var pdfjs = null;      /* módulo carregado uma única vez */
  var carregando = null; /* promessa em andamento */
  var tarefa = 0;        /* edição atual: descarta render de edição trocada */

  function carregarMotor() {
    if (pdfjs) return Promise.resolve(pdfjs);
    if (carregando) return carregando;

    /* O caminho vem relativo à página, mas um import() dentro de um script
       clássico resolve pelo endereço do script, não pelo do documento —
       daí o absoluto explícito, que vale para os dois. */
    var motor = new URL(leitor.dataset.motor, document.baseURI).href;
    var operario = new URL(leitor.dataset.operario, document.baseURI).href;

    carregando = import(motor).then(function (modulo) {
      modulo.GlobalWorkerOptions.workerSrc = operario;
      pdfjs = modulo;
      return modulo;
    });
    return carregando;
  }

  function aviso(texto, arquivo) {
    leitor.innerHTML = "";
    var p = document.createElement("p");
    p.className = "boletim-aviso";
    var a = document.createElement("a");
    a.href = arquivo;
    a.textContent = texto;
    p.appendChild(a);
    leitor.appendChild(p);
  }

  /* Uma folha por página do PDF, com a proporção certa desde o início —
     assim a página não dá pulo quando o desenho fica pronto. */
  function folha(proporcao) {
    var div = document.createElement("div");
    div.className = "boletim-pagina";
    div.style.paddingTop = (proporcao * 100).toFixed(3) + "%";
    return div;
  }

  function desenhar(pagina, folhaDaPagina, escala) {
    var vista = pagina.getViewport({ scale: escala });
    var canvas = document.createElement("canvas");
    canvas.width = Math.floor(vista.width);
    canvas.height = Math.floor(vista.height);

    return pagina.render({ canvasContext: canvas.getContext("2d"), viewport: vista })
      .promise.then(function () {
        folhaDaPagina.style.paddingTop = "";
        folhaDaPagina.innerHTML = "";
        folhaDaPagina.appendChild(canvas);
      });
  }

  function abrir(arquivo) {
    var meu = ++tarefa;

    leitor.innerHTML = '<p class="boletim-aviso">Carregando o boletim…</p>';

    return carregarMotor()
      .then(function (modulo) {
        return modulo.getDocument(arquivo).promise;
      })
      .then(function (documento) {
        if (meu !== tarefa) return;
        leitor.innerHTML = "";

        /* Largura disponível, em pixels do dispositivo. O teto de 2 evita
           desenhar quatro vezes mais pixels do que a tela mostra num
           celular moderno, o que travaria a rolagem sem ganho visível. */
        var largura = leitor.clientWidth || 800;
        var densidade = Math.min(window.devicePixelRatio || 1, 2);

        var observador = new IntersectionObserver(function (entradas) {
          entradas.forEach(function (entrada) {
            if (!entrada.isIntersecting) return;
            var alvo = entrada.target;
            observador.unobserve(alvo);

            documento.getPage(Number(alvo.dataset.pagina)).then(function (pagina) {
              if (meu !== tarefa) return;
              var base = pagina.getViewport({ scale: 1 });
              desenhar(pagina, alvo, (largura / base.width) * densidade);
            });
          });
        }, { rootMargin: "600px 0px" });

        var primeira = documento.getPage(1);
        return primeira.then(function (pagina) {
          if (meu !== tarefa) return;
          var base = pagina.getViewport({ scale: 1 });
          var proporcao = base.height / base.width;

          for (var n = 1; n <= documento.numPages; n += 1) {
            var f = folha(proporcao);
            f.dataset.pagina = String(n);
            leitor.appendChild(f);
            observador.observe(f);
          }
        });
      })
      .catch(function (falha) {
        if (meu !== tarefa) return;
        console.error("Boletim:", falha);
        aviso("Não foi possível exibir o boletim aqui. Abrir o PDF.", arquivo);
      });
  }

  /* Troca de edição pela lista de anteriores. */
  var titulo = document.getElementById("boletim-titulo");
  var data = document.getElementById("boletim-data");
  var baixar = document.getElementById("boletim-baixar");

  Array.prototype.forEach.call(
    document.querySelectorAll(".boletim-edicao"),
    function (botao) {
      botao.addEventListener("click", function () {
        var arquivo = botao.dataset.arquivo;
        if (titulo) titulo.textContent = botao.dataset.titulo;
        if (data) data.textContent = botao.dataset.data;
        if (baixar) baixar.href = arquivo;

        Array.prototype.forEach.call(
          document.querySelectorAll(".boletim-edicao"),
          function (outro) { outro.removeAttribute("aria-current"); }
        );
        botao.setAttribute("aria-current", "true");

        abrir(arquivo);
        leitor.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  );

  /* Começa sozinho quando a seção se aproxima — ou já, se a pessoa chegou
     por um link direto para #boletim. */
  var gatilho = new IntersectionObserver(function (entradas) {
    if (!entradas[0].isIntersecting) return;
    gatilho.disconnect();
    abrir(leitor.dataset.arquivo);
  }, { rootMargin: "400px 0px" });

  gatilho.observe(leitor);
})();

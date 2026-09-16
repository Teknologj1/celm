/* Gera SESSION_SECRET e ADMIN_USERS sem que a senha saia do navegador.
 *
 * Usa PBKDF2 da Web Crypto com os mesmos parâmetros do servidor
 * (api/_lib/auth.js) — mudar um lado exige mudar o outro. */
(function () {
  "use strict";

  var ITERACOES = 600000;
  var BYTES = 32;

  var contas = [];

  var form = document.getElementById("form-conta");
  var erro = document.getElementById("erro");
  var calculando = document.getElementById("calculando");
  var saida = document.getElementById("saida");
  var listaContas = document.getElementById("lista-contas");

  function hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  function aleatorio(bytes) {
    return crypto.getRandomValues(new Uint8Array(bytes));
  }

  function base64(bytes) {
    return btoa(String.fromCharCode.apply(null, bytes));
  }

  async function derivar(senha, saltBytes) {
    var chave = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]
    );
    return crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: saltBytes, iterations: ITERACOES, hash: "SHA-256" },
      chave, BYTES * 8
    );
  }

  function mostrarErro(mensagem) {
    erro.textContent = mensagem;
    erro.hidden = false;
  }

  function gerarSegredo() {
    document.getElementById("segredo").value = base64(aleatorio(48));
    atualizarSaida();
  }

  function atualizarSaida() {
    var segredo = document.getElementById("segredo").value;
    document.getElementById("valor-segredo").value = segredo;
    document.getElementById("valor-usuarios").value = JSON.stringify(contas);
    saida.hidden = contas.length === 0;

    listaContas.hidden = contas.length === 0;
    document.getElementById("contas").innerHTML = contas.map(function (c, i) {
      return "<li><strong>" + c.usuario + "</strong> — " + c.nome +
        " <button class='btn btn-secundario btn-sm btn-perigo' data-tirar='" + i + "'>Tirar</button></li>";
    }).join("");
  }

  document.getElementById("gerar-segredo").addEventListener("click", gerarSegredo);

  document.getElementById("mostrar").addEventListener("change", function (evento) {
    var tipo = evento.target.checked ? "text" : "password";
    document.getElementById("senha").type = tipo;
    document.getElementById("senha2").type = tipo;
  });

  document.getElementById("contas").addEventListener("click", function (evento) {
    var indice = evento.target.getAttribute("data-tirar");
    if (indice === null) return;
    contas.splice(Number(indice), 1);
    atualizarSaida();
  });

  document.addEventListener("click", function (evento) {
    var alvo = evento.target.getAttribute("data-copiar");
    if (!alvo) return;

    var campo = document.getElementById(alvo);
    campo.select();
    navigator.clipboard.writeText(campo.value).then(function () {
      var original = evento.target.textContent;
      evento.target.textContent = "Copiado!";
      setTimeout(function () { evento.target.textContent = original; }, 1500);
    }).catch(function () {
      mostrarErro("Não foi possível copiar sozinho. Selecione o texto e copie com Ctrl+C.");
    });
  });

  form.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    erro.hidden = true;

    var usuario = document.getElementById("usuario").value.trim().toLowerCase();
    var nome = document.getElementById("nome").value.trim();
    var senha = document.getElementById("senha").value;
    var senha2 = document.getElementById("senha2").value;

    if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
      return mostrarErro("O usuário deve ter de 3 a 40 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.");
    }
    if (!nome) return mostrarErro("Informe o nome de quem vai acessar.");
    if (senha.length < 12) return mostrarErro("A senha precisa de pelo menos 12 caracteres.");
    if (senha !== senha2) return mostrarErro("As senhas não conferem.");
    if (contas.some(function (c) { return c.usuario === usuario; })) {
      return mostrarErro("Já existe uma conta com esse usuário nesta lista.");
    }

    var botao = document.getElementById("adicionar");
    botao.disabled = true;
    calculando.hidden = false;

    try {
      var salt = aleatorio(16);
      var derivado = await derivar(senha, salt);

      contas.push({
        usuario: usuario,
        nome: nome,
        algoritmo: "pbkdf2",
        iteracoes: ITERACOES,
        salt: hex(salt),
        hash: hex(derivado)
      });

      form.reset();
      document.getElementById("senha").type = "password";
      document.getElementById("senha2").type = "password";
      atualizarSaida();
      document.getElementById("usuario").focus();
    } catch (falha) {
      mostrarErro("Falha ao calcular: " + falha.message);
    } finally {
      botao.disabled = false;
      calculando.hidden = true;
    }
  });

  if (!window.crypto || !window.crypto.subtle) {
    mostrarErro(
      "Este navegador não disponibiliza a Web Crypto nesta página. " +
      "Abra a página pelo endereço do site (https://), não como arquivo local."
    );
    form.querySelector("button[type=submit]").disabled = true;
  } else {
    gerarSegredo();
  }
})();

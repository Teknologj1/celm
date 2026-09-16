"use strict";

const auth = require("./_lib/auth");
const { json, erro, lerCorpo, mesmaOrigem, rotear, ipDaRequisicao } = require("./_lib/http");

module.exports = async function (req, res) {
  return rotear(req, res, {
    POST: async () => {
      if (!mesmaOrigem(req)) return erro(res, 403, "Origem não autorizada.");

      let corpo;
      try {
        corpo = await lerCorpo(req);
      } catch (falha) {
        return erro(res, 400, falha.message);
      }

      const usuario = String(corpo.usuario || "").trim();
      const senha = String(corpo.senha || "");
      const chave = `${ipDaRequisicao(req)}|${usuario.toLowerCase()}`;

      if (auth.bloqueado(chave)) {
        return erro(res, 429, "Tentativas demais. Espere 15 minutos e tente de novo.");
      }
      if (!usuario || !senha) {
        return erro(res, 400, "Informe usuário e senha.");
      }

      /* Antes de qualquer conta existir, dizer isso poupa muito tempo de
         quem está configurando — e não há segredo a proteger ainda. */
      if (!auth.contas().length) {
        return erro(res, 503,
          "Nenhuma conta configurada. Gere uma em /admin/nova-conta.html e " +
          "defina ADMIN_USERS nas variáveis de ambiente.");
      }

      const conta = auth.acharConta(usuario);

      /* A mesma mensagem para usuário inexistente e senha errada: não
         entregamos a quem tenta adivinhar qual dos dois estava certo. */
      if (!conta || !auth.senhaConfere(senha, conta)) {
        auth.registrarFalha(chave);
        return erro(res, 401, "Usuário ou senha incorretos.");
      }

      auth.limparFalhas(chave);

      try {
        res.setHeader("Set-Cookie", auth.cookieDeSessao(auth.criarToken(conta)));
      } catch (falha) {
        console.error("Falha ao criar sessão:", falha.message);
        return erro(res, 500, "Servidor sem SESSION_SECRET configurado.");
      }

      return json(res, 200, {
        usuario: conta.usuario,
        nome: conta.nome || conta.usuario
      });
    }
  });
};

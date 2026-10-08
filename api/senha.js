"use strict";

/* Troca da própria senha, por quem já está dentro do painel. */

const auth = require("./_lib/auth");
const { json, erro, lerCorpo, mesmaOrigem, rotear } = require("./_lib/http");

const MINIMO = 12;

module.exports = async function (req, res) {
  return rotear(req, res, {
    POST: async () => {
      if (!mesmaOrigem(req)) return erro(res, 403, "Origem não autorizada.");

      let sessao;
      try {
        sessao = auth.sessaoDe(req);
      } catch (falha) {
        return erro(res, 500, "Servidor sem SESSION_SECRET configurado.");
      }
      if (!sessao) return erro(res, 401, "Faça login para continuar.");

      let corpo;
      try {
        corpo = await lerCorpo(req);
      } catch (falha) {
        return erro(res, 400, falha.message);
      }

      const atual = String(corpo.senhaAtual || "");
      const nova = String(corpo.senhaNova || "");

      if (!atual || !nova) return erro(res, 400, "Informe a senha atual e a nova.");
      if (nova.length < MINIMO) {
        return erro(res, 422, `A senha nova precisa de pelo menos ${MINIMO} caracteres.`);
      }
      if (nova === atual) {
        return erro(res, 422, "A senha nova precisa ser diferente da atual.");
      }

      try {
        const lista = await auth.contasEfetivas();
        const conta = auth.acharConta(sessao.u, lista);

        if (!conta) return erro(res, 401, "Conta não encontrada.");

        /* Confirma quem está pedindo: sessão sequestrada não troca senha. */
        if (!auth.senhaConfere(atual, conta)) {
          return erro(res, 403, "A senha atual não confere.");
        }

        await auth.guardarSenha(conta.usuario, auth.criarHash(nova), {
          nome: sessao.n || sessao.u
        });

        return json(res, 200, {
          trocada: true,
          aviso: "Use a senha nova no próximo acesso."
        });
      } catch (falha) {
        console.error("Falha ao trocar a senha:", falha);
        if (falha.status === 401 || falha.status === 403) {
          return erro(res, 500, "O servidor não tem permissão de gravação no repositório.");
        }
        return erro(res, 500, "Não foi possível guardar a senha nova.");
      }
    }
  });
};

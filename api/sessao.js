"use strict";

const auth = require("./_lib/auth");
const { json, erro, rotear } = require("./_lib/http");

module.exports = async function (req, res) {
  return rotear(req, res, {
    GET: async () => {
      let sessao = null;
      try {
        sessao = auth.sessaoDe(req);
      } catch (falha) {
        return erro(res, 500, "Servidor sem SESSION_SECRET configurado.");
      }
      if (!sessao) return erro(res, 401, "Sessão expirada ou inexistente.");
      return json(res, 200, { usuario: sessao.u, nome: sessao.n, expiraEm: sessao.exp });
    }
  });
};

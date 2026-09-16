"use strict";

/* Escolhe onde os dados são lidos e gravados.
 *
 * Em produção é o repositório no GitHub: cada alteração vira um commit e
 * dispara a republicação. Em desenvolvimento, os próprios arquivos de
 * data/ — assim dá para testar o painel sem mexer no repositório real. */

const fs = require("fs");
const path = require("path");

const github = require("./github");

const RAIZ = path.join(__dirname, "..", "..");

/* A escolha é explícita, nunca inferida da presença de um token: ambientes
   de desenvolvimento costumam ter GITHUB_TOKEN no ambiente por outros
   motivos, e adivinhar aqui gravaria no repositório real sem querer. */
function modoLocal() {
  return process.env.CELM_ARMAZENAMENTO === "local";
}

const local = {
  async lerJson(arquivo) {
    const conteudo = fs.readFileSync(path.join(RAIZ, arquivo), "utf8");
    return { dados: JSON.parse(conteudo), sha: null };
  },

  async alterarJson(arquivo, transformar) {
    const { dados } = await local.lerJson(arquivo);
    const novos = await transformar(dados);
    if (novos === null) return { alterado: false, dados };

    fs.writeFileSync(path.join(RAIZ, arquivo), JSON.stringify(novos, null, 2) + "\n", "utf8");
    return { alterado: true, dados: novos };
  }
};

function backend() {
  return modoLocal() ? local : github;
}

module.exports = {
  lerJson: (...args) => backend().lerJson(...args),
  alterarJson: (...args) => backend().alterarJson(...args),
  modoLocal
};

"use strict";

/* Cofre das senhas trocadas pelo painel.
 *
 * As contas nascem na variável de ambiente ADMIN_USERS, que uma função
 * serverless não consegue alterar. Para que alguém possa trocar a própria
 * senha sem depender de quem administra a Vercel, a senha nova é guardada
 * num arquivo do repositório — e o repositório é público, então o conteúdo
 * vai cifrado com AES-256-GCM.
 *
 * A chave vem do SESSION_SECRET, que só existe no servidor: quem lê o
 * repositório encontra apenas bytes embaralhados. Em troca, trocar o
 * SESSION_SECRET torna o cofre ilegível e as contas voltam a valer pelas
 * senhas de ADMIN_USERS — um retorno seguro, mas que surpreende quem não
 * souber; está documentado no README. */

const crypto = require("crypto");

const ARQUIVO = "data/contas.enc.json";
const VERSAO = 1;
const SALT_DE_PROPOSITO = "celm-cofre-de-contas-v1";

function chave() {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32) {
    throw new Error("SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres).");
  }
  /* Salt fixo e de propósito: a mesma senha mestra nunca é usada crua, e a
     chave do cofre não serve para forjar cookies de sessão. */
  return crypto.scryptSync(segredo, SALT_DE_PROPOSITO, 32);
}

function cifrar(valor) {
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([
    cifra.update(JSON.stringify(valor), "utf8"),
    cifra.final()
  ]);

  return {
    versao: VERSAO,
    algoritmo: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cifra.getAuthTag().toString("base64"),
    dados: dados.toString("base64"),
    aviso: "Conteúdo cifrado com a chave do servidor. Não edite à mão."
  };
}

function decifrar(pacote) {
  if (!pacote || pacote.versao !== VERSAO) {
    throw new Error("Formato de cofre desconhecido.");
  }

  const decifra = crypto.createDecipheriv(
    "aes-256-gcm", chave(), Buffer.from(pacote.iv, "base64")
  );
  decifra.setAuthTag(Buffer.from(pacote.tag, "base64"));

  const texto = Buffer.concat([
    decifra.update(Buffer.from(pacote.dados, "base64")),
    decifra.final()
  ]).toString("utf8");

  return JSON.parse(texto);
}

module.exports = { cifrar, decifrar, ARQUIVO };

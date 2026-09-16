"use strict";

/* Autenticação do painel: senhas derivadas com PBKDF2, sessão em cookie
 * assinado.
 *
 * As contas ficam na variável de ambiente ADMIN_USERS (JSON), nunca no
 * repositório — o repositório é público e um hash de senha versionado é
 * material para ataque offline.
 *
 * Por que PBKDF2 e não scrypt: o PBKDF2 existe tanto no Node quanto na Web
 * Crypto do navegador, o que permite gerar a conta em /admin/nova-conta.html
 * sem a senha sair do computador de quem cria. O scrypt resiste melhor a
 * ataque com hardware dedicado, então contas geradas com ele continuam
 * válidas — o campo `algoritmo` diz qual usar em cada uma. */

const crypto = require("crypto");

const DURACAO_SESSAO_S = 8 * 60 * 60; /* 8 horas */
const NOME_COOKIE = "celm_sessao";

const PBKDF2_ITERACOES = 600000; /* recomendação atual do OWASP para SHA-256 */
const PBKDF2_BYTES = 32;
const CUSTO_SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function derivarPbkdf2(senha, salt, iteracoes) {
  return crypto.pbkdf2Sync(
    String(senha), Buffer.from(salt, "hex"),
    iteracoes || PBKDF2_ITERACOES, PBKDF2_BYTES, "sha256"
  );
}

function derivarScrypt(senha, salt) {
  return crypto.scryptSync(String(senha), Buffer.from(salt, "hex"), 64, CUSTO_SCRYPT);
}

function criarHash(senha) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    algoritmo: "pbkdf2",
    iteracoes: PBKDF2_ITERACOES,
    salt,
    hash: derivarPbkdf2(senha, salt, PBKDF2_ITERACOES).toString("hex")
  };
}

/* Comparação em tempo constante: evita descobrir a senha pelo tempo de resposta. */
function senhaConfere(senha, conta) {
  if (!conta || !conta.salt || !conta.hash) return false;

  let candidato;
  try {
    candidato = conta.algoritmo === "scrypt" || !conta.algoritmo && conta.hash.length === 128
      ? derivarScrypt(senha, conta.salt)
      : derivarPbkdf2(senha, conta.salt, conta.iteracoes);
  } catch (falha) {
    return false;
  }

  const esperado = Buffer.from(conta.hash, "hex");
  if (candidato.length !== esperado.length) return false;
  return crypto.timingSafeEqual(candidato, esperado);
}

function contas() {
  const bruto = process.env.ADMIN_USERS;
  if (!bruto) return [];
  try {
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? lista : [];
  } catch (falha) {
    console.error("ADMIN_USERS não é um JSON válido.");
    return [];
  }
}

function acharConta(usuario) {
  const alvo = String(usuario || "").trim().toLowerCase();
  return contas().find((c) => String(c.usuario || "").toLowerCase() === alvo) || null;
}

function segredo() {
  const valor = process.env.SESSION_SECRET;
  if (!valor || valor.length < 32) {
    throw new Error("SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres).");
  }
  return valor;
}

function assinar(dados) {
  return crypto.createHmac("sha256", segredo()).update(dados).digest("base64url");
}

function criarToken(conta) {
  const agora = Math.floor(Date.now() / 1000);
  const carga = Buffer.from(JSON.stringify({
    u: conta.usuario,
    n: conta.nome || conta.usuario,
    exp: agora + DURACAO_SESSAO_S
  })).toString("base64url");
  return `${carga}.${assinar(carga)}`;
}

function lerToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [carga, assinatura] = token.split(".");
  if (!carga || !assinatura) return null;

  const esperada = Buffer.from(assinar(carga));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length) return null;
  if (!crypto.timingSafeEqual(esperada, recebida)) return null;

  try {
    const dados = JSON.parse(Buffer.from(carga, "base64url").toString("utf8"));
    if (!dados.exp || dados.exp < Math.floor(Date.now() / 1000)) return null;
    return dados;
  } catch (falha) {
    return null;
  }
}

function lerCookies(req) {
  const cabecalho = req.headers.cookie || "";
  return cabecalho.split(";").reduce((mapa, parte) => {
    const [nome, ...resto] = parte.trim().split("=");
    if (nome) mapa[nome] = decodeURIComponent(resto.join("="));
    return mapa;
  }, {});
}

function sessaoDe(req) {
  try {
    return lerToken(lerCookies(req)[NOME_COOKIE]);
  } catch (falha) {
    return null;
  }
}

function cookieDeSessao(token) {
  return [
    `${NOME_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${DURACAO_SESSAO_S}`
  ].join("; ");
}

function cookieVazio() {
  return `${NOME_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/* Freio de força bruta. Vive na memória da instância: não é uma barreira
   forte num ambiente com várias instâncias, mas contém rajadas — o custo do
   scrypt é a defesa principal. */
const tentativas = new Map();
const JANELA_MS = 15 * 60 * 1000;
const LIMITE = 8;

function registrarFalha(chave) {
  const agora = Date.now();
  const atual = tentativas.get(chave);
  if (!atual || agora - atual.inicio > JANELA_MS) {
    tentativas.set(chave, { inicio: agora, contagem: 1 });
    return;
  }
  atual.contagem += 1;
}

function bloqueado(chave) {
  const atual = tentativas.get(chave);
  if (!atual) return false;
  if (Date.now() - atual.inicio > JANELA_MS) {
    tentativas.delete(chave);
    return false;
  }
  return atual.contagem >= LIMITE;
}

function limparFalhas(chave) {
  tentativas.delete(chave);
}

module.exports = {
  criarHash, senhaConfere, acharConta, contas,
  criarToken, sessaoDe, cookieDeSessao, cookieVazio,
  registrarFalha, bloqueado, limparFalhas,
  NOME_COOKIE, DURACAO_SESSAO_S
};

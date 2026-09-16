"use strict";

/* Utilidades comuns às funções da API. */

function json(res, status, corpo) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(corpo));
}

function erro(res, status, mensagem) {
  json(res, status, { erro: mensagem });
}

/* Lê o corpo da requisição como JSON, com limite de tamanho. */
function lerCorpo(req, limiteBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined && req.body !== null) {
      /* A Vercel já entrega o corpo desserializado quando o tipo é JSON. */
      return resolve(typeof req.body === "string" ? JSON.parse(req.body) : req.body);
    }

    let tamanho = 0;
    const partes = [];

    req.on("data", (parte) => {
      tamanho += parte.length;
      if (tamanho > limiteBytes) {
        reject(new Error("Corpo da requisição grande demais."));
        req.destroy();
        return;
      }
      partes.push(parte);
    });
    req.on("end", () => {
      if (!partes.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(partes).toString("utf8")));
      } catch (falha) {
        reject(new Error("Corpo da requisição não é JSON válido."));
      }
    });
    req.on("error", reject);
  });
}

/* Defesa contra CSRF: além do cookie SameSite=Strict, toda escrita precisa
   vir da própria origem do site. */
function mesmaOrigem(req) {
  const origem = req.headers.origin;
  if (!origem) return false;

  const anfitriao = req.headers["x-forwarded-host"] || req.headers.host;
  try {
    return new URL(origem).host === anfitriao;
  } catch (falha) {
    return false;
  }
}

/* Encaminha o método certo e devolve 405 nos demais. */
function rotear(req, res, manipuladores) {
  const manipulador = manipuladores[req.method];
  if (!manipulador) {
    res.setHeader("Allow", Object.keys(manipuladores).join(", "));
    return erro(res, 405, `Método ${req.method} não permitido aqui.`);
  }
  return manipulador();
}

function ipDaRequisicao(req) {
  const encaminhado = req.headers["x-forwarded-for"];
  if (typeof encaminhado === "string" && encaminhado.length) {
    return encaminhado.split(",")[0].trim();
  }
  return req.socket ? req.socket.remoteAddress : "desconhecido";
}

module.exports = { json, erro, lerCorpo, mesmaOrigem, rotear, ipDaRequisicao };

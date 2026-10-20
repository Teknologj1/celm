"use strict";

/* Recebe o formulário de cadastro e manda o e-mail para a administração.
 *
 * É a única rota pública da API: todas as outras exigem sessão. Rota aberta
 * que dispara e-mail é alvo de robô de spam, então a defesa vem em camadas,
 * e nenhuma delas incomoda quem está preenchendo de verdade:
 *
 *   1. mesma origem — o pedido precisa vir do próprio site;
 *   2. campo-armadilha — invisível para gente, irresistível para robô;
 *   3. tempo mínimo de preenchimento — robô responde em milissegundos;
 *   4. limite por IP — três envios a cada quinze minutos;
 *   5. limites de tamanho em cada campo, antes de tocar no provedor.
 *
 * Sem chave de e-mail configurada a rota devolve 503 com um código que o
 * formulário entende: ele volta a abrir o programa de e-mail do visitante,
 * como fazia antes. Assim o site não quebra enquanto a conta de envio não
 * existe. */

const { json, erro, lerCorpo, mesmaOrigem, rotear, ipDaRequisicao } = require("./_lib/http");
const gh = require("./_lib/armazenamento");

const LIMITES = {
  Empresa: 120, Categoria: 60, Torre: 4, Sala: 40, "Responsável": 120,
  Telefone: 40, "E-mail": 160, Site: 200, "Horário": 120, "Serviços": 300,
  "Descrição": 600, Vantagem: 400
};
const OBRIGATORIOS = ["Empresa", "Categoria", "Torre", "Sala", "Descrição"];

/* Três envios por IP a cada quinze minutos. Vive na memória da instância:
   com várias instâncias o limite é por instância, o que já corta robô
   repetitivo — as outras camadas cuidam do resto. */
const JANELA_MS = 15 * 60 * 1000;
const MAXIMO = 3;
const envios = new Map();

function excedeuLimite(ip) {
  const agora = Date.now();
  const recentes = (envios.get(ip) || []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= MAXIMO) return true;

  recentes.push(agora);
  envios.set(ip, recentes);

  /* Faxina preguiçosa: sem isto o mapa cresce para sempre. */
  if (envios.size > 500) {
    for (const [chave, marcas] of envios) {
      if (!marcas.some((t) => agora - t < JANELA_MS)) envios.delete(chave);
    }
  }
  return false;
}

function texto(valor, limite) {
  return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim().slice(0, limite);
}

function validar(entrada) {
  const problemas = [];
  const dados = {};

  Object.keys(LIMITES).forEach((campo) => {
    const valor = texto(entrada[campo], LIMITES[campo]);
    if (valor) dados[campo] = valor;
  });

  OBRIGATORIOS.forEach((campo) => {
    if (!dados[campo]) problemas.push(`Informe: ${campo}.`);
  });

  if (dados["E-mail"] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados["E-mail"])) {
    problemas.push("E-mail inválido.");
  }

  /* Quebra de linha em cabeçalho de e-mail permite injetar destinatário;
     o assunto é montado a partir do nome da empresa, então ele é limpo. */
  dados.Empresa = dados.Empresa.replace(/[\r\n]/g, " ");

  return { dados, problemas };
}

function escaparHtml(t) {
  return String(t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function corpoTexto(dados) {
  const linhas = Object.keys(dados).map((c) => `${c}: ${dados[c]}`);
  return "Solicitação de cadastro no guia de empresas do complexo.\n\n" +
    linhas.join("\n") +
    "\n\n--\nEnviado pelo formulário de /cadastro/ do site.";
}

function corpoHtml(dados) {
  const linhas = Object.keys(dados).map((c) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#667;white-space:nowrap;vertical-align:top">${escaparHtml(c)}</td>` +
    `<td style="padding:6px 0;color:#112">${escaparHtml(dados[c])}</td></tr>`
  ).join("");

  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5">
    <p>Solicitação de cadastro no guia de empresas do complexo.</p>
    <table style="border-collapse:collapse">${linhas}</table>
    <p style="color:#778;font-size:13px;margin-top:22px">Enviado pelo formulário de <code>/cadastro/</code> do site.</p>
  </div>`;
}

/* Enquanto o condomínio não confirma o endereço, data/centro.json carrega um
   de exemplo. Mandar para ele é pior do que não mandar: o formulário diria
   "enviado" e o pedido cairia no vazio. */
function ehProvisorio(email) {
  return /@exemplo\.|@example\./i.test(String(email || ""));
}

async function destinatario() {
  if (process.env.EMAIL_DESTINO) return process.env.EMAIL_DESTINO;
  const { dados } = await gh.lerJson("data/centro.json");
  return dados.contato && dados.contato.administracao;
}

/* Resend fala HTTP puro, então não entra dependência no projeto. Trocar de
   provedor é trocar esta função. */
async function enviarEmail({ para, responder, assunto, texto: corpo, html }) {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;

  /* O endereço é configurável para dar para apontar a um servidor de
     teste — e para trocar de provedor sem reescrever a função. */
  const api = process.env.EMAIL_API_URL || "https://api.resend.com/emails";

  const resposta = await fetch(api, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: remetente,
      to: [para],
      subject: assunto,
      text: corpo,
      html,
      /* Responder vai direto para quem preencheu, sem copiar e colar. */
      ...(responder ? { reply_to: responder } : {})
    })
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    const falha = new Error(`Provedor de e-mail respondeu ${resposta.status}: ${detalhe.slice(0, 300)}`);
    falha.status = resposta.status;
    throw falha;
  }
  return resposta.json();
}

module.exports = async function (req, res) {
  return rotear(req, res, {
    POST: async () => {
      if (!mesmaOrigem(req)) return erro(res, 403, "Origem não autorizada.");

      let corpo;
      try {
        corpo = await lerCorpo(req, 32 * 1024);
      } catch (falha) {
        return erro(res, 400, falha.message);
      }

      /* Camadas anti-robô. A resposta é a mesma de um envio bem-sucedido:
         dizer "você parece um robô" ensina o robô a passar da próxima. */
      const pareceRobo = Boolean(texto(corpo["ref-interna"], 80)) ||
        !(Number(corpo.levou) > 3000);
      if (pareceRobo) return json(res, 200, { enviado: true });

      if (excedeuLimite(ipDaRequisicao(req))) {
        return erro(res, 429, "Muitos envios seguidos. Tente de novo em alguns minutos.");
      }

      const { dados, problemas } = validar(corpo);
      if (problemas.length) {
        return json(res, 422, { erro: "Dados inválidos.", problemas });
      }

      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_REMETENTE) {
        /* O formulário reconhece este código e volta ao envio pelo
           programa de e-mail do visitante. */
        return json(res, 503, { erro: "Envio por e-mail não configurado.", codigo: "sem-email" });
      }

      let para;
      try {
        para = await destinatario();
      } catch (falha) {
        console.error("Falha ao ler o destinatário:", falha);
      }
      if (!para) {
        return json(res, 503, { erro: "Destinatário não configurado.", codigo: "sem-email" });
      }
      if (ehProvisorio(para)) {
        return json(res, 503, {
          erro: "O endereço da administração ainda não foi confirmado.",
          codigo: "destino-provisorio"
        });
      }

      try {
        await enviarEmail({
          para,
          responder: dados["E-mail"],
          assunto: `Cadastro no guia: ${dados.Empresa}`,
          texto: corpoTexto(dados),
          html: corpoHtml(dados)
        });
      } catch (falha) {
        console.error("Falha ao enviar o cadastro:", falha);
        /* Mesmo código do caso sem configuração: para quem preencheu, o
           efeito é o mesmo — o e-mail não saiu, e há um caminho manual. */
        return json(res, 502, { erro: "Não foi possível enviar agora.", codigo: "sem-email" });
      }

      return json(res, 200, { enviado: true, para });
    }
  });
};

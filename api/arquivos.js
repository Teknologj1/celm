"use strict";

/* Recebe um arquivo do navegador e o grava no repositório.
 *
 * É o que permite subir a peça de um anúncio ou o PDF do boletim sem
 * conhecer o caminho de nada: o painel manda o arquivo, esta função decide
 * onde ele mora e devolve o endereço para guardar no JSON. */

const auth = require("./_lib/auth");
const gh = require("./_lib/armazenamento");
const { json, erro, lerCorpo, mesmaOrigem, rotear } = require("./_lib/http");

/* A Vercel recusa corpos acima de 4,5 MB e o base64 engorda o arquivo em um
   terço. Daí o teto de 3 MB, que ainda é generoso para um boletim de
   condomínio — PDF acima disso costuma ser imagem não comprimida. */
const LIMITE_BYTES = 3 * 1024 * 1024;

const TIPOS = {
  boletim: {
    pasta: "assets/boletins",
    extensoes: { pdf: "application/pdf" },
    /* %PDF- no início do arquivo */
    assinatura: (b) => b.length > 4 && b.toString("latin1", 0, 5) === "%PDF-",
    rotulo: "boletim"
  },
  anuncio: {
    pasta: "assets/img/anuncios",
    extensoes: {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      webp: "image/webp",
      svg: "image/svg+xml"
    },
    assinatura: () => true,
    rotulo: "peça de anúncio"
  }
};

/* Nome de arquivo previsível: sem acento, sem espaço, sem caminho. O nome
   que o visitante vê no download vem daqui, então vale ser legível. */
function nomeSeguro(nome) {
  return String(nome || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

module.exports = async function (req, res) {
  let sessao;
  try {
    sessao = auth.sessaoDe(req);
  } catch (falha) {
    return erro(res, 500, "Servidor sem SESSION_SECRET configurado.");
  }
  if (!sessao) return erro(res, 401, "Faça login para continuar.");

  return rotear(req, res, {
    POST: async () => {
      if (!mesmaOrigem(req)) return erro(res, 403, "Origem não autorizada.");

      let corpo;
      try {
        /* O teto do corpo acompanha o do arquivo, com folga para o base64
           e para os demais campos do JSON. */
        corpo = await lerCorpo(req, Math.ceil(LIMITE_BYTES * 1.4) + 4096);
      } catch (falha) {
        return erro(res, 413, "Arquivo grande demais. O limite é 3 MB.");
      }

      const tipo = TIPOS[String(corpo.tipo || "")];
      if (!tipo) return erro(res, 400, "Tipo de arquivo não reconhecido.");

      /* Só a gestão comercial mexe em anúncio; o boletim é da administração
         e vale para os dois perfis. */
      if (corpo.tipo === "anuncio" && !auth.podeAnunciar(sessao)) {
        return erro(res, 403, "Esta área é da gestão comercial do guia.");
      }

      const nome = nomeSeguro(corpo.nome);
      const extensao = (nome.split(".").pop() || "").toLowerCase();
      if (!nome || !Object.prototype.hasOwnProperty.call(tipo.extensoes, extensao)) {
        const aceitos = Object.keys(tipo.extensoes).join(", ");
        return erro(res, 422, `Formato não aceito para ${tipo.rotulo}. Envie: ${aceitos}.`);
      }

      let bytes;
      try {
        bytes = Buffer.from(String(corpo.conteudo || ""), "base64");
      } catch (falha) {
        return erro(res, 400, "Conteúdo do arquivo inválido.");
      }
      if (!bytes.length) return erro(res, 400, "O arquivo chegou vazio.");
      if (bytes.length > LIMITE_BYTES) {
        return erro(res, 413, "Arquivo grande demais. O limite é 3 MB.");
      }

      /* Confere o conteúdo, não só o nome: um .pdf que não começa com %PDF-
         não é PDF, e o leitor da página falharia sem explicação. */
      if (!tipo.assinatura(bytes)) {
        return erro(res, 422, "O arquivo não parece um PDF válido.");
      }

      /* O prefixo de data evita que uma edição nova sobrescreva a anterior
         e mantém a pasta em ordem cronológica. */
      const hoje = new Date().toISOString().slice(0, 10);
      const caminho = `${tipo.pasta}/${hoje}-${nome}`;

      try {
        await gh.salvarArquivo(
          caminho,
          bytes.toString("base64"),
          `Envia ${tipo.rotulo}: ${nome}`,
          { nome: sessao.n || sessao.u }
        );
      } catch (falha) {
        console.error("Falha ao gravar arquivo:", falha);
        if (falha.status === 401 || falha.status === 403) {
          return erro(res, 500, "O servidor não tem permissão de gravação no repositório.");
        }
        return erro(res, 500, "Não foi possível enviar o arquivo.");
      }

      return json(res, 201, { caminho, bytes: bytes.length });
    }
  });
};

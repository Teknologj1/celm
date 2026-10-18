"use strict";

/* Espaços publicitários do guia. Só o perfil comercial enxerga e altera:
 * a administração do condomínio cuida do cadastro de empresas, a gestão
 * dos anúncios é de quem comercializa. */

const auth = require("./_lib/auth");
const gh = require("./_lib/armazenamento");
const { json, erro, lerCorpo, mesmaOrigem, rotear } = require("./_lib/http");

const ARQUIVO = "data/anuncios.json";
const LIMITES = { titulo: 120, texto: 300, link: 500, imagem: 300, anunciante: 120, formato: 200 };

function exigirComercial(req, res) {
  let sessao;
  try {
    sessao = auth.sessaoDe(req);
  } catch (falha) {
    erro(res, 500, "Servidor sem SESSION_SECRET configurado.");
    return null;
  }
  if (!sessao) {
    erro(res, 401, "Faça login para continuar.");
    return null;
  }
  if (!auth.podeAnunciar(sessao)) {
    erro(res, 403, "Esta área é da gestão comercial do guia.");
    return null;
  }
  return sessao;
}

function texto(valor, limite) {
  return String(valor == null ? "" : valor).trim().slice(0, limite);
}

function validar(entrada) {
  const problemas = [];
  const anuncio = {};

  ["titulo", "texto", "link", "imagem", "anunciante", "formato"].forEach((campo) => {
    anuncio[campo] = texto(entrada[campo], LIMITES[campo]);
  });

  anuncio.ativo = entrada.ativo === true || entrada.ativo === "true";
  anuncio.inicio = texto(entrada.inicio, 10);
  anuncio.fim = texto(entrada.fim, 10);

  const data = /^\d{4}-\d{2}-\d{2}$/;
  if (anuncio.inicio && !data.test(anuncio.inicio)) problemas.push("Data de início inválida.");
  if (anuncio.fim && !data.test(anuncio.fim)) problemas.push("Data de término inválida.");
  if (anuncio.inicio && anuncio.fim && anuncio.fim < anuncio.inicio) {
    problemas.push("O término não pode ser antes do início.");
  }

  /* Um anúncio no ar precisa de pelo menos um título para mostrar. */
  if (anuncio.ativo && !anuncio.titulo) {
    problemas.push("Para colocar no ar, informe ao menos o título.");
  }
  if (anuncio.link && !/^https?:\/\//i.test(anuncio.link)) {
    problemas.push("O link deve começar com http:// ou https://");
  }

  return { anuncio, problemas };
}

module.exports = async function (req, res) {
  const sessao = exigirComercial(req, res);
  if (!sessao) return;

  const autor = { nome: sessao.n || sessao.u };

  return rotear(req, res, {
    GET: async () => {
      try {
        const { dados } = await gh.lerJson(ARQUIVO);
        return json(res, 200, { anuncios: dados });
      } catch (falha) {
        console.error("Falha ao ler anúncios:", falha);
        return erro(res, 500, "Não foi possível carregar os espaços.");
      }
    },

    POST: async () => {
      if (!mesmaOrigem(req)) return erro(res, 403, "Origem não autorizada.");

      let corpo;
      try {
        corpo = await lerCorpo(req);
      } catch (falha) {
        return erro(res, 400, falha.message);
      }

      const id = texto(corpo.id, 60);
      if (!id) return erro(res, 400, "Informe qual espaço está sendo alterado.");

      const { anuncio, problemas } = validar(corpo);
      if (problemas.length) {
        return json(res, 422, { erro: "Dados inválidos.", problemas });
      }

      try {
        let encontrado = false;

        await gh.alterarJson(ARQUIVO, (lista) => {
          const espacos = Array.isArray(lista) ? lista : [];
          const i = espacos.findIndex((a) => a.id === id);
          if (i === -1) return null;

          encontrado = true;
          /* O espaço e o formato são da estrutura do site; o resto é da
             campanha e pode ser trocado a cada veiculação. */
          espacos[i] = Object.assign({}, espacos[i], anuncio, {
            id: espacos[i].id,
            espaco: espacos[i].espaco,
            formato: anuncio.formato || espacos[i].formato
          });
          return espacos;
        },
        anuncio.ativo
          ? `Coloca no ar o anúncio em ${id}`
          : `Tira do ar o anúncio em ${id}`,
        autor);

        if (!encontrado) return erro(res, 404, "Espaço não encontrado.");
        return json(res, 200, { id, ativo: anuncio.ativo });
      } catch (falha) {
        console.error("Falha ao gravar anúncio:", falha);
        if (falha.status === 401 || falha.status === 403) {
          return erro(res, 500, "O servidor não tem permissão de gravação no repositório.");
        }
        return erro(res, 500, "Não foi possível salvar o anúncio.");
      }
    }
  });
};

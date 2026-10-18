"use strict";

/* Campanhas publicitárias. Só o perfil comercial enxerga e altera: a
 * administração do condomínio cuida do cadastro de empresas, a gestão dos
 * anúncios é de quem comercializa.
 *
 * Cada espaço do site comporta várias campanhas, que se revezam em tela. A
 * definição do espaço (nome, formato, limite, tabela de preços) vive em
 * data/espacos.json e não muda pelo painel — é a estrutura do site. O que
 * o painel grava é data/anuncios.json, a lista de campanhas. */

const auth = require("./_lib/auth");
const gh = require("./_lib/armazenamento");
const { json, erro, lerCorpo, mesmaOrigem, rotear } = require("./_lib/http");

const ARQUIVO = "data/anuncios.json";
const ESPACOS = "data/espacos.json";
const LIMITES = { titulo: 120, texto: 300, link: 500, imagem: 300, anunciante: 120 };

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

  ["titulo", "texto", "link", "imagem", "anunciante"].forEach((campo) => {
    anuncio[campo] = texto(entrada[campo], LIMITES[campo]);
  });

  anuncio.espaco = texto(entrada.espaco, 40);
  anuncio.ativo = entrada.ativo === true || entrada.ativo === "true";
  anuncio.inicio = texto(entrada.inicio, 10);
  anuncio.fim = texto(entrada.fim, 10);

  const data = /^\d{4}-\d{2}-\d{2}$/;
  if (!anuncio.espaco) problemas.push("Informe em qual espaço a campanha entra.");
  if (anuncio.inicio && !data.test(anuncio.inicio)) problemas.push("Data de início inválida.");
  if (anuncio.fim && !data.test(anuncio.fim)) problemas.push("Data de término inválida.");
  if (anuncio.inicio && anuncio.fim && anuncio.fim < anuncio.inicio) {
    problemas.push("O término não pode ser antes do início.");
  }
  if (!anuncio.titulo) problemas.push("Informe ao menos o título da campanha.");
  if (anuncio.link && !/^https?:\/\//i.test(anuncio.link)) {
    problemas.push("O link deve começar com http:// ou https://");
  }

  return { anuncio, problemas };
}

/* Identificador legível, derivado do anunciante — ajuda a reconhecer a
   campanha no histórico do Git, que é a auditoria do painel. */
function novoId(anuncio, existentes) {
  const base = (anuncio.anunciante || anuncio.titulo || anuncio.espaco)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 40) || "campanha";

  let id = `${anuncio.espaco}-${base}`;
  let n = 2;
  while (existentes.some((a) => a.id === id)) {
    id = `${anuncio.espaco}-${base}-${n}`;
    n += 1;
  }
  return id;
}

function noAr(a, hoje) {
  return a.ativo && (!a.inicio || a.inicio <= hoje) && (!a.fim || a.fim >= hoje);
}

module.exports = async function (req, res) {
  const sessao = exigirComercial(req, res);
  if (!sessao) return;

  const autor = { nome: sessao.n || sessao.u };

  async function lerEspacos() {
    const { dados } = await gh.lerJson(ESPACOS);
    return Array.isArray(dados) ? dados : [];
  }

  async function lerCampanhas() {
    try {
      const { dados } = await gh.lerJson(ARQUIVO);
      return Array.isArray(dados) ? dados : [];
    } catch (falha) {
      if (falha.status === 404 || falha.code === "ENOENT") return [];
      throw falha;
    }
  }

  return rotear(req, res, {
    GET: async () => {
      try {
        const [espacos, anuncios] = await Promise.all([lerEspacos(), lerCampanhas()]);
        return json(res, 200, { espacos, anuncios });
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

      const id = texto(corpo.id, 80);

      if (corpo.remover === true) {
        if (!id) return erro(res, 400, "Informe qual campanha remover.");
        try {
          let achou = false;
          await gh.alterarJson(ARQUIVO, (lista) => {
            const campanhas = Array.isArray(lista) ? lista : [];
            const restantes = campanhas.filter((a) => a.id !== id);
            if (restantes.length === campanhas.length) return null;
            achou = true;
            return restantes;
          }, `Remove a campanha ${id}`, autor);

          if (!achou) return erro(res, 404, "Campanha não encontrada.");
          return json(res, 200, { id, removida: true });
        } catch (falha) {
          console.error("Falha ao remover campanha:", falha);
          return erro(res, 500, "Não foi possível remover a campanha.");
        }
      }

      const { anuncio, problemas } = validar(corpo);
      if (problemas.length) {
        return json(res, 422, { erro: "Dados inválidos.", problemas });
      }

      let espacos;
      try {
        espacos = await lerEspacos();
      } catch (falha) {
        console.error("Falha ao ler espaços:", falha);
        return erro(res, 500, "Não foi possível carregar os espaços.");
      }

      const espaco = espacos.find((e) => e.id === anuncio.espaco);
      if (!espaco) return erro(res, 422, "Espaço não reconhecido.");

      try {
        const hoje = new Date().toISOString().slice(0, 10);
        let estourou = false;
        let salva = null;

        await gh.alterarJson(ARQUIVO, (lista) => {
          const campanhas = Array.isArray(lista) ? lista : [];
          const i = campanhas.findIndex((a) => a.id === id);

          /* O limite é do espaço e vale para quem está no ar hoje: campanha
             agendada ou encerrada não ocupa vaga, e por isso dá para deixar
             a do mês que vem pronta sem travar a deste mês. */
          if (noAr(anuncio, hoje)) {
            const ocupadas = campanhas.filter(
              (a) => a.espaco === anuncio.espaco && a.id !== id && noAr(a, hoje)
            ).length;
            if (ocupadas >= (Number(espaco.limite) || 1)) {
              estourou = true;
              return null;
            }
          }

          if (i === -1) {
            salva = Object.assign({ id: novoId(anuncio, campanhas) }, anuncio);
            campanhas.push(salva);
          } else {
            salva = Object.assign({}, campanhas[i], anuncio, { id: campanhas[i].id });
            campanhas[i] = salva;
          }
          return campanhas;
        },
        id ? `Atualiza a campanha ${id}` : `Cria campanha em ${anuncio.espaco}`,
        autor);

        if (estourou) {
          return json(res, 422, {
            erro: "Espaço lotado.",
            problemas: [`${espaco.nome} comporta ${espaco.limite} campanhas no ar ao mesmo tempo. ` +
              "Tire uma do ar, ou agende esta para depois."]
          });
        }

        return json(res, 200, { anuncio: salva });
      } catch (falha) {
        console.error("Falha ao gravar campanha:", falha);
        if (falha.status === 401 || falha.status === 403) {
          return erro(res, 500, "O servidor não tem permissão de gravação no repositório.");
        }
        return erro(res, 500, "Não foi possível salvar a campanha.");
      }
    }
  });
};

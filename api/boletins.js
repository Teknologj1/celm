"use strict";

/* Edições do boletim informativo.
 *
 * Cuidar do boletim é tarefa da administração do condomínio, então aqui
 * basta estar autenticado — os dois perfis publicam. O PDF em si sobe por
 * /api/arquivos e o que se guarda aqui é a ficha da edição. */

const auth = require("./_lib/auth");
const gh = require("./_lib/armazenamento");
const { json, erro, lerCorpo, mesmaOrigem, rotear } = require("./_lib/http");

const ARQUIVO = "data/boletins.json";
const LIMITES = { titulo: 120, resumo: 300, arquivo: 300 };

function texto(valor, limite) {
  return String(valor == null ? "" : valor).trim().slice(0, limite);
}

function validar(entrada) {
  const problemas = [];
  const boletim = {
    titulo: texto(entrada.titulo, LIMITES.titulo),
    resumo: texto(entrada.resumo, LIMITES.resumo),
    arquivo: texto(entrada.arquivo, LIMITES.arquivo),
    data: texto(entrada.data, 10)
  };

  if (!boletim.titulo) problemas.push("Informe o título da edição.");
  if (!boletim.arquivo) problemas.push("Envie o PDF da edição.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(boletim.data)) problemas.push("Informe a data da edição.");

  /* O caminho só pode apontar para a pasta dos boletins: aceitar qualquer
     caminho deixaria publicar um arquivo arbitrário do repositório. */
  if (boletim.arquivo && !/^assets\/boletins\/[a-z0-9.\-]+\.pdf$/.test(boletim.arquivo)) {
    problemas.push("O arquivo precisa ser um PDF enviado pelo painel.");
  }

  return { boletim, problemas };
}

module.exports = async function (req, res) {
  let sessao;
  try {
    sessao = auth.sessaoDe(req);
  } catch (falha) {
    return erro(res, 500, "Servidor sem SESSION_SECRET configurado.");
  }
  if (!sessao) return erro(res, 401, "Faça login para continuar.");

  const autor = { nome: sessao.n || sessao.u };

  return rotear(req, res, {
    GET: async () => {
      try {
        const { dados } = await gh.lerJson(ARQUIVO);
        return json(res, 200, { boletins: Array.isArray(dados) ? dados : [] });
      } catch (falha) {
        /* Antes da primeira edição o arquivo pode nem existir. */
        if (falha.status === 404 || falha.code === "ENOENT") {
          return json(res, 200, { boletins: [] });
        }
        console.error("Falha ao ler boletins:", falha);
        return erro(res, 500, "Não foi possível carregar os boletins.");
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

      if (corpo.remover === true) {
        if (!id) return erro(res, 400, "Informe qual edição remover.");
        try {
          let encontrada = false;
          await gh.alterarJson(ARQUIVO, (lista) => {
            const edicoes = Array.isArray(lista) ? lista : [];
            const restantes = edicoes.filter((b) => b.id !== id);
            if (restantes.length === edicoes.length) return null;
            encontrada = true;
            return restantes;
          }, `Retira a edição ${id} do boletim`, autor);

          if (!encontrada) return erro(res, 404, "Edição não encontrada.");
          return json(res, 200, { id, removida: true });
        } catch (falha) {
          console.error("Falha ao remover boletim:", falha);
          return erro(res, 500, "Não foi possível remover a edição.");
        }
      }

      const { boletim, problemas } = validar(corpo);
      if (problemas.length) {
        return json(res, 422, { erro: "Dados inválidos.", problemas });
      }

      /* O identificador vem da data: uma edição por mês é o ritmo usual, e
         republicar o mesmo mês substitui em vez de duplicar. */
      boletim.id = id || boletim.data.slice(0, 7);

      try {
        await gh.alterarJson(ARQUIVO, (lista) => {
          const edicoes = Array.isArray(lista) ? lista : [];
          const i = edicoes.findIndex((b) => b.id === boletim.id);
          if (i === -1) edicoes.push(boletim);
          else edicoes[i] = boletim;

          edicoes.sort((a, b) => String(b.data).localeCompare(String(a.data)));
          return edicoes;
        }, `Publica a edição ${boletim.id} do boletim`, autor);

        return json(res, 200, { boletim });
      } catch (falha) {
        console.error("Falha ao gravar boletim:", falha);
        if (falha.status === 401 || falha.status === 403) {
          return erro(res, 500, "O servidor não tem permissão de gravação no repositório.");
        }
        return erro(res, 500, "Não foi possível salvar a edição.");
      }
    }
  });
};

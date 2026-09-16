"use strict";

/* CRUD das empresas do guia. Toda escrita exige sessão e vira um commit. */

const auth = require("./_lib/auth");
const gh = require("./_lib/armazenamento");
const { validar } = require("./_lib/empresas");
const { json, erro, lerCorpo, mesmaOrigem, rotear } = require("./_lib/http");

const ARQUIVO = "data/empresas.json";

function exigirSessao(req, res) {
  let sessao = null;
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
  return sessao;
}

async function contexto() {
  const [categorias, centro] = await Promise.all([
    gh.lerJson("data/categorias.json"),
    gh.lerJson("data/centro.json")
  ]);
  return {
    categorias: categorias.dados.map((c) => c.slug),
    torres: (centro.dados.torres || []).map((t) => t.id)
  };
}

function tratarFalha(res, falha) {
  console.error("Falha na rota de empresas:", falha);
  if (falha.status === 404) {
    return erro(res, 500, "Arquivo de dados não encontrado no repositório.");
  }
  if (falha.status === 401 || falha.status === 403) {
    return erro(res, 500, "O servidor não tem permissão de gravação no repositório.");
  }
  return erro(res, 500, falha.message || "Erro inesperado ao acessar os dados.");
}

module.exports = async function (req, res) {
  const sessao = exigirSessao(req, res);
  if (!sessao) return;

  const autor = { nome: sessao.n || sessao.u };

  return rotear(req, res, {
    GET: async () => {
      try {
        const [empresas, categorias, centro] = await Promise.all([
          gh.lerJson(ARQUIVO),
          gh.lerJson("data/categorias.json"),
          gh.lerJson("data/centro.json")
        ]);
        return json(res, 200, {
          empresas: empresas.dados,
          categorias: categorias.dados.map((c) => ({ slug: c.slug, nome: c.nome })),
          torres: (centro.dados.torres || []).map((t) => ({ id: t.id, nome: t.nome }))
        });
      } catch (falha) {
        return tratarFalha(res, falha);
      }
    },

    /* Cria uma empresa ou atualiza a existente, conforme o slug enviado. */
    POST: async () => {
      if (!mesmaOrigem(req)) return erro(res, 403, "Origem não autorizada.");

      let corpo;
      try {
        corpo = await lerCorpo(req);
      } catch (falha) {
        return erro(res, 400, falha.message);
      }

      const slugAtual = corpo.slugAtual ? String(corpo.slugAtual) : null;

      try {
        const { categorias, torres } = await contexto();
        let resultado = null;

        await gh.alterarJson(ARQUIVO, (empresas) => {
          const lista = Array.isArray(empresas) ? empresas : [];
          const { empresa, problemas } = validar(corpo, {
            categorias,
            torres,
            slugsExistentes: lista.map((e) => e.slug),
            slugAtual
          });

          if (problemas.length) {
            resultado = { problemas };
            return null;
          }

          const indice = slugAtual ? lista.findIndex((e) => e.slug === slugAtual) : -1;
          if (slugAtual && indice === -1) {
            resultado = { problemas: ["Empresa não encontrada para atualizar."] };
            return null;
          }

          if (indice >= 0) {
            lista[indice] = { ...lista[indice], ...empresa };
          } else {
            lista.push(empresa);
          }

          resultado = { empresa, criada: indice < 0 };
          return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        },
        slugAtual
          ? `Atualiza ${corpo.nome || slugAtual} no guia`
          : `Inclui ${corpo.nome || "empresa"} no guia`,
        autor);

        if (resultado && resultado.problemas) {
          return json(res, 422, { erro: "Dados inválidos.", problemas: resultado.problemas });
        }
        return json(res, 200, resultado);
      } catch (falha) {
        return tratarFalha(res, falha);
      }
    },

    DELETE: async () => {
      if (!mesmaOrigem(req)) return erro(res, 403, "Origem não autorizada.");

      const url = new URL(req.url, "http://local");
      const slug = url.searchParams.get("slug");
      if (!slug) return erro(res, 400, "Informe qual empresa remover.");

      try {
        let removida = null;

        await gh.alterarJson(ARQUIVO, (empresas) => {
          const lista = Array.isArray(empresas) ? empresas : [];
          const alvo = lista.find((e) => e.slug === slug);
          if (!alvo) return null;
          removida = alvo;
          return lista.filter((e) => e.slug !== slug);
        },
        `Remove ${slug} do guia`,
        autor);

        if (!removida) return erro(res, 404, "Empresa não encontrada.");
        return json(res, 200, { removida: removida.slug, nome: removida.nome });
      } catch (falha) {
        return tratarFalha(res, falha);
      }
    }
  });
};

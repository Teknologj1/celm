"use strict";

/* Leitura e gravação dos arquivos de dados no repositório.
 *
 * O painel não tem banco: cada alteração vira um commit em data/*.json, o
 * que dá histórico completo e permite desfazer qualquer edição pelo Git. O
 * commit dispara a reconstrução do site na Vercel. */

const API = "https://api.github.com";

function configuracao() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token) throw new Error("GITHUB_TOKEN não configurado.");
  if (!repo || !repo.includes("/")) {
    throw new Error("GITHUB_REPO não configurado (esperado 'dono/repositorio').");
  }
  return { token, repo, branch };
}

async function chamar(caminho, opcoes = {}) {
  const { token } = configuracao();
  const resposta = await fetch(`${API}${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "celm-painel",
      ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
      ...opcoes.headers
    }
  });

  const texto = await resposta.text();
  let corpo = null;
  if (texto) {
    try { corpo = JSON.parse(texto); } catch (falha) { corpo = texto; }
  }

  if (!resposta.ok) {
    const detalhe = corpo && corpo.message ? corpo.message : resposta.statusText;
    const erro = new Error(`GitHub respondeu ${resposta.status}: ${detalhe}`);
    erro.status = resposta.status;
    throw erro;
  }
  return corpo;
}

async function lerJson(arquivo) {
  const { repo, branch } = configuracao();
  const resposta = await chamar(
    `/repos/${repo}/contents/${encodeURIComponent(arquivo)}?ref=${encodeURIComponent(branch)}`
  );
  const conteudo = Buffer.from(resposta.content, "base64").toString("utf8");
  return { dados: JSON.parse(conteudo), sha: resposta.sha };
}

async function gravarJson(arquivo, dados, sha, mensagem, autor) {
  const { repo, branch } = configuracao();
  const conteudo = JSON.stringify(dados, null, 2) + "\n";

  const corpo = {
    message: mensagem,
    content: Buffer.from(conteudo, "utf8").toString("base64"),
    branch,
    sha
  };

  if (autor && autor.nome) {
    /* Registra quem alterou. O e-mail 'noreply' evita expor endereço real. */
    corpo.author = {
      name: `${autor.nome} (painel CELM)`,
      email: autor.email || "painel@users.noreply.github.com"
    };
  }

  return chamar(`/repos/${repo}/contents/${encodeURIComponent(arquivo)}`, {
    method: "PUT",
    body: JSON.stringify(corpo)
  });
}

/* Lê, aplica a alteração e grava. Se outra edição entrou no meio, o GitHub
   recusa por conflito de sha e a operação é refeita sobre o estado novo. */
async function alterarJson(arquivo, transformar, mensagem, autor, tentativas = 3) {
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    const { dados, sha } = await lerJson(arquivo);
    const novos = await transformar(dados);
    if (novos === null) return { alterado: false, dados };

    try {
      await gravarJson(arquivo, novos, sha, mensagem, autor);
      return { alterado: true, dados: novos };
    } catch (falha) {
      const conflito = falha.status === 409 || falha.status === 422;
      if (!conflito || tentativa === tentativas) throw falha;
    }
  }
  throw new Error("Não foi possível gravar: o arquivo mudou durante a edição.");
}

module.exports = { lerJson, gravarJson, alterarJson, configuracao };

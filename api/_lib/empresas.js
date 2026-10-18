"use strict";

/* Regras de validação do cadastro de empresa, compartilhadas pelas rotas. */

const CAMPOS_TEXTO = [
  "nome", "descricao", "sala", "telefone", "whatsapp", "email", "site",
  "instagram", "horario", "responsavel", "beneficio", "logo", "capa"
];

const LIMITES = {
  /* A descrição aparece no cartão do diretório, onde todos têm a mesma
     altura. Acima de ~220 caracteres o texto é cortado em tela e ninguém lê
     o final; melhor avisar na hora de escrever. */
  nome: 120, descricao: 220, sala: 40, telefone: 40, whatsapp: 20,
  email: 160, site: 300, instagram: 80, horario: 160, responsavel: 120,
  beneficio: 400, logo: 300, capa: 300
};

function slugificar(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function texto(valor, limite) {
  return String(valor == null ? "" : valor).trim().slice(0, limite);
}

/* Normaliza o que veio do formulário e devolve os problemas encontrados. */
function validar(entrada, { categorias, torres, slugsExistentes, slugAtual }) {
  const problemas = [];
  const empresa = {};

  CAMPOS_TEXTO.forEach((campo) => {
    empresa[campo] = texto(entrada[campo], LIMITES[campo] || 200);
  });

  if (!empresa.nome) problemas.push("Informe o nome da empresa.");
  if (!empresa.descricao) problemas.push("Informe a descrição.");

  /* Caminho de imagem só pode apontar para as pastas do próprio site: é o
     que o painel grava ao enviar o arquivo. */
  ["logo", "capa"].forEach((campo) => {
    if (empresa[campo] && !/^assets\/img\/[a-z0-9/._-]+$/i.test(empresa[campo])) {
      problemas.push(`O campo ${campo} precisa ser uma imagem enviada pelo painel.`);
    }
  });
  if (!empresa.sala) problemas.push("Informe a sala.");

  empresa.categoria = texto(entrada.categoria, 60);
  if (!categorias.includes(empresa.categoria)) {
    problemas.push("Selecione uma categoria válida.");
  }

  empresa.torre = texto(entrada.torre, 4).toUpperCase();
  if (!torres.includes(empresa.torre)) {
    problemas.push("Selecione uma torre válida.");
  }

  const andar = Number(entrada.andar);
  if (!Number.isFinite(andar) || andar < 0 || andar > 100) {
    problemas.push("Informe um andar entre 0 e 100.");
  }
  empresa.andar = Number.isFinite(andar) ? Math.trunc(andar) : 0;

  if (empresa.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(empresa.email)) {
    problemas.push("E-mail inválido.");
  }
  if (empresa.site && !/^https?:\/\//i.test(empresa.site)) {
    problemas.push("O site deve começar com http:// ou https://");
  }
  if (empresa.site && empresa.site.includes("@")) {
    problemas.push("O campo do site recebeu um endereço de e-mail. Use o campo de e-mail.");
  }
  if (empresa.whatsapp && !/^\d{10,15}$/.test(empresa.whatsapp)) {
    problemas.push("WhatsApp deve conter só números, com DDI e DDD. Ex.: 5561900001208");
  }

  empresa.tags = Array.isArray(entrada.tags)
    ? entrada.tags.map((t) => texto(t, 60)).filter(Boolean).slice(0, 8)
    : texto(entrada.tags, 400).split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);

  empresa.destaque = entrada.destaque === true || entrada.destaque === "true";
  empresa.demo = entrada.demo === true || entrada.demo === "true";

  empresa.slug = texto(entrada.slug, 80) || slugificar(empresa.nome);
  if (!empresa.slug) problemas.push("Não foi possível gerar o endereço da página.");

  const conflito = slugsExistentes.includes(empresa.slug) && empresa.slug !== slugAtual;
  if (conflito) {
    problemas.push(`Já existe uma empresa com o endereço "${empresa.slug}". Mude o nome ou o endereço.`);
  }

  return { empresa, problemas };
}

module.exports = { validar, slugificar, CAMPOS_TEXTO };

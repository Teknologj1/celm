#!/usr/bin/env node
"use strict";

/* Gera o registro de uma conta do painel para a variável ADMIN_USERS.
 *
 *   node scripts/criar-usuario.js sindico "Maria Silva"
 *
 * A senha é pedida no terminal e nunca fica salva em arquivo. Copie o JSON
 * resultante para a variável de ambiente ADMIN_USERS na Vercel. */

const readline = require("readline");
const { criarHash } = require("../api/_lib/auth");

const usuario = (process.argv[2] || "").trim().toLowerCase();
const nome = (process.argv[3] || "").trim();

if (!usuario) {
  console.error("Uso: node scripts/criar-usuario.js <usuario> [\"Nome Completo\"]");
  process.exit(1);
}
if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
  console.error("O usuário deve ter de 3 a 40 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.");
  process.exit(1);
}

function perguntarSenha(rotulo) {
  return new Promise((resolve) => {
    const leitor = readline.createInterface({ input: process.stdin, output: process.stdout });
    /* Esconde o que for digitado. */
    leitor.output.write(rotulo);
    leitor.input.on("keypress", () => {
      readline.moveCursor(leitor.output, -leitor.line.length, 0);
      readline.clearLine(leitor.output, 1);
      leitor.output.write(rotulo + "*".repeat(leitor.line.length));
    });
    leitor.question("", (resposta) => {
      leitor.output.write("\n");
      leitor.close();
      resolve(resposta);
    });
  });
}

(async () => {
  const senha = process.env.SENHA || await perguntarSenha("Senha: ");

  if (senha.length < 12) {
    console.error("\n✗ Use pelo menos 12 caracteres. Uma frase com quatro palavras já resolve.");
    process.exit(1);
  }

  if (!process.env.SENHA) {
    const confirmacao = await perguntarSenha("Repita a senha: ");
    if (senha !== confirmacao) {
      console.error("\n✗ As senhas não conferem.");
      process.exit(1);
    }
  }

  const { salt, hash } = criarHash(senha);
  const conta = { usuario, nome: nome || usuario, salt, hash };

  console.log("\n✓ Conta gerada. Acrescente ao vetor da variável ADMIN_USERS:\n");
  console.log(JSON.stringify(conta));
  console.log("\nCom uma conta só, o valor da variável fica assim:\n");
  console.log(JSON.stringify([conta]));
  console.log("\nNa Vercel: Settings → Environment Variables → ADMIN_USERS");
  console.log("Nunca comite este valor no repositório.\n");
})();

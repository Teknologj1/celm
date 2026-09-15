# Guia de Empresas — Centro Empresarial Liberty Mall

Site informativo, no formato "páginas amarelas", das empresas instaladas nas
Torres A e B do Centro Empresarial Liberty Mall. O objetivo é duplo: **dar
visibilidade** a cada condômino e **aumentar a sinergia** entre os vizinhos das
duas torres — quem está ao lado, o que faz e que condições oferece a quem
também trabalha no complexo.

> ⚠️ **Os dados hoje publicados são de demonstração.** As 32 empresas listadas
> são fictícias e existem apenas para mostrar o formato do guia. Substitua-as
> pela lista real (veja [Como atualizar o conteúdo](#como-atualizar-o-conteúdo))
> e desligue o aviso mudando `demoMode` para `false` em `data/centro.json`.

## O que o site tem

| Página | Endereço | O que faz |
| --- | --- | --- |
| Início | `/` | Busca, números do complexo, categorias, destaques e vantagens |
| Diretório | `/empresas/` | Lista completa com busca instantânea e filtros por torre, categoria e ordenação |
| Ficha da empresa | `/empresas/<slug>/` | Contato, localização, serviços, vantagem para condôminos e vizinhos |
| Categorias | `/categorias/` e `/categorias/<slug>/` | Navegação por área de atuação |
| Vantagens | `/vantagens/` | Todas as condições especiais oferecidas entre condôminos |
| O Centro | `/o-centro/` | Torres, estrutura, localização e contato da administração |
| Cadastro | `/cadastro/` | Formulário que gera o e-mail de cadastro para a administração |

Detalhes de implementação:

- **Busca tolerante**: ignora acentos e entende sinônimos — procurar por
  "dentista" encontra a categoria Odontologia, "contador" encontra
  Contabilidade. Também aceita "sala 1208", "torre B" e "12º andar".
- **Sem JavaScript**, o diretório continua listando todas as empresas; apenas
  os filtros deixam de funcionar.
- **SEO**: cada empresa tem página própria, com `<title>`, meta description,
  canonical, Open Graph e dados estruturados JSON-LD (`LocalBusiness`).
- **Acessibilidade**: navegação por teclado, marcos ARIA, link de pular para o
  conteúdo e contraste mínimo de 4,5:1 medido nos temas claro e escuro.
- **Tema claro e escuro** automáticos, conforme a preferência do sistema.

## Como funciona

O site é **estático**: não há servidor nem banco de dados. Um gerador em Node
(sem dependências externas) lê os arquivos JSON de `data/` e escreve o HTML
final na raiz do projeto, pronto para o GitHub Pages.

```
data/            ← a fonte da verdade (é aqui que se edita o conteúdo)
  centro.json      dados do complexo: endereço, torres, estrutura, contato
  categorias.json  áreas de atuação e sinônimos usados na busca
  empresas.json    as empresas do guia
build.js         ← gerador: lê data/ e escreve as páginas
build/
  dados.js         carrega, valida e normaliza os dados
  layout.js        cabeçalho, rodapé e <head> comuns
  paginas.js       o HTML de cada tipo de página
  verificar.js     confere links internos, títulos e metadados
assets/          ← CSS, JavaScript e imagens
index.html, empresas/, categorias/, ...   ← gerados, não edite à mão
```

### Comandos

```bash
npm run build   # gera o site a partir de data/
npm test        # verifica links internos, <h1> e meta description
npm run check   # build + verificação (o que o CI roda)
npm start       # gera e abre o site em http://localhost:8080
```

Não é preciso instalar nada: o gerador usa apenas a biblioteca padrão do Node
(versão 18 ou superior).

## Como atualizar o conteúdo

### Cadastrar uma empresa

Acrescente um objeto ao vetor em `data/empresas.json`:

```json
{
  "slug": "aurora-advocacia",
  "nome": "Aurora Advocacia",
  "categoria": "advocacia",
  "tags": ["direito empresarial", "contratos"],
  "descricao": "Uma ou duas frases sobre o que a empresa faz.",
  "torre": "A", "andar": 12, "sala": "1208",
  "telefone": "(61) 3000-1208",
  "whatsapp": "5561900001208",
  "email": "contato@empresa.com.br",
  "site": "https://empresa.com.br",
  "instagram": "@empresa",
  "horario": "Seg a sex, 9h às 18h",
  "responsavel": "Nome do responsável",
  "beneficio": "Condição especial oferecida aos condôminos.",
  "destaque": false,
  "demo": false
}
```

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| `nome`, `torre`, `categoria` | sim | `categoria` precisa existir em `categorias.json` |
| `slug` | não | gerado a partir do nome se omitido; é o endereço da página |
| `whatsapp` | não | só dígitos, com código do país: `5561900001208` |
| `beneficio` | não | preenchido, a empresa aparece na página **Vantagens** |
| `destaque` | não | `true` coloca a empresa na vitrine da página inicial |
| `demo` | não | `true` exibe a etiqueta de dado fictício |

Depois, rode `npm run build` e faça commit das alterações (incluindo o HTML
gerado).

### Trocar os dados de demonstração pelos reais

1. Substitua o conteúdo de `data/empresas.json` pelas empresas reais, com
   `"demo": false` em cada uma.
2. Confirme em `data/centro.json` o endereço, o CEP, a faixa de andares de cada
   torre, os itens de estrutura e os contatos da administração — os valores
   atuais são provisórios e precisam ser conferidos com o condomínio.
3. Mude `"demoMode": false` para retirar a tarja de demonstração do topo.
4. Atualize `"atualizadoEm"` com a data da revisão (formato `AAAA-MM-DD`); é ela
   que aparece no rodapé e no `sitemap.xml`.
5. Rode `npm run check` e faça commit.

O gerador valida os dados e interrompe o build com uma mensagem clara se uma
categoria não existir, um `slug` estiver repetido ou um campo obrigatório
faltar.

## Publicação

O workflow `.github/workflows/site.yml` roda a cada push: gera o site, verifica
os links e confere se o HTML commitado está atualizado. Quando o push é para o
branch padrão, publica automaticamente no GitHub Pages.

Para ativar na primeira vez: **Settings → Pages → Source: GitHub Actions**.

Se o endereço final não for `https://teknologj1.github.io/celm`, ajuste
`siteUrl` em `data/centro.json` — esse valor alimenta as URLs canônicas, o
`sitemap.xml` e os links absolutos da página 404.

## Evoluir para um backend

A estrutura já está preparada para isso. Toda a leitura de dados está isolada em
`build/dados.js`, na função `carregar()`: trocar os `lerJson()` por chamadas a
uma API (ou a um banco) mantém o resto do gerador intacto, desde que o formato
devolvido seja o mesmo.

Do lado do navegador, dois pontos são os candidatos naturais:

- `assets/js/diretorio.js` lê os dados de um `<script type="application/json">`
  embutido na página. Para busca no servidor, basta trocar `carregarEmpresas()`
  por um `fetch` ao endpoint.
- `assets/js/cadastro.js` monta hoje um e-mail com os dados do formulário. A
  função `coletar()` já devolve o objeto pronto para um `POST`, permitindo que
  o próprio condômino cadastre sua empresa sem intermediários.

Um caminho de migração de baixo custo é manter o site estático e acrescentar
apenas um painel de cadastro que escreva de volta em `data/empresas.json`,
disparando o build — preservando a hospedagem gratuita e o histórico de
alterações no Git.

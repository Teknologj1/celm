# Guia de Empresas — Centro Empresarial Liberty Mall

Site informativo, no formato "páginas amarelas", das empresas instaladas nas
Torres A e B do Centro Empresarial Liberty Mall. O objetivo é duplo: **dar
visibilidade** a cada condômino e **aumentar a sinergia** entre os vizinhos das
duas torres — quem está ao lado, o que faz e que condições oferece a quem
também trabalha no complexo.

As **136 empresas** publicadas são as do cadastro real do condomínio. Os
contatos passam por um filtro de privacidade antes de ir ao ar (veja
[Privacidade dos contatos](#privacidade-dos-contatos)).

## O que o site tem

| Página | Endereço | O que faz |
| --- | --- | --- |
| Início | `/` | Busca, números do complexo, categorias, destaques e vantagens |
| Diretório | `/empresas/` | Lista completa com busca instantânea e filtros por torre, categoria e ordenação |
| Ficha da empresa | `/empresas/<slug>/` | Contato, localização, serviços, vantagem para condôminos e vizinhos |
| Torres | `/torres/`, `/torres/<a\|b>/` e `/torres/<a\|b>/<categoria>/` | Busca encadeada: escolhe a torre, depois o tipo de serviço, depois a empresa |
| Categorias | `/categorias/` e `/categorias/<slug>/` | Navegação por área de atuação |
| Vantagens | `/vantagens/` | Todas as condições especiais oferecidas entre condôminos |
| O Centro | `/o-centro/` | Torres, estrutura, localização e contato da administração |
| Cadastro | `/cadastro/` | Formulário que gera o e-mail de cadastro para a administração |
| Anuncie | `/anuncie/` | Espaços publicitários disponíveis e contato comercial |
| **Painel** | `/admin/` | Área restrita: empresas (administração) e campanhas publicitárias (comercial) |

Detalhes de implementação:

- **Imagens**: o complexo tem espaço para foto de fachada (no topo da página
  inicial), foto de cada torre e uma galeria interna; cada empresa tem espaço
  para logotipo. Enquanto as fotos reais não chegam, marcadores visuais ocupam
  o lugar, com a medida recomendada escrita na própria imagem.
- **Prioridade de quem envia imagem**: na lista geral (`/empresas/` e a vitrine
  da página inicial) as empresas com logotipo aparecem primeiro, em ordem
  alfabética entre si, seguidas das demais também em ordem alfabética. Já as
  **buscas encadeadas** (torre → categoria) e as páginas de categoria usam
  ordem alfabética pura, sem privilegiar quem tem imagem.
- **Espaços publicitários** em quatro pontos do site, prontos para monetização.
- **Busca rápida de qualquer página**: pelo botão do cabeçalho, pela tecla
  `/` ou por `Ctrl/Cmd+K`. Os resultados aparecem enquanto se digita, com
  navegação por setas e `Enter` para abrir. O índice é um arquivo só
  (`assets/busca.json`), buscado na primeira abertura e reaproveitado do
  cache — embuti-lo em cada página somaria ~10 kB a toda visita e cresceria
  junto com o cadastro.
- **Movimento contido**: seções e cartões entram conforme a página rola, os
  números do topo contam até o valor e o cabeçalho ganha relevo ao sair do
  topo. Tudo isso é desligado por completo quando o sistema do visitante pede
  menos animação (`prefers-reduced-motion`), e nada depende de animação para
  funcionar.
- **Tipografia própria**: a fonte Inter é servida pelo próprio site
  (`assets/fonts/`), sem pedir nada ao Google — mais rápido e sem enviar o IP
  de quem visita a terceiros.
- **Busca encadeada (torre → tipo de serviço → empresa)**: além das páginas
  de `/torres/`, os filtros do diretório se ajustam uns aos outros — ao
  escolher a Torre B, a lista de categorias passa a mostrar apenas as que
  existem nela, com as contagens recalculadas; e ao escolher uma categoria,
  as torres sem aquela atividade aparecem zeradas e desabilitadas.
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
data/            ← a fonte da verdade (conteúdo do guia)
  centro.json      dados do complexo: endereço, torres, estrutura, imagens, contato
  categorias.json  áreas de atuação e sinônimos usados na busca
  empresas.json    as empresas do guia
  anuncios.json    os espaços publicitários e as campanhas em cartaz
build.js         ← gerador: lê data/ e escreve as páginas
build/
  dados.js         carrega, valida e normaliza os dados
  layout.js        cabeçalho, rodapé e <head> comuns
  paginas.js       o HTML de cada tipo de página
  verificar.js     confere links internos, títulos e metadados
assets/          ← CSS, JavaScript, fontes e imagens
admin/           ← painel da administração (login e tela de cadastro)
api/             ← funções da Vercel que atendem o painel
  login.js, logout.js, sessao.js, empresas.js, anuncios.js
  _lib/            autenticação, armazenamento e validação
scripts/
  dev.js           servidor local com site + API
  criar-usuario.js gera a conta de acesso ao painel (com o perfil)
```

As páginas HTML (`index.html`, `empresas/`, `categorias/`…) **não são
versionadas**: cada publicação reconstrói o site a partir de `data/`. Isso é o
que permite ao painel alterar só os dados e o site sair atualizado.

### Comandos

```bash
npm run build   # gera o site a partir de data/
npm test        # verifica links internos, <h1> e meta description
npm run check   # build + verificação (o que o CI roda)
npm start       # gera e abre o site em http://localhost:8080
npm run dev     # site + painel em http://localhost:3000 (com API)
npm run usuario # cria uma conta de acesso ao painel
```

`npm run dev` sobe o site e as funções da API no mesmo processo, gravando nos
arquivos de `data/` — nada é enviado ao GitHub. É o modo de trabalho local.

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
  "logo": "assets/img/empresas/aurora-advocacia.svg",
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
| `logo` | não | caminho do logotipo; **com logo, a empresa sobe na lista geral** |
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

## Imagens

### Fotos do complexo

Ficam em `assets/img/complexo/` e são declaradas em `data/centro.json`, no
objeto `imagens` (fachada e galeria) e em `torres[].imagem`. Hoje são
marcadores de espaço; substitua cada arquivo por uma foto real mantendo o
mesmo nome, ou aponte para outro arquivo no JSON.

| Onde aparece | Arquivo atual | Medida sugerida |
| --- | --- | --- |
| Topo da página inicial | `complexo/fachada.svg` | 1600×900 |
| Cartão e página de cada torre | `complexo/torre-a.svg`, `torre-b.svg` | 1200×800 |
| Galeria em "O Centro" | `complexo/hall.svg` e outros | 1200×800 |

A foto do topo recebe um véu escuro por cima para que o título continue
legível — o contraste medido hoje é de 11,9:1. Ainda assim, prefira uma
imagem que não seja predominantemente clara no lado esquerdo.

### Logotipos das empresas

Ficam em `assets/img/empresas/` e são apontados pelo campo `logo`. O formato
quadrado (400×400, PNG ou SVG) é o que melhor se encaixa no cartão e na ficha.

Empresa sem `logo` não fica sem nada: o site desenha um monograma com as
iniciais dela. Mas **só quem envia imagem aparece primeiro na lista geral** —
é o incentivo para que os condôminos mandem o material.

## Espaços publicitários

São quatro, definidos em `data/anuncios.json`:

| `espaco` | Onde aparece |
| --- | --- |
| `home` | Faixa na página inicial, abaixo das categorias |
| `diretorio` | Ao final da lista de resultados do diretório |
| `empresa` | Bloco na lateral de cada ficha de empresa |
| `torre` | Faixa ao final das páginas de torre e de categoria |

### Colocar uma campanha no ar pelo painel

É o caminho normal, e não exige mexer em arquivo: entre em `/admin/` com a
conta `comercial`, abra a aba **Anúncios** e cada um dos quatro espaços
aparece como um cartão, com etiqueta de estado — `NO AR`, `LIVRE`,
`AGENDADO` ou `ENCERRADO`. Em **Editar campanha** entram título, texto,
imagem, link e anunciante, mais o período (`início` e `fim`, ambos
opcionais). **Tirar do ar** desliga sem apagar o que foi preenchido, de modo
que a mesma campanha volta depois com um clique.

O período é respeitado na geração do site: uma campanha ativa mas fora da
janela não aparece em nenhuma página. Dá para preparar a campanha do mês
seguinte hoje e deixá-la entrar sozinha — lembrando que, como o site é
estático, a virada só acontece na próxima publicação.

A API valida antes de gravar: campanha no ar sem título é recusada, período
invertido (fim antes do início) é recusado, e link que não comece com
`http://` ou `https://` é recusado.

### Ou direto no arquivo

Preencha o registro correspondente em `data/anuncios.json` e marque
`"ativo": true`:

```json
{
  "id": "home-destaque",
  "espaco": "home",
  "ativo": true,
  "titulo": "Título da campanha",
  "texto": "Uma linha de apoio.",
  "imagem": "assets/img/anuncios/campanha.png",
  "link": "https://anunciante.com.br",
  "anunciante": "Nome do anunciante"
}
```

Enquanto nenhum anúncio está ativo, o espaço mostra um convite para anunciar,
que leva à página `/anuncie/` — o layout nunca fica com um buraco. Para ocultar
os espaços vazios, mude `publicidade.mostrarEspacosVazios` para `false` em
`data/centro.json`; ali também fica o e-mail comercial exibido na página.

Os blocos são marcados como "Publicidade" e os links levam `rel="sponsored"`,
como manda a recomendação do Google para conteúdo pago.

### Tabela de referência

Os valores ficam em `data/anuncios.json`, no bloco `tabela` de cada espaço, e
são o que a página `/anuncie/` exibe. A tabela em uso:

| Espaço | Onde aparece | Mensal | Trimestral | Semestral |
| --- | --- | --- | --- | --- |
| Faixa da página inicial | Início, abaixo das categorias | R$ 390 | R$ 1.050 | R$ 1.950 |
| Cartão no diretório | Dentro da lista de empresas | R$ 290 | R$ 780 | R$ 1.450 |
| Bloco nas fichas | Lateral das 136 fichas de empresa | R$ 240 | R$ 650 | R$ 1.200 |
| Faixa de torre e categoria | Final das páginas de torre e categoria | R$ 190 | R$ 510 | R$ 950 |

Condôminos do complexo têm **30% de desconto** (`publicidade.descontoCondomino`).
O contato comercial exibido no site é `publicidade.contato`, hoje
**contato@teknologji.com.br**, sob responsabilidade da Teknologji.

> **De onde vêm esses números.** Não existe tabela pública de preços para
> espaço publicitário em guia de condomínio empresarial — a pesquisa só
> encontrou referências de mídia indoor (softwares de mídia em tela, a partir
> de R$ 25–50 por tela/mês; locação de painel de LED na faixa de R$ 2.000/mês;
> outdoor digital a partir de R$ 5.000/mês), que têm audiência e custo
> operacional muito diferentes. A tabela acima é, portanto, um **ponto de
> partida fundamentado**, posicionado bem abaixo da mídia indoor do próprio
> shopping e calibrado para caber no orçamento de uma empresa de uma sala.
> O caminho é validar na prática: as três primeiras campanhas e a audiência
> medida dizem se o valor sobe ou desce. `publicidade.vigencia` registra a
> data da tabela, para que ela seja revista sem constrangimento.

## Painel da administração

Em `/admin/`, a administração inclui, edita e remove empresas pelo navegador,
sem precisar mexer em arquivo nenhum. Cada alteração vira um **commit** em
`data/empresas.json` e dispara a republicação do site — em torno de um minuto
até aparecer no ar.

O histórico do Git é a auditoria: dá para ver quem alterou o quê, quando, e
reverter qualquer edição.

### Dois perfis de acesso

Cada conta tem um `papel`, e o painel mostra só o que aquele papel pode fazer:

| Papel | Quem usa | O que acessa |
| --- | --- | --- |
| `administracao` | Administração do Liberty Mall | Apenas **Empresas**: incluir, editar e remover condôminos |
| `comercial` | Teknologji | **Empresas** e **Anúncios**: além do cadastro, coloca e tira campanhas do ar |

A separação não é só visual. A aba "Anúncios" fica oculta para quem é
`administracao`, e a API recusa a rota `/api/anuncios` para esse papel —
leitura e escrita — com `403`. Quem não informa papel ao criar a conta entra
como `administracao`, o perfil de menos poder.

O painel descobre o papel em `/api/sessao`, que devolve `papel` e
`podeAnunciar` junto com o nome de quem entrou.

### Como funciona a segurança

- Senhas guardadas com **PBKDF2-SHA256, 600 mil iterações** (sal por conta),
  nunca em texto.
- Sessão em cookie `HttpOnly`, `Secure`, `SameSite=Strict`, válida por 8 horas.
- Toda rota da API exige sessão — inclusive a de leitura.
- Escritas só são aceitas vindas da própria origem do site (defesa contra CSRF).
- Usuário inexistente e senha errada devolvem a mesma mensagem, para não
  revelar quais contas existem.
- Oito tentativas erradas bloqueiam aquele usuário e IP por 15 minutos.

Duas limitações que convém conhecer:

1. O bloqueio por tentativas vive na memória da instância. Com várias
   instâncias ativas, o limite é por instância — o custo da derivação da senha
   é a defesa principal contra força bruta.
2. O HTML do painel é público (só o conteúdo é protegido). Isso é intencional:
   o que guarda os dados é a API, não a página.

### Criar uma conta de acesso

Abra **`/admin/nova-conta.html`** no site publicado. A página gera tudo o que
as variáveis de ambiente precisam:

- `SESSION_SECRET`, já sorteado;
- `ADMIN_USERS`, com uma ou várias contas.

Na página escolhe-se também o **perfil** da conta — "Administração (empresas)"
ou "Comercial (empresas e anúncios)" —, que é o que define o que aquela pessoa
vê no painel.

O cálculo acontece dentro do navegador, pela Web Crypto — a senha não é
enviada a lugar nenhum (dá para conferir na aba de rede: nenhuma requisição
sai). O que se copia é só o resultado derivado, do qual não se recupera a
senha.

A página não cria a conta sozinha: ela só produz o texto. Quem ativa o acesso
é quem cola o valor na Vercel e publica de novo.

> Na primeira vez, o site precisa estar publicado para você abrir essa página.
> É esperado: faça o deploy sem as variáveis, gere as contas, salve e publique
> de novo. Enquanto `ADMIN_USERS` estiver vazio, a tela de entrada avisa
> exatamente isso.

Quem preferir o terminal tem o mesmo resultado por linha de comando:

```bash
npm run usuario sindico "Maria Silva"                      # administração
npm run usuario comercial "Teknologji" comercial           # empresas + anúncios
```

O terceiro argumento é o papel; omitido, a conta sai como `administracao`.

**Nunca comite esses valores**: o repositório é público, e um hash versionado é
material para ataque offline.

Para remover o acesso de alguém, tire o objeto do vetor em `ADMIN_USERS` e
publique de novo.

### Trocar a própria senha

Quem já está no painel troca a própria senha pelo botão **Trocar senha**, sem
depender de quem administra a Vercel. É preciso informar a senha atual — assim
uma sessão esquecida aberta não vira porta para tomar a conta.

Como isso funciona por baixo: uma função serverless não consegue alterar a
variável `ADMIN_USERS`, então a senha nova é guardada em
`data/contas.enc.json`, no próprio repositório. Como o repositório é público, o
arquivo vai **cifrado com AES-256-GCM**, com a chave derivada do
`SESSION_SECRET` — que só existe no servidor. Quem abrir o arquivo encontra
bytes embaralhados.

Na hora de entrar, valem as contas de `ADMIN_USERS` com as senhas desse cofre
sobrepostas.

Duas consequências a conhecer:

1. **Trocar o `SESSION_SECRET` torna o cofre ilegível** e as senhas voltam a
   ser as de `ADMIN_USERS`. É um retorno seguro — ninguém fica trancado para
   fora — mas surpreende quem não souber.
2. Trocar a senha **não encerra as sessões já abertas**, porque elas são
   assinadas pelo `SESSION_SECRET`, não pela senha. Para derrubar todas,
   troque o `SESSION_SECRET`.

### Sobre o algoritmo das senhas

As senhas são derivadas com **PBKDF2-SHA256, 600 mil iterações** (recomendação
do OWASP), com sal próprio por conta. A escolha do PBKDF2 em vez do scrypt tem
um motivo prático: ele existe tanto no Node quanto na Web Crypto do navegador,
que é o que permite gerar contas sem a senha sair do computador de quem cria.

O scrypt resiste melhor a ataques com hardware dedicado; se em algum momento
isso pesar mais que a conveniência, contas no formato antigo continuam
funcionando — o campo `algoritmo` de cada conta diz como verificá-la.

## Privacidade dos contatos

O cadastro trouxe, na maioria dos casos, celular pessoal e e-mail de provedor
(`gmail`, `hotmail`) como contato das empresas. Publicar isso num site aberto
expõe a pessoa física, não só a empresa — e o consentimento recolhido no
formulário falava em divulgação "nas redes sociais e no grupo de WhatsApp do
condomínio", não num site indexável.

O que é publicado se controla em `data/centro.json`, no campo
`privacidade.contatos`:

| Valor | O que acontece |
| --- | --- |
| `todos` | Publica tudo o que foi cadastrado |
| `institucionais` *(em uso)* | O celular deixa de aparecer como texto — fica só o botão de WhatsApp, que não é indexado nem raspado como número; e-mail de provedor pessoal não é publicado |
| `restrito` | Celular e e-mail de provedor pessoal não são publicados de forma alguma |

Com `institucionais`, nenhuma das 136 empresas fica sem forma de contato:
todas mantêm o botão de WhatsApp, 8 exibem telefone fixo e 19 exibem e-mail de
domínio próprio. Com `restrito`, 40 empresas ficariam sem nenhum canal.

O filtro vale para o que o site publica. Os dados completos continuam em
`data/empresas.json`, que é o que a administração vê e edita pelo painel.

> **O repositório precisa ser privado.** `data/empresas.json` guarda os
> contatos como foram cadastrados, e num repositório público qualquer pessoa
> os lê direto do GitHub, sem passar pelo site. A Vercel constrói normalmente
> a partir de um repositório privado — é só mudar a visibilidade em
> **Settings → General → Change repository visibility**. Enquanto isso não for
> feito, o filtro protege o site, mas não a fonte.

## Publicação na Vercel

O projeto já vem com `vercel.json`. Ao importar o repositório, a Vercel usa
`node build.js --out dist` como build e serve `dist/`, com as funções de `api/`
atendendo o painel.

### Variáveis de ambiente obrigatórias

Em **Settings → Environment Variables**, para os ambientes Production e Preview:

| Variável | O que é | Como obter |
| --- | --- | --- |
| `SESSION_SECRET` | Chave que assina os cookies de sessão | `openssl rand -base64 48` |
| `ADMIN_USERS` | Contas do painel, em JSON | `npm run usuario` |
| `GITHUB_TOKEN` | Token com permissão de gravar no repositório | Veja abaixo |
| `GITHUB_REPO` | `dono/repositorio` | Ex.: `Teknologj1/celm` |
| `GITHUB_BRANCH` | Branch que o site publica | Ex.: `main` |
| `SITE_URL` | Endereço final do site | Ex.: `https://celm.com.br` |

`SITE_URL` é opcional, mas sem ela o endereço canônico, o `sitemap.xml` e o
`robots.txt` continuam apontando para o GitHub Pages — o que confunde o Google
quando o site oficial passa a ser outro.

O token deve ser um **fine-grained personal access token** restrito a este
repositório, com a permissão **Contents: Read and write** — nada além disso.
Defina uma validade e anote a data de renovação; quando ele expira, o painel
para de salvar e devolve "o servidor não tem permissão de gravação".

Trocar `SESSION_SECRET` derruba todas as sessões abertas — é o jeito rápido de
expulsar todo mundo caso desconfie de algum acesso.

### Depois do deploy

1. Abra `https://<seu-dominio>/admin/` e entre com a conta criada.
2. Inclua uma empresa de teste e confira se o commit apareceu no repositório.
3. Espere a republicação e veja a empresa no site.
4. Remova a empresa de teste.

Enquanto o site também estiver no GitHub Pages, as duas publicações convivem:
o Pages reconstrói pelo workflow, a Vercel pelo próprio build. O painel só
existe na Vercel, porque o Pages não executa funções.

## Publicação no GitHub Pages

O workflow `.github/workflows/site.yml` roda a cada push: gera o site, verifica
os links e confere se o HTML commitado está atualizado. Quando o push é para o
branch padrão, publica automaticamente no GitHub Pages.

**Antes do primeiro deploy, ligue o Pages à mão:** em **Settings → Pages →
Source**, escolha **GitHub Actions**. Sem isso o job de publicação falha com
`Get Pages site failed`, embora o de build e verificação continue passando.

Esse passo não dá para automatizar: criar o site do Pages exige permissão de
administração do repositório, que o `GITHUB_TOKEN` do workflow não tem —
`enablement: true` devolve `Resource not accessible by integration`.

Se o endereço final não for `https://teknologj1.github.io/celm`, ajuste
`siteUrl` em `data/centro.json` — esse valor alimenta as URLs canônicas, o
`sitemap.xml` e os links absolutos da página 404.

## Próximos passos possíveis

O painel hoje cobre o cadastro de empresas e as campanhas publicitárias. A mesma estrutura atende, sem
mudança de arquitetura:

- **Categorias e dados do complexo** pelo painel: cada um é outro arquivo em
  `data/`, e `api/_lib/armazenamento.js` já sabe gravar qualquer um deles — é
  o mesmo caminho que os anúncios já seguem.
- **Envio de logotipo pelo navegador**, gravando a imagem no repositório pela
  mesma API — hoje o painel recebe o caminho do arquivo.
- **Cadastro pelo próprio condômino**, com a solicitação entrando numa fila que
  a administração aprova antes de publicar.
- **Banco de dados**, se o volume crescer: trocar o backend em
  `api/_lib/armazenamento.js` não afeta nem o painel nem o gerador.

Se um dia o site sair do modelo estático, o ponto de troca do lado público é
`assets/js/diretorio.js`, que lê os dados de um `<script type="application/json">`
embutido na página e passaria a consumir um endpoint.

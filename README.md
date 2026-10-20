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
| O Centro | `/o-centro/` | Torres, estrutura, localização, contato da administração e o **boletim informativo** |
| Cadastro | `/cadastro/` | Formulário que gera o e-mail de cadastro para a administração |
| Anuncie | `/anuncie/` | Espaços publicitários disponíveis e contato comercial |
| **Painel** | `/admin/` | Área restrita: empresas e boletim (administração) e campanhas publicitárias (comercial) |

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
- **Tipografia própria**: Inter (texto) e Instrument Serif (títulos) são
  servidas pelo próprio site (`assets/fonts/`), sem pedir nada ao Google —
  mais rápido e sem enviar o IP de quem visita a terceiros. As duas são
  licenciadas sob a SIL Open Font License; o texto de cada licença está ao
  lado dos arquivos.
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
- **Boletim informativo em PDF**, lido dentro da própria página (veja
  [Boletim informativo](#boletim-informativo)).
- **Menu enxuto**: cinco itens, e "Vantagens" só entra quando existe ao menos
  uma condição cadastrada — item de menu que leva a página vazia é promessa
  não cumprida. "Anuncie" fica no rodapé e em cada espaço publicitário livre,
  que é onde um anunciante repara.
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
  espacos.json     os quatro espaços publicitários: formato, limite e preço
  anuncios.json    as campanhas em cartaz, cada uma num espaço
  boletins.json    as edições do boletim informativo
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
  boletins.js, arquivos.js   edições do boletim e envio de PDF/imagem
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
  "capa": "assets/img/empresas/aurora-advocacia-capa.jpg",
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
| `logo` | não | caminho do logotipo, enviado pelo painel; **com logo, a empresa sobe na lista geral** |
| `capa` | não | imagem deitada que entra como fundo do cabeçalho do cartão |
| `descricao` | sim | até 220 caracteres: o cartão mostra três linhas |
| `demo` | não | `true` exibe a etiqueta de dado fictício |

Depois, rode `npm run build` e faça commit das alterações (incluindo o HTML
gerado).

### O que ainda precisa ser conferido com o condomínio

As empresas já são as reais, importadas do cadastro. Continuam provisórios em
`data/centro.json`: o endereço completo, o CEP, a faixa de andares de cada
torre, os itens de estrutura e os contatos da administração. Ao revisar,
atualize `"atualizadoEm"` (formato `AAAA-MM-DD`) — é essa data que aparece no
rodapé e no `sitemap.xml`.

O gerador valida os dados e interrompe o build com uma mensagem clara se uma
categoria não existir, um `slug` estiver repetido ou um campo obrigatório
faltar.

## Imagens

### Peso e formato

O site **não redimensiona nem comprime** nada: a imagem vai ao ar como foi
enviada. Por isso as medidas e os pesos recomendados são publicados onde quem
envia vai ler — em `/anuncie/` para as peças publicitárias e em `/cadastro/`
para as imagens das empresas — e repetidos nas dicas do painel.

| Imagem | Medida | Peso | Formato |
| --- | --- | --- | --- |
| Logotipo da empresa | 400 × 400 px | até 60 kB | SVG; PNG se precisar de transparência |
| Capa da empresa | 800 × 450 px | até 120 kB | WEBP; JPG serve |
| Faixa (home, torre) | 970 × 250 px | até 150 kB | WEBP, PNG, JPG ou SVG |
| Cartão no diretório | 600 × 400 px | até 100 kB | WEBP, PNG, JPG ou SVG |
| Bloco nas fichas | 300 × 250 px | até 80 kB | WEBP, PNG, JPG ou SVG |
| Peça animada | a do espaço | até 500 kB | MP4, WEBM ou WEBP animado (**GIF recusado**) |

### Animação sem peso

A mesma animação de 3 segundos em 970×250, medida nos quatro formatos:

| Formato | Peso | Relação |
| --- | --- | --- |
| GIF | 1.260 kB | — |
| WEBP animado | 398 kB | 3× menor |
| MP4 (H.264) | 108 kB | 12× menor |
| WEBM (VP9) | 108 kB | 12× menor |

**GIF animado é recusado no envio**, com a razão e a saída na mensagem: doze
vezes o peso para o mesmo movimento é diferença que o visitante paga no 4G.
Peça em `.mp4` ou `.webm` é publicada como `<video muted loop playsinline>` —
sem som, em laço e sem controles, ela se comporta como animação, não como
filme.

Três cuidados fazem a animação não custar o que parece:

1. **Só a peça em cartaz é baixada.** Num espaço com dez campanhas, dar `src`
   às dez faria o visitante baixar dez peças para ver uma. A primeira vem com
   `src` de verdade — é a que aparece sem JavaScript — e as demais carregam no
   instante em que o rodízio as mostra. Medido com três campanhas (1,26 MB de
   GIF + 110 kB de vídeo): cada visita pede **uma**, nunca as três.
2. **Vídeo fora da tela fica parado.** Animação que ninguém vê custa
   processador e, no celular, bateria.
3. **Com `prefers-reduced-motion`, o vídeo não começa** — fica no primeiro
   quadro, como qualquer outra animação do site.

O painel **avisa, sem recusar**, quando o arquivo passa do recomendado: a
imagem pode ser legítima e grande, mas quem publica merece saber que acabou de
deixar a página mais lenta. O teto rígido continua sendo 3 MB, que é o que o
corpo da função da Vercel comporta.

Os textos saem de `data/centro.json` (`imagens.especificacoes`) e do bloco
`arquivo` de cada espaço em `data/espacos.json`.

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
No painel, o arquivo é escolhido dentro da própria ficha da empresa: enviar
pelo GitHub e depois digitar o caminho não é mais necessário.

Além do logotipo, cada empresa pode ter uma **capa**: uma imagem deitada
(800×450) que entra como fundo atrás da categoria, do nome e do próprio
logotipo — no cartão do diretório e no topo da ficha da empresa.

Um véu escuro é aplicado por cima, e ele escurece mais o lado onde fica o
texto: num retrato com o rosto claro à direita, um degradê só vertical
deixaria o título sobre a parte iluminada. Medido sobre uma foto real, o
título fica em 17:1 e o resumo em 11,7:1.

> Enviar o arquivo e salvar a ficha são dois passos. O envio já grava a
> imagem no repositório, mas a empresa só passa a apontar para ela quando a
> ficha é salva — por isso o aviso do campo diz "salve para publicar".

A descrição é limitada a **220 caracteres** e o cartão mostra três linhas. Não
é capricho tipográfico: sem limite, uma empresa com três parágrafos estica a
fileira inteira da grade e as outras ficam com um vão branco embaixo. O
formulário do painel mostra o contador enquanto se escreve.

Empresa sem `logo` não fica sem nada: o site desenha um monograma com as
iniciais dela. Mas **só quem envia imagem aparece primeiro na lista geral** —
é o incentivo para que os condôminos mandem o material.

## Boletim informativo

A administração publica cada edição em `/admin/` → aba **Boletim**: título,
data, um resumo de uma linha e o PDF. O arquivo sobe pelo próprio painel —
não é preciso saber caminho de pasta nem mexer no repositório.

A edição mais recente aparece aberta dentro da página **O Centro**, com as
anteriores listadas abaixo; clicar em uma troca o que está sendo lido sem sair
da página. No rodapé há um atalho direto, e a seção só existe no site depois
da primeira edição.

### Por que o PDF é desenhado, e não embutido

O leitor usa o [pdf.js](https://mozilla.github.io/pdf.js/) (servido pelo
próprio site, em `assets/vendor/pdfjs/`) para desenhar as páginas em `canvas`.
É mais trabalho do que jogar o arquivo num `<iframe>`, e é o que faz o boletim
ser legível no celular: o Chrome do Android oferece baixar em vez de exibir, e
o Safari do iPhone mostra só a primeira página, sem rolagem. Desenhando, o
comportamento é o mesmo em todo lugar e o condômino não instala nada.

O custo é 1,7 MB de biblioteca, então ela só é buscada quando a seção se
aproxima da tela — quem não rola até lá não paga por ela. Enquanto carrega, e
se algo falhar, o link para o PDF continua na página: o leitor é uma
comodidade, nunca a única porta.

| Limite | Valor | Por quê |
| --- | --- | --- |
| Tamanho do PDF | 3 MB | A Vercel recusa corpos acima de 4,5 MB e o base64 engorda o arquivo em um terço |
| Formato | PDF | Conferido pelo conteúdo (`%PDF-`), não só pela extensão |

PDF acima de 3 MB quase sempre é imagem não comprimida; comprimir antes de
enviar resolve e ainda deixa a leitura mais rápida para quem está no 4G.

### Envio de arquivos

`api/arquivos.js` atende o boletim, a peça dos anúncios e o logotipo das
empresas — nos três casos basta escolher o arquivo na própria tela. O arquivo
viaja em base64 dentro do JSON — dispensa `multipart` na função serverless — e
é gravado no repositório como qualquer outra alteração do painel, virando um
commit. O nome é normalizado (sem acento, sem espaço, sem caminho) e recebe a
data como prefixo, de modo que uma edição nova nunca sobrescreve a anterior.

## Espaços publicitários

São quatro lugares fixos no site. Cada um comporta **várias campanhas em
rodízio**: elas ocupam o mesmo espaço e se revezam por tempo.

| `espaco` | Onde aparece | Campanhas | Troca | Peça |
| --- | --- | --- | --- | --- |
| `home` | Faixa na página inicial, abaixo das categorias | até 5 | 8 s | 970×250, até 150 kB |
| `diretorio` | Ao final da lista de resultados do diretório | até 10 | 9 s | 600×400, até 100 kB |
| `empresa` | Bloco na lateral de cada ficha de empresa | até 10 | 10 s | 300×250, até 80 kB |
| `torre` | Faixa ao final das páginas de torre e de categoria | até 15 | 10 s | 970×250, até 150 kB |

As medidas e os pesos ficam no bloco `arquivo` de cada espaço e são o que a
página `/anuncie/` publica — mudar a recomendação é mudar um número no JSON,
não um texto espalhado por páginas.

Essa separação é o que mantém a manutenção simples:

- **`data/espacos.json`** descreve os lugares — nome, formato, limite,
  intervalo do rodízio e tabela de preços. É estrutura do site e **não muda
  pelo painel**: mudar o limite de um espaço, ou o tempo de troca, é editar um
  número aqui.
- **`data/anuncios.json`** é a lista de campanhas, cada uma apontando para um
  `espaco`. É o que o painel grava.

### Como o rodízio funciona

Todas as campanhas do espaço vão no HTML; o script apenas escolhe qual está
visível. Três decisões que não são óbvias e que estão no código:

1. **O início é sorteado a cada visita.** Se todos começassem pela primeira,
   quem fosse cadastrado primeiro levaria quase toda a audiência — a maioria
   das visitas dura menos que um ciclo completo. Sorteando, as campanhas do
   mesmo espaço se aproximam da mesma exposição.
2. **O relógio para quando o espaço não está na tela** e quando a aba está em
   segundo plano. Girar campanha que ninguém vê gasta exibição e, no celular,
   bateria.
3. **Passar o mouse ou focar com o teclado congela a troca.** Trocar o anúncio
   debaixo do cursor é o jeito mais certo de o clique cair no anunciante
   errado.

Com até 8 campanhas o espaço mostra marcadores clicáveis; acima disso, um
contador (`3 de 12`) — quinze bolinhas viram uma régua ilegível e estouram a
largura do celular. Sem JavaScript, a primeira campanha continua aparecendo:
ninguém fica fora do ar por causa de um script que não rodou.

### Colocar uma campanha no ar pelo painel

Entre em `/admin/` com a conta `comercial` e abra a aba **Anúncios**. Cada
espaço é um cartão com as campanhas dentro, o selo `3 de 10` dizendo quantas
estão no ar e **+ Nova campanha** no rodapé. Em cada campanha há **Editar**,
**Desligar** (sai do rodízio sem perder o que foi preenchido) e **Remover**.

O formulário pede o **anunciante** (obrigatório, mas só para o painel — não
aparece no site), o link, o período (`início` e `fim`, ambos opcionais) e a
**peça**, enviada ali mesmo. A **chamada** é opcional: quando preenchida,
aparece como uma linha acima da imagem ou do vídeo; em branco, o visitante vê
só a peça.

### A peça é o anúncio

Não se desenha moldura em volta dela — nem título, nem texto de apoio, nem o
nome de quem anuncia. Quem fez a arte já disse o que queria dizer, e repetir
ao lado rouba espaço e atenção.

A peça ocupa a largura do espaço, limitada à largura para a qual foi feita:
esticar uma arte de 970 px até 1.200 px só a deixa borrada. Abaixo disso ela
encolhe junto com a tela.

Uma campanha só vai ao ar com peça enviada; sem ela não há o que mostrar.
Salvar como rascunho (desligada) continua valendo, para preparar antes de
receber o material.

O período é respeitado na geração do site: campanha ativa mas fora da janela
não ocupa vaga nem aparece. Dá para deixar a campanha do mês que vem pronta
sem travar a deste mês — lembrando que, como o site é estático, a virada só
acontece na próxima publicação.

A API valida antes de gravar: campanha sem anunciante é recusada, campanha no
ar sem peça é recusada, período invertido é recusado, link que não comece com
`http://` ou `https://` é recusado, e passar do limite do espaço devolve
*"espaço lotado"* dizendo quantas cabem.

### Ou direto no arquivo

Acrescente um registro ao vetor em `data/anuncios.json`. O `id` é livre; o
painel gera um a partir do anunciante:

```json
{
  "id": "home-clinica-sorriso",
  "espaco": "home",
  "ativo": true,
  "anunciante": "Nome do anunciante",
  "chamada": "",
  "imagem": "assets/img/anuncios/campanha.png",
  "link": "https://anunciante.com.br",
  "inicio": "2026-11-01",
  "fim": "2026-11-30"
}
```

`anunciante` é obrigatório e **não** vai para a tela; `chamada` é opcional e
aparece acima da peça.

Enquanto nenhum anúncio está ativo, o espaço mostra um convite para anunciar,
que leva à página `/anuncie/` — o layout nunca fica com um buraco. Para ocultar
os espaços vazios, mude `publicidade.mostrarEspacosVazios` para `false` em
`data/centro.json`; ali também fica o e-mail comercial exibido na página.

Os blocos são marcados como "Publicidade" e os links levam `rel="sponsored"`,
como manda a recomendação do Google para conteúdo pago.

### Tabela de referência

Os valores ficam em `data/espacos.json`, no bloco `tabela` de cada espaço.
**Eles não são publicados**: a página `/anuncie/` fala em formato, medida e
disponibilidade, e o valor é combinado por e-mail. A tabela serve de
referência interna na hora de responder:

| Espaço | Onde aparece | Mensal | Trimestral | Semestral |
| --- | --- | --- | --- | --- |
| Faixa da página inicial | Início, abaixo das categorias | R$ 390 | R$ 1.050 | R$ 1.950 |
| Cartão no diretório | Dentro da lista de empresas | R$ 290 | R$ 780 | R$ 1.450 |
| Bloco nas fichas | Lateral das 136 fichas de empresa | R$ 240 | R$ 650 | R$ 1.200 |
| Faixa de torre e categoria | Final das páginas de torre e categoria | R$ 190 | R$ 510 | R$ 950 |

O desconto de condômino **continua publicado** — é argumento de venda, não
preço: `publicidade.descontoCondomino`, hoje 30%. O contato comercial exibido
no site é `publicidade.contato`, hoje **contato@teknologji.com.br**, sob
responsabilidade da Teknologji.

O limite de campanhas por espaço e o intervalo do rodízio também saíram da
página: são controles internos, que o anunciante não precisa conhecer para
decidir. Continuam valendo no painel e na geração do site.

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
| `administracao` | Administração do Liberty Mall | **Empresas** e **Boletim**: cadastro dos condôminos e publicação das edições |
| `comercial` | Teknologji | Tudo o que a administração faz, mais **Anúncios**: coloca e tira campanhas do ar |

A separação não é só visual. A aba "Anúncios" fica oculta para quem é
`administracao`, e a API recusa a rota `/api/anuncios` para esse papel —
leitura e escrita — com `403`; o mesmo vale para enviar peça de anúncio por
`/api/arquivos`. O boletim é tarefa do condomínio, então basta estar
autenticado. Quem não informa papel ao criar a conta entra
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

## Integração contínua

O workflow `.github/workflows/site.yml` roda a cada push: gera o site e
verifica os links internos, os `<h1>` e as meta descriptions. Ele não publica
nada — quem publica é a Vercel, a partir do próprio repositório.

> O site chegou a sair também pelo GitHub Pages. Com o repositório privado
> isso deixou de ser possível: no plano Free, o Pages só publica de
> repositório público, e o job passaria a falhar a cada push. Como o endereço
> oficial já é o da Vercel — e só lá o painel funciona, porque o Pages não
> executa funções —, o job foi retirado em vez de mantido vermelho.

## Próximos passos possíveis

O painel hoje cobre o cadastro de empresas, o boletim informativo e as
campanhas publicitárias. A mesma estrutura atende, sem
mudança de arquitetura:

- **Categorias e dados do complexo** pelo painel: cada um é outro arquivo em
  `data/`, e `api/_lib/armazenamento.js` já sabe gravar qualquer um deles — é
  o mesmo caminho que os anúncios e o boletim já seguem.
- **Cadastro pelo próprio condômino**, com a solicitação entrando numa fila que
  a administração aprova antes de publicar.
- **Banco de dados**, se o volume crescer: trocar o backend em
  `api/_lib/armazenamento.js` não afeta nem o painel nem o gerador.

Se um dia o site sair do modelo estático, o ponto de troca do lado público é
`assets/js/diretorio.js`, que lê os dados de um `<script type="application/json">`
embutido na página e passaria a consumir um endpoint.

# Heartopia Songs

[![CI](https://github.com/mateusbpt/heartopia-songs/actions/workflows/ci.yml/badge.svg)](https://github.com/mateusbpt/heartopia-songs/actions/workflows/ci.yml)

**[▶ Abrir o app](https://heartopia-songs.netlify.app)**

Converte a notação de letras do [noobnotes.net](https://noobnotes.net) na sequência de teclas do
piano do [Heartopia](https://heartopia.xd.com). Cole o link de uma música e a app busca, transpõe pro
alcance do piano do jogo e mostra as teclas — com um teclado que destaca a próxima tecla, letra
sincronizada, prévia com som e metrônomo pra acompanhar o tempo.

Interface com a cara do jogo: paleta rosa pastel, teclado no estilo das teclas creme sobre a bandeja
rosewood, música em polaroid e a sequência numa página de caderno.

## Rodando local

```bash
pnpm install
pnpm dev
```

Abre em `http://localhost:3000`. Stack: Next.js (App Router) + React + Tailwind CSS v4, com
[cheerio](https://cheerio.js.org) pra parsear a página do noobnotes no servidor.

## O piano

São 22 teclas diatônicas cobrindo C3–C6. Não existem sustenidos nem bemóis.

| Fileira | Teclas          | Oitava | Notação noobnotes |
| ------- | --------------- | ------ | ----------------- |
| Grave   | `Z X C V B N M` | 3      | `.C` … `.B`       |
| Média   | `A S D F G H J` | 4      | `C` … `B`         |
| Aguda   | `Q W E R T Y U` | 5      | `^C` … `^B`       |
| Extra   | `I`             | 6      | `*C` (só o DO)    |

As fileiras seguem notação numérica (jianpu): ponto abaixo do número é oitava grave, ponto acima é
aguda, dois pontos acima é duas oitavas acima.

## Notação do noobnotes

A oitava vem como prefixo — `_` (2), `.` (3), nenhum (4), `^` (5), `*` (6) — e o acidente como
sufixo `#`/`b`. As letras são sempre maiúsculas, então um `b` no fim é sempre bemol, nunca a nota B.

O site serve as notas como **texto puro**; é o JavaScript dele que envolve cada nota num `<span>`
depois. Por isso [`app/api/song/route.ts`](app/api/song/route.ts) lê o texto de `.post-content` e
separa linhas de notas de linhas de letra: uma linha só é de notas se não sobrar nada além de tokens
de nota e pontuação. A rota trava o host em `noobnotes.net` pra não virar um proxy aberto.

## Transposição

O teclado é diatônico em Dó, então uma música em qualquer outro tom só encaixa transposta — e errar
o tom por um semitom é a diferença entre quase tudo tocável e quase nada. `bestShift` testa os 12
tons e escolhe o que deixa menos notas fora da escala; depois cada nota é dobrada pra oitava mais
próxima dentro de C3–C6, preservando o contorno da melodia.

O que sobra sem tecla (acidente que não some em nenhum tom) é puxado pra natural vizinha e contado
no resumo como "desafinadas". Dá pra sobrescrever a transposição no `+`/`−` se preferir outro tom.
O tom original é inferido a partir do deslocamento escolhido (o noobnotes calcula o tom no cliente,
então ele não está no HTML servido).

## Estrutura

| Arquivo                                          | Responsabilidade                          |
| ------------------------------------------------ | ----------------------------------------- |
| [`lib/notation.ts`](lib/notation.ts)             | Notação do noobnotes → notas MIDI + letra |
| [`lib/keyboard.ts`](lib/keyboard.ts)             | O teclado do jogo, MIDI → tecla           |
| [`lib/arrange.ts`](lib/arrange.ts)               | Transposição, encaixe no alcance, saída   |
| [`lib/theory.ts`](lib/theory.ts)                 | Tom inferido e MIDI → frequência          |
| [`lib/synth.ts`](lib/synth.ts)                   | Prévia com som (Web Audio)                |
| [`components/Keyboard.tsx`](components/Keyboard.tsx) | Teclado visual do piano                |
| [`app/page.tsx`](app/page.tsx)                   | Interface e player                        |
| [`app/api/song/route.ts`](app/api/song/route.ts) | Busca e extrai a notação da página        |

## Deploy (Netlify)

O app tem uma rota de servidor (`/api/song`), então precisa de um host que rode Next.js — não serve
como site estático puro. O Netlify detecta Next automaticamente e roda essa rota como função
serverless; o [`netlify.toml`](netlify.toml) só fixa o comando de build.

Conecte o repositório no painel do Netlify (New site → Import from GitHub) e o deploy sai a cada push
na `main`. Build: `pnpm build`.

## Créditos

As notas são conteúdo do [noobnotes.net](https://noobnotes.net) — a app busca sob demanda pro seu uso,
não redistribui nada. Heartopia é um jogo da XD Inc.; este é um projeto de fã, sem afiliação.

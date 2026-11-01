# Kael e ataque básico — polimento visual

Atualização de 01/11/2026: [correção de orientação pelo mouse e continuidade temporal](ATTACK_STABILITY.md). As evidências abaixo registram a entrega anterior.

## Entrega

Kael agora tem silhueta mais alta e contínua, placas de grafite com faces sombreadas, lames abdominais, ornamentos dourados, núcleo com encaixe metálico, visor com olhos ciano, coroa assimétrica, ombreiras, manoplas articuladas, joelheiras e botas. A capa usa curvas de Bézier, dobras e defasagem procedural. A espada possui lâmina facetada, fio luminoso, guarda, empunhadura e pomo. Toda a arte-fonte continua sendo geometria PixiJS; nenhum asset raster ou dependência foi adicionado.

O ataque usa uma pose compartilhada entre simulação e desenho:

- 0–75 ms: antecipação do braço e tronco, sem dano.
- 75–195 ms: corte projetado no plano isométrico; o setor varrido pela lâmina determina quando o alvo pode receber dano.
- 195–360 ms: recuperação suave para a postura normal.
- Rastro: amostras dos últimos 65 ms da ponta real da espada; desvanece por 90 ms após o corte.
- Impacto: flash inferior a 70 ms, doze fragmentos e anel fino que expiram em 400 ms.

A simulação continua a 60 Hz; as transições são discretizadas pelo timestep. A direção é fixada no início do golpe para que cursor, arma e dano não divirjam durante o corte. A próxima direção continua sendo lida pelos controles existentes. O alcance de 125, dano de 25, cooldown de 0,38 s e knockback de 15 foram preservados. Só mudou o momento do dano dentro da animação.

J possui fila de entrada de um toque até o próximo passo da simulação. Soltar J antes desse passo não perde o ataque. Manter J pressionado repete respeitando o cooldown. Clique e gamepad continuam disponíveis. O sintetizador diferencia o som do corte do som do impacto e desconecta seus nós ao terminar.

Arena, comportamento e arte da Sentinela, portal, checkpoint, menus/HUD e arquitetura desktop/Steam foram preservados. O feedback do acerto sobre a Sentinela foi refinado. Os efeitos transitórios do jogador são limpos ao morrer/concluir para não permanecerem congelados atrás do painel.

## Arquivos

- `src/rendering/kael.ts`: desenho, articulação, lâmina, rastro e impacto.
- `src/rendering/scene.ts`: composição do novo Kael no mesmo cenário; mantém o desenho da Sentinela.
- `src/core/attack.ts`: curva temporal e setor varrido compartilhados.
- `src/core/world.ts`: aplicação de dano na janela correta, limite de um acerto e expiração.
- `src/input/controls.ts`: captura confiável do toque em J.
- `src/audio/synth.ts`: síntese de espada e impacto.
- `src/main.ts`: consumo da fila após simulação e disparo do som do corte.
- `tests/unit/attack.test.ts`, `tests/unit/world.test.ts`: regressões da nova janela de dano.
- `tests/e2e/kael.spec.ts`: J sem clique, antecipação/corte/recuperação e pausa.
- `tests/visual/capture-kael.mjs`: capturas reproduzíveis do jogo real.

## Testar

```sh
npm run dev -- --port 5173 --strictPort
```

Inicie a jornada e pressione **J**, sem clicar na arena. A orientação vem do movimento, do mouse ou do analógico existentes. Aproxime-se da Sentinela e pressione J para ver o flash e os fragmentos no contato. Segurar J repete os golpes; solte para observar a recuperação. Esc pausa. Derrote a Sentinela e alcance o portal para conferir a progressão original.

```sh
npm run build
npm test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium
# Com Vite ainda rodando:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node tests/visual/capture-kael.mjs
```

A variável do Chromium é apenas uma opção para o navegador do sistema; pode ser omitida quando o Playwright tiver instalado seu próprio Chromium.

## Evidências — 31/10/2026

- Build TypeScript/Vite: aprovado.
- Unitários: **21 aprovados**, em dois arquivos. Cobrem dano somente durante a passagem, cooldown, alvo fora de alcance/atrás, um acerto por golpe, direção comprometida, pausa/morte/menu/vitória, recuperação, expiração de efeitos, projeção e regressões de save.
- Chromium/Playwright: **4 aprovados**, incluindo todos os três cenários existentes e o toque de J pressionado/solto antes de um frame, sem clique do mouse. A arena foi concluída e o checkpoint restaurado.
- Capturas reais de idle, corrida e corte: geradas e inspecionadas; nenhum `pageerror` durante a captura. Uma primeira versão tinha cotovelo alto demais: a articulação, a torção do tronco e as dobras da capa foram refinadas e recapturadas.
- Microverificação de CPU: 360 reconstruções da geometria de Kael, mediana ~0,4 ms, p95 ~1,1 ms, máximo de 150 instruções retidas por frame. É uma amostra deste ambiente, não um benchmark de GPU nem garantia de 60 FPS. Rastro e partículas têm contagens fixas e não acumulam objetos persistentes.
- Firefox não executado: navegador ausente e os domínios de download ainda não foram aplicados à política de rede deste ambiente. Hardware real, áudio percebido e controles físicos não foram revalidados nesta tarefa.

## Capturas

As imagens são evidências, não assets carregados pelo jogo.

- [Antes: arena e Kael original](screenshots/arena.png)
- [Depois: Kael parado](screenshots/kael-polish/idle.png)
- [Detalhe da armadura e espada](screenshots/kael-polish/idle-detail.png)
- [Kael em movimento](screenshots/kael-polish/run.png)
- [Ataque com J](screenshots/kael-polish/attack.png)
- [Detalhe da trajetória da lâmina](screenshots/kael-polish/attack-detail.png)

## Limites conhecidos

O personagem mantém uma representação estilizada em três quartos, sem um conjunto de vistas completas de costas. Em ângulos de corte voltados para trás, partes da lâmina ficam oclusas pelo corpo intencionalmente. A oclusão de colunas do cenário continua simplificada, como na versão anterior. Não foi introduzida física de tecido: capa e articulações são procedurais. A validação sonora automática confirma execução sem erros, mas não substitui audição em hardware real.

# Estabilidade do ataque de Kael — 01/11/2026

Correção sobre `feat/kael-sword-polish`, preservando a arena e a progressão existentes.

## Diagnóstico

As causas foram verificadas no código e, quando aplicável, medidas antes da alteração:

1. `Controls.sample` convertia a posição do cursor em `aim`; `step` copiava esse ângulo para `player.facing`. O renderer usava esse mesmo valor para a espada em repouso. Portanto, mover o cursor de fato movia a arma sem atacar.
2. Na fronteira corte/recuperação (195 ms), `attackPose.extension` passava de **0,85 para 1** instantaneamente. A ponta, cujo raio base é 113, saltava aproximadamente **16,95 unidades de mundo** antes da projeção. A medição dos dois lados da fronteira confirmou diferença de 0,1499996 na extensão.
3. O corte usava velocidade angular constante enquanto antecipação/recuperação terminavam ou começavam com velocidade zero. Havia mudanças instantâneas de velocidade nas fronteiras.
4. A pose trocava pernas em corrida por stride zero e abria a postura imediatamente. A oscilação de respiração também era substituída por outra curva sem mistura na entrada/saída.
5. A mão portadora era trocada conforme o sinal da direção projetada. A camada da arma usava a ponta da lâmina como condição e alterava ombro/material entre os dois caminhos. O cotovelo usava uma raiz quadrada com derivada singular na extensão completa de 38 unidades.
6. A apresentação desenhava diretamente os estados a 60 Hz, sem interpolação. Pixi mantinha ainda seu próprio ticker além do `requestAnimationFrame` da aplicação. O rastro antigo reconstruía posições passadas ao redor da posição atual do jogador, deslizando junto com ele durante a corrida.

O controle existente de cooldown já impedia reiniciar o ataque em todo frame; isso não foi tratado como causa comprovada. Foram adicionadas regressões para proteger esse comportamento. A reconstrução de Graphics e as transformações inversas de mão/tronco foram inspecionadas; não se identificou uma transformação duplicada como causa.

## Correções

- Cursor removido da origem de `aim`. A direção vem do movimento ou do analógico direito existente; sem entrada nova, a orientação anterior permanece. Clique esquerdo e J continuam disparando o ataque, mas mover o mouse não mira nem gira a espada.
- Orientação atual e direção desejada separadas. O corpo e o golpe mantêm a orientação comprometida até terminar a recuperação. Fora do golpe, a rotação segue o arco mais curto com velocidade limitada, evitando saltos ao cruzar −π/π. A próxima entrada de movimento/controle é lembrada; mapas de botões e zonas mortas foram preservados.
- Antecipação, corte e recuperação compartilham curvas com continuidade de valor e velocidade. A extensão recupera de 0,85 para 1 ao longo da recuperação, sem salto. Corpo, passada e respiração recebem pesos contínuos. Correndo, as pernas mantêm a passada mesmo durante o corte, com amplitude reduzida suavemente.
- Espada permanece na mesma mão anatômica. Ombro e material da articulação são iguais nos caminhos de profundidade; a camada permanece estável durante cada golpe. O cotovelo usa extensão suave sem singularidade.
- Snapshots separados para a apresentação do jogador, interpolados entre passos fixos; IDs e timestamps de golpe evitam interpolar um timer reiniciado ao contrário. A câmera segue a mesma posição interpolada. Pixi apresenta explicitamente o frame após atualizar a geometria, sem ticker concorrente.
- Rastro armazena posições reais da ponta e da empunhadura em coordenadas de mundo, incluindo deslocamento e oscilação corporal. Amostragem limitada, máximo de 32 pontos, descarte e desaparecimento após o corte. Nenhum filtro foi adicionado para esconder descontinuidade.

Dano **25**, alcance **125**, cooldown **0,38 s**, duração **0,36 s**, início do corte **75 ms**, fim **195 ms** e knockback **15** foram preservados. O teste de dano continua usando o setor varrido da mesma curva que desenha a arma.

## Validação

- `npm run build`: aprovado, incluindo TypeScript estrito.
- `npm test`: **41 testes unitários aprovados**. Cobertura anterior preservada e novas regressões de continuidade nas fronteiras, velocidade, punho/cotovelo, direção, passada, cooldown, eventos de ataque, interpolação a 60/120/144 Hz, alcance/dano e expiração do rastro.
- Chromium/Playwright: **6 cenários aprovados**. Na última suíte completa, cinco passaram e o cenário longo de menus excedeu o orçamento total de 30 s enquanto retomava a partida. Ele passou na reexecução em **30,8 s**, com orçamento total de 60 s e todas as assertions preservadas. O teste de ataques consecutivos mede a velocidade isométrica anterior ao golpe, em vez de pressupor a velocidade de um comando em eixo de mundo; nenhum valor de movimento do jogo foi alterado para fazê-lo passar.
- Um teste anterior foi atualizado para verificar que a nova direção fica lembrada durante o golpe e é aplicada depois, em vez de exigir que o corpo gire durante o ataque. Dano, orientação comprometida e próximo direcionamento continuam verificados.
- As comparações de cursor verificam repouso, corrida e ataque no jogo real. O teste de J inclui pressionar e soltar antes de um passo da simulação, sem clique do mouse. Ataques mantidos verificam IDs, cooldown, direção e posição em uma sequência de frames.
- A arena foi concluída e o checkpoint restaurado pelos testes existentes.
- Comparação com a base confirmou ausência de alterações na geometria da arena, arte/IA da Sentinela, portal, conteúdo de menus/HUD, gravação de checkpoint, serviços de plataforma, documentação desktop/Steam e dependências.

## Evidência temporal

Foram capturados **28 frames consecutivos parado e 28 correndo**, em intervalos de 16 ms. J fica mantido, incluindo entrada no próximo golpe. As capturas não reposicionam o personagem nem desligam a câmera para ocultar movimento; usam uma região fixa da tela. `frames.json` registra tempos, posições, fase visual e IDs. A fase da simulação também está registrada separadamente.

- [Sequência parado](screenshots/attack-stability/standing-contact.png)
- [Sequência correndo](screenshots/attack-stability/running-contact.png)
- [Reprodução e frames individuais](screenshots/attack-stability/index.html)
- [Telemetria dos frames](screenshots/attack-stability/frames.json)

As sequências foram inspecionadas lado a lado nas fronteiras preparação/corte/recuperação/repouso. A primeira captura mostrou a passada parada no centro do corte; ela foi refinada para continuar durante a corrida e as duas sequências foram recapturadas. Não houve `pageerror` nas capturas.

Para reproduzir, com Vite na porta 5173:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node tests/visual/capture-attack-sequence.mjs
```

## Arquivos e limites

Código: `src/input/controls.ts`, `src/core/attack.ts`, `src/core/world.ts`, `src/main.ts`, `src/rendering/kael.ts`, `src/rendering/kael-motion.ts`, `src/rendering/scene.ts`. Testes: `tests/unit/attack.test.ts`, `tests/unit/attack-stability.test.ts`, `tests/e2e/kael.spec.ts`, o orçamento total do cenário longo em `tests/e2e/game.spec.ts` e o capturador em `tests/visual/`.

A interpolação do jogador apresenta até um timestep (16,7 ms) atrás da simulação; não extrapola posição nem altera colisões. Quedas de desempenho da máquina ainda podem reduzir a quantidade de frames exibidos. As sequências e testes cobrem os cenários descritos, não são uma garantia universal em todo hardware.

Firefox e controles físicos não foram revalidados; Firefox não está instalado e os domínios de download continuam ausentes da política de rede aplicada. A representação em três quartos e a oclusão simplificada de colunas permanecem as limitações anteriores. Nenhuma integração, dependência, fase, inimigo ou habilidade foi adicionada.

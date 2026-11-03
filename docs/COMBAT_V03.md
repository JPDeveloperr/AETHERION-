# AETHERION 0.3 — O Poder do Aether

Base preservada: `feat/aetherion-combat-v02`, `91baeea6d64620e866679a484ee9987f434c510a`. Na inspeção do GitHub essa era a ponta remota, sem trabalhos posteriores ou branch 0.3 prévia. A implementação fica em `feat/aetherion-combat-v03`; arena, inimigos, três encontros, portal e formatos de save continuam os mesmos.

## Combate e controles

| Entrada | Ação | Energia / cooldown |
|---|---|---|
| J, clique, X/□ (botão 2) | Combo Crescente → Reverso → Finalizador | Acertos: +12 / +12 / +20 por alvo vivo |
| K, RB/R1 (botão 5) | Lâmina de Aether | 35 / 1,8 s |
| L, LB/L1 (botão 4) | Nova Astral | 70 / 6 s |
| Espaço, A/× (botão 0) | Esquiva; colisão evitada nos primeiros 120 ms é perfeita | Perfeita: +20; invulnerabilidade 240 ms; recarga 1,1 s |
| WASD/setas, analógico esquerdo | Movimento e orientação | Preservados |
| Analógico direito | Orientação | Preservada, sem cursor |
| Esc, Start (botão 9) | Pausa | Preservada |

Os números são índices zero-based do mapeamento `standard` da Gamepad API, correspondente a Xbox e PlayStation quando o navegador fornece esse mapeamento. Os testes usam botões/arestas reais da API em um controle emulado, além de testar a classe de entrada. Não equivalem a testar um controle físico. Controles não padronizados continuam sem remapeamento; isso permanece no roadmap.

A energia começa em zero, fica entre 0 e 100 e não regenera. Só eventos de dano básico válidos a concedem: nada por ar, alvo morto ou nova sobreposição de um alvo já atingido naquele golpe. Especiais não devolvem energia por dano. Ataques distintos contra dois inimigos rendem energia por alvo; o limite de 100 continua valendo. Energia permanece entre encontros; nova partida ou restauração a zera. O HUD usa gradiente ciano/dourado, preenchimento interpolado por CSS, valor numérico e estados separados de disponível, sem energia, ocupado e recarga. Ganho/gasto e rejeição têm feedback próprio.

**Lâmina de Aether:** prepara por 140 ms, varre um arco contínuo e emite aos 230 ms uma frente curva, com direção comprometida até terminar a recuperação aos 620 ms. A frente percorre até 180 unidades em 450 ms; seu setor tem ±0,72 rad e tolerância de corpo/faixa de 12 unidades. A colisão varre os raios anterior/atual da mesma curva usada pelo desenho, sem pular alvos entre passos. Causa 30 de dano e knockback 20, uma vez por alvo/ativação; pode acertar os dois inimigos. Núcleo ciano, borda dourada, três amostras temporais da frente e doze fragmentos formam a onda. Dissipa aos 620 ms após a emissão.

**Nova Astral:** concentra no núcleo do peito e orbita sete fragmentos durante uma pose de guarda. Emite aos 240 ms uma frente circular que expande suavemente até 135 unidades em 160 ms; recupera a postura aos 820 ms. Aplica 45 de dano e knockback radial 25 uma vez por alvo quando a frente o alcança. Anéis, um polígono de doze lados, runas e fragmentos dão uma silhueta distinta sem cobrir os inimigos. O centro é a posição no instante da emissão: Kael pode continuar correndo e a câmera não recebe deslocamento ou shake.

**Esquiva perfeita:** só é contabilizada no tratamento de uma colisão hostil efetiva (golpe da Sentinela ou segmento do projétil). Cada fonte possui identidade; a recompensa não se repete para o mesmo ataque. A primeira metade da invulnerabilidade rende o bônus; a segunda continua protegendo sem bônus. Uma colisão já anulada pela invulnerabilidade de dano não gera energia. Flash discreto, indicação textual por 650 ms e timbre sintetizado específico completam o feedback. A entrada de Espaço agora também retém toques curtos até um passo, mantendo o funcionamento por botão pressionado.

## Prioridade, continuidade e limpeza

Solicitações no mesmo passo: esquiva → Nova → Lâmina → J. Um pedido especial durante J, outro especial, cooldown básico ou esquiva ativa é bloqueado, sem gasto e sem buffer. Não é executado depois por surpresa. Um especial aceito encerra o buffer/encadeamento J; o próximo J recomeça no Crescente. Segurar K/L ou ombro não repete; os eventos são consumidos uma vez por passo.

Uma esquiva pode ocorrer durante uma ação já comprometida: preserva sua locomoção/invulnerabilidade e o especial continua com a mesma direção e uma única pose corporal. Não existe uma animação de esquiva concorrente com o rig. Não há invulnerabilidade gratuita durante preparação ou recuperação dos especiais. Movimento, pernas e câmera interpolados permanecem ativos.

A pose usa o mesmo timeline matemático dos cortes, com continuidade de valor e velocidade nas fronteiras. Snapshots registram a identidade/timestamp de cada especial, evitando antecipar o evento ou interpolar um timer reiniciado ao contrário. A espada não recebe o cursor e continua na mesma mão. O rastro de J armazena a trajetória real, e é limpo ao entrar em um especial. O recuo dos inimigos tem endpoints com posição/velocidade zero e não altera a simulação; HP, velocidades, dano e avisos dos inimigos não aumentaram. J preserva 25/25/42 de dano, alcance, knockback e timings da 0.2.

Pausa interrompe especiais e limpa suas ondas/partículas sem reembolso; seus cooldowns congelam no tempo da simulação. J conserva a pausa da 0.2. Morte impede emissão pendente e limpa os transitórios; vitória também limpa os inimigos. Uma frente expira em 620 ms, tem no máximo 12 fragmentos desenhados e uma lista de IDs limitada aos dois inimigos da arena. Não existem partículas persistentes alocadas por frame. Projéteis hostis continuam unidades da simulação e congelam durante pausa, como antes.

## Arquitetura e persistência

- `src/core/abilities.ts`: definições, energia, cooldowns, entrada aceita/rejeitada, casts, frentes varridas, bônus perfeito e limpeza.
- `src/core/combat.ts`: evento comum de dano/knockback/reação; não recompensa alvos mortos.
- `src/core/world.ts`: composição determinística, prioridade, fontes de colisão, ganho por J e progressão preservada.
- `src/core/attack.ts`: timeline compartilhado; constantes dos três ataques básicos preservadas.
- `src/input/controls.ts`: filas de pressão K/L/Espaço e ombros padrão, mantendo controles anteriores.
- `src/rendering/kael-motion.ts`, `kael.ts`: snapshots, interpolação e rig corporal compartilhado.
- `src/rendering/aether.ts`: geometria das cargas, ondas e flash perfeito; `feedback.ts`: recuo suave; `scene.ts`/`specter.ts`: composição e reações.
- `src/ui/aether.ts`: HUD, feedback acessível e despacho dos sons novos. `main.ts` faz a composição e limpeza de pausa.
- `src/audio/synth.ts` e `src/style.css`: timbres e apresentação.
- `tests/unit/aether.test.ts`, `power-controls.test.ts`: regras, colisão e regressões novas; os quatro arquivos anteriores permanecem.
- `tests/e2e/aether.spec.ts`, extensão opcional do piloto `journey.ts`: três cenários novos e captura real. As oito regressões anteriores permanecem.
- `tests/visual/aether-report.mjs`: folhas de contato/reprodução. O capturador do combo ganhou saída/URL configuráveis para preservar as evidências da 0.2.
- README, regras, roadmap, arquitetura e relatório atualizados; `package.json`/lockfile em 0.3.0, sem mudança de dependências.

`src/platform/services.ts` não mudou. Saves v1 e v2 continuam lidos; v2 só registra `version`, `completedEncounters`, `savedAt`. Aether/casts/cooldowns não entram na persistência. A suíte verifica as chaves do checkpoint depois da partida e energia zero após reload/continuar. Não foram adicionados fase, inimigo, capítulo, chefe, inventário, loja, XP, multiplayer ou Steamworks.

## Validação — 03/11/2026

Linha de base executada antes das alterações: instalação congelada, build estrito, **71 unitários** e **8 cenários Chromium aprovados**. Implementação atual: instalação congelada e build aprovados; **135 testes unitários em seis arquivos aprovados**. **11 cenários Chromium distintos aprovados**, incluindo as oito regressões da 0.2. A rodada conjunta teve nove aprovados e duas falhas de verificação/recursos descritas abaixo; os dois cenários afetados passaram em reexecuções, preservando todas as assertions. Nenhum teste foi desativado.

As verificações novas exercitam os seguintes casos:

- Energia inicial/máxima/consumo, sem regen, acerto vivo único, dois alvos, ar/alvo morto, retenção entre encontros e reset no checkpoint.
- Custo exato/insuficiente, botão mantido, spam, cooldown, bloqueios e prioridade; sem duas cobranças ou dois hits no mesmo alvo.
- Frente curva atingindo um/dois alvos, frente circular dentro/fora do raio e janela visível de dano.
- Colisões reais da Sentinela/projétil, esquiva comum versus perfeita, sem bônus duplicado ou durante imunidade de dano.
- Movimento e direção comprometida; continuidade de pose/velocidade, extensão e juntas; interpolação a 60/120/144 Hz.
- Morte antes da emissão, pausa, menu e vitória; expiração de ondas/efeitos; recuo só de apresentação.
- Mapeamento `standard` dos ombros emulado; layout em 390×844.

O cenário de poderes obtém energia somente por entradas normais de combate, utiliza L e K em movimento e conclui os três encontros, portal e save. A simulação não recebe energia, HP, posições ou vitória artificiais. O cenário de esquiva retoma um checkpoint v1 válido do Espectro, esquiva no vazio e depois evita um projétil real para conferir +20, 100 HP e um único evento perfeito.

Na primeira verificação da esquiva perfeita, a assert foi feita 64 ms após a entrada, enquanto a distância do projétil ainda exigia mais tempo de deslocamento. A observação foi movida para 112 ms, dentro da janela de 120 ms; dano, tempo de esquiva e recompensa não foram alterados. A verificação da Lâmina passou a incluir 64 ms após a entrada, em vez de 32 ms: a ativação já havia cobrado energia/iniciado cooldown, mas a apresentação deliberadamente interpola um passo atrás e ainda podia mostrar o frame anterior. A reexecução confirmou a pose, cobrança única, cooldown, direção fixa, acerto e vitória. A partida longa da suíte antiga chegou aos três encontros concluídos, mas excedeu 180 s ao concorrer com outra captura Chromium. Isolada, passou em 1,9 minuto, com o mesmo orçamento de 180 s e todas as verificações de portal/save. Capturas e suítes longas devem executar sem concorrência gráfica neste ambiente.

Também foi corrigida uma corrida do gerador das folhas de contato com o reload de HTML do Vite: aguarda a página estabilizar antes de decodificar as imagens. A captura dos frames não foi substituída por imagens artificiais.

Firefox foi tentado novamente com a distribuição Playwright instalada e diretórios XDG temporários graváveis. Falhou em `browserContext.newPage: Target crashed`, antes de executar o cenário. Nenhum teste funcional Firefox aprovado; sandbox não foi desativado.

## Inspeção visual e evidências

Capturas de 16 ms: 64 frames da Lâmina, 64 da Nova, 42 da esquiva perfeita, além de 90 parado + 90 correndo do combo atual: **350 frames reais**. A região de captura é fixa em cada sequência, escolhida ao redor da posição de tela inicial; câmera e movimento não são alterados. Os frames/telemetria registram frente, direção, IDs, energia, inimigos, vida e posição. Inspeção considera preparação, emissão, acerto, recuperação, legibilidade dos inimigos e expiração.

- [Reprodução e folhas de contato](screenshots/aether-v03/index.html)
- [Lâmina](screenshots/aether-v03/blade-contact.png), [Nova](screenshots/aether-v03/nova-contact.png), [esquiva perfeita](screenshots/aether-v03/perfect-dodge-contact.png)
- [Combo correndo](screenshots/aether-v03/combo/running-contact.png) e [parado](screenshots/aether-v03/combo/standing-contact.png)
- [Combate combinado](screenshots/aether-v03/encounter-3.png) e [HUD em tela pequena](screenshots/aether-v03/hud-small.png)

PNGs são evidências, nunca assets carregados pelo jogo. A arte permanece geometria PixiJS. Nenhuma medição aqui comprova 60 FPS em hardware real. Áudio percebido, gamepads físicos, Fedora físico, oclusão completa das colunas e Firefox funcional permanecem sem validação; Kael mantém a representação em três quartos. Controles não padronizados precisam de remapeamento futuro.

## Executar no Fedora Linux

Use Node.js 24 LTS, npm e navegador com WebGL. O pacote padrão pode variar pela versão do Fedora: confira `node --version` após instalar.

```sh
sudo dnf install nodejs npm
git clone --branch feat/aetherion-combat-v03 https://github.com/JPDeveloperr/AETHERION-.git
cd AETHERION-
npm ci
npm run dev

npm run build
npm test
npx playwright install chromium
npm run test:e2e -- --project=chromium
# Ou Chromium do sistema:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium
```

No ambiente cloud o cache padrão do npm é somente leitura: foi usado `npm ci --cache /tmp/aetherion-npm-cache`. Isso não modifica dependências ou verificação de integridade. Em Fedora, instale bibliotecas do navegador conforme o diagnóstico; `--with-deps` não é um instalador universal para essa distribuição.

Para reproduzir as capturas de poderes, execute os testes com `AETHER_CAPTURE=1`; com o Vite ainda rodando, gere as folhas. Não execute o gerador HTML enquanto outra suíte usa o servidor Vite, pois o reload de HTML é global.

```sh
AETHER_CAPTURE=1 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium --grep 'earned Aether|real projectile yields|standard Xbox'
# Em outro terminal: npm run dev -- --port 5173 --strictPort
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node tests/visual/aether-report.mjs
AETHER_COMBO_OUTPUT=docs/screenshots/aether-v03/combo PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node tests/visual/capture-combat-v02.mjs
```

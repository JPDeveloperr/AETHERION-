# AETHERION 0.2 — O Despertar do Santuário

Implementação sobre `feat/kael-sword-polish`, commit `5b10350476ab5ff6f3ab366002d203ebe1fe9710`. A branch de fundação desktop é ancestral dessa base; na recuperação não havia branch remota 0.2. A arena, Kael, Sentinela, portal, menus e histórico foram preservados.

## Jogar

J, clique ou X/□: uma entrada por golpe. Corte Crescente → Corte Reverso → Corte Finalizador. Segurar o botão não repete. Pode antecipar a entrada durante o golpe (buffer 320 ms após os primeiros 60 ms), ou continuar até 480 ms após sua conclusão. O próximo corte espera a recuperação e o cooldown anteriores; entradas não acumulam uma cadeia automática.

Movimento e esquiva continuam ativos. Cursor não orienta a espada. Cada alvo recebe no máximo um acerto por golpe, durante o setor realmente varrido pela lâmina. O finalizador tem preparação de 130 ms, arco mais amplo, elevação contínua, compressão do corpo, dano 42 e knockback 32; os dois primeiros mantêm dano 25 e knockback 15. Curvas quintic smoothstep e interpolação de snapshots preservam continuidade nas fronteiras. O reverso move tronco e braço na direção oposta; não troca a mão da espada.

A Sentinela permanece no primeiro encontro. No segundo, o Espectro do Vazio mantém distância, orbita, anuncia a direção fixa do disparo por 850 ms e lança um projétil a 230 unidades/s. Saia da linha violeta ou esquive durante a passagem. A colisão varre o trajeto do projétil e respeita invulnerabilidade. No terceiro encontro os dois tipos atuam juntos. Cristais ficam nas bordas, sem criar obstáculos. As runas e fissuras são geometria estática; brilhos e sombras usam formas, sem filtros pesados ou imagens raster.

Completar um encontro recupera até 20 HP e salva um marco. O próximo começa após 1,3 s. Só o terceiro libera o portal original. Save v2 armazena encontros concluídos, não ataques/projéteis. Continuar restaura vida cheia e apenas os inimigos restantes. O save v1 não é apagado; uma Sentinela derrotada migra para o início do encontro do Espectro.

## Validação real — 03/11/2026

Antes de alterar a base: 41 unitários e seis cenários Chromium aprovados. Após a implementação:

- `npm ci --cache /tmp/aetherion-npm-cache`: instalação congelada aprovada (o cache padrão em `/home/agent/.npm` não era gravável neste ambiente).
- `npm run build`: TypeScript estrito e Vite aprovados.
- `npm test`: 71 testes em quatro arquivos aprovados.
- Chromium: a suíte completa final passou com **oito cenários**, sem retries, em 3,6 minutos. Inclui menus/settings/pausa, dano da Sentinela, conclusão dos três encontros, J curto, independência do cursor, combo correndo, botão mantido e migração/tiro/esquiva do Espectro.
- Progressão completa usa telemetria somente de leitura para orientar teclas reais. Não reposiciona atores, não reduz HP e não força vitória. Cobre os três encontros, portal, escrita do marco e restauração após reload.
- Unitários cobrem dano/alcance, um acerto por alvo/golpe, buffer, botão mantido, expiração, direção, continuidade de valor/velocidade dos três cortes, interpolação, projéteis, IA nos limites, progressão e migração de save.
- Capturas: 90 frames consecutivos parado + 90 correndo, a cada 16 ms, com três entradas de J. Zero `pageerror` nas duas sequências. Inspecionadas as folhas de contato, preparação/corte/recuperação e passagem para o próximo golpe. O finalizador correndo também registra o impacto real na Sentinela.
- Firefox 157 / Playwright 1555 foi instalado. A tentativa inicial falhou ao criar configuração no home somente leitura; com `XDG_CONFIG_HOME` e `XDG_CACHE_HOME` em `/tmp`, iniciou mas os processos de conteúdo falharam ao criar namespaces (`/proc/self/uid_map: EROFS`). Nenhum cenário Firefox validado; não se desativou o sandbox para contornar isso.

O teste do Espectro precisou manter Espaço durante um passo da simulação: com relógio congelado, pressionar e soltar antes de qualquer frame não simula uma esquiva mantida. A reexecução preservou a verificação de 100 HP e comprovou a passagem do projétil durante a invulnerabilidade.

## Capturas e reprodução

- [Sentinela](screenshots/combat-v02/encounter-1-chromium.png)
- [Espectro](screenshots/combat-v02/encounter-2-chromium.png)
- [Encontro combinado](screenshots/combat-v02/encounter-3-chromium.png)
- [Aviso do disparo](screenshots/combat-v02/specter-charge-chromium.png)
- [Projétil](screenshots/combat-v02/specter-shot-chromium.png)
- [Vitória](screenshots/combat-v02/victory-chromium.png)
- [Combo parado](screenshots/combat-v02/standing-contact.png)
- [Combo correndo](screenshots/combat-v02/running-contact.png)
- [Reprodução das sequências](screenshots/combat-v02/index.html) e [telemetria](screenshots/combat-v02/frames.json)

As capturas PNG são evidências de teste; nenhuma é carregada como arte pelo jogo.

```sh
# Fedora Linux: Node.js 24 LTS + npm, navegador com WebGL
sudo dnf install nodejs npm
node --version  # usar versão 24 LTS

git clone --branch feat/aetherion-combat-v02 https://github.com/JPDeveloperr/AETHERION-.git
cd AETHERION-
npm ci
npm run dev

# Build e testes
npm run build
npm test
npx playwright install chromium
npm run test:e2e -- --project=chromium
# Alternativa com Chromium do sistema:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium

# Com Vite em 5173, reproduzir frames reais:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node tests/visual/capture-combat-v02.mjs
```

No Fedora, se o Playwright solicitar bibliotecas nativas, instale os pacotes equivalentes pelo dnf; `--with-deps` usa distribuições suportadas e não é um instalador universal para Fedora. O comportamento do jogo foi validado neste ambiente Linux, não em uma máquina Fedora física.

## Arquivos e limites

- Combate e progressão: `src/core/attack.ts`, `src/core/world.ts`.
- Entradas e composição/HUD: `src/input/controls.ts`, `src/main.ts`, `src/style.css`.
- Renderização e continuidade: `src/rendering/kael-motion.ts`, `kael.ts`, `scene.ts`; novo `specter.ts`.
- Persistência: `src/platform/services.ts`.
- Testes: regressões existentes em `tests/unit/` e `tests/e2e/`; novos `combat-v02.test.ts`, `journey.ts`, `specter.spec.ts` e `tests/visual/capture-combat-v02.mjs`.
- Versão: `package.json` e `package-lock.json` passam a 0.2.0; nenhuma dependência foi alterada.
- Documentação: README, arquitetura, regras e este relatório; novas evidências em `docs/screenshots/combat-v02/`.

Permanecem a oclusão simplificada das colunas e a representação de Kael em três quartos. Os inimigos ainda são apresentados no passo fixo; Kael/câmera têm interpolação. Não há validação de áudio percebido, controle físico, desempenho em GPU intermediária ou Firefox funcional. Limites de objetos são pequenos (dois inimigos simultâneos, 32 amostras do rastro e projéteis com vida limitada), mas isso não equivale a um benchmark de FPS em hardware real. Nenhum novo capítulo, chefe, inventário ou integração Steamworks foi adicionado.

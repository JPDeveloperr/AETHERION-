# AETHERION — Echoes of Eternity

AETHERION 0.3 — O Poder do Aether. RPG de ação isométrico com arte inteiramente vetorial/procedural, TypeScript, PixiJS e Vite. Kael enfrenta três encontros no Santuário Partido: Sentinela Rubra, Espectro do Vazio e a guarda combinada. O portal original abre após as três vitórias.

## Executar (incluindo Fedora Linux)

No Fedora, instale Node.js 24 LTS e npm (por exemplo, `sudo dnf install nodejs npm`, verificando `node --version`). No checkout:

```sh
git switch feat/aetherion-combat-v03
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite no navegador. É preciso WebGL com aceleração gráfica. Não é necessário Steam ou Electron. O build estático pode ser servido por HTTP, inclusive em subdiretórios:

```sh
npm run build
npm run preview
```

WASD/setas: movimento e orientação; clique esquerdo/J: ataque; espaço: esquiva; Esc: pausa. No controle: analógico esquerdo move, direito aponta, X/□ ataca, A/× esquiva e Start pausa. D-pad percorre menu, A confirma. Mover o cursor não altera a pose da espada; a direção permanece fixa durante cada golpe. Pressione J, clique ou X/□ uma vez para cada golpe do combo: Corte Crescente, Reverso e Finalizador. Segurar o botão não repete. Há buffer de 320 ms e uma janela de 480 ms após o golpe para continuar; cada corte termina sua recuperação antes do próximo. Fuja do círculo vermelho e da linha violeta anunciada pelo Espectro; os projéteis podem ser esquivados. Cada encontro concluído recupera até 20 de vida e salva um marco. Ao concluir os três, entre no portal a sudeste. Continuar restaura encontros concluídos com vida cheia; saves antigos preservam a vitória sobre a Sentinela e retomam no Espectro.

Aether: acertos de J rendem 12/12/20 de energia por alvo, esquiva perfeita rende 20; máximo 100, sem regeneração. **K / RB-R1** libera a **Lâmina de Aether** (35, recarga 1,8 s), uma frente curva de 30 de dano até 180 unidades. **L / LB-L1** libera a **Nova Astral** (70, recarga 6 s), explosão radial de 45 de dano até 135 unidades. Cada alvo recebe um acerto por ativação. A janela de esquiva perfeita é de 120 ms e exige uma colisão hostil evitada. Energia é temporária e zera ao continuar um checkpoint; saves v1/v2 continuam compatíveis. Pedidos especiais durante outra ação são bloqueados; pausa cancela especiais sem reembolso. Veja a política e as evidências no relatório 0.3.

## Validar

```sh
npm test
npm run build
npx playwright install --with-deps chromium firefox
npm run test:e2e
```

Em Fedora, instale as bibliotecas exigidas pelo Playwright conforme os diagnósticos da ferramenta; o instalador `--with-deps` é voltado a distribuições suportadas. Para um Chromium do sistema, use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium`. Isso não valida Firefox.

## Escopo e documentação

Uma arena, dois tipos de inimigo, combo de três golpes, esquiva, vida/morte, menu, pausa, configurações, áudio sintetizado e checkpoint local. Não representa ainda o jogo comercial completo. Sem sprites raster, imagens remotas, conta online ou compras.

- [Arquitetura e limites](docs/ARCHITECTURE.md)
- [Direção de arte](docs/ART_DIRECTION.md)
- [Regras da arena](docs/GAME_DESIGN.md)
- [Desktop, pipelines futuros e Steamworks](docs/DESKTOP_STEAM.md)
- [Roadmap](docs/ROADMAP.md)
- [Versão 0.3, controles, validação e capturas](docs/COMBAT_V03.md)
- [Histórico da versão 0.2](docs/COMBAT_V02.md)
- [Resultados históricos de teste](docs/TEST_REPORT.md)

Electron/Steamworks e builds Windows/Linux são futuros e ainda não validados. Nenhum build será publicado na Steam nem pagamento será feito sem autorização explícita.

![Arena vetorial do Santuário Partido](docs/screenshots/arena.png)

Correção do ataque: [causas, testes e sequências de frames](docs/ATTACK_STABILITY.md).

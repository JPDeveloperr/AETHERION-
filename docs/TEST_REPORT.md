# Validação — 31/10/2026

Ambiente: Linux na nuvem, Node 24.19.0, npm 11.9.0, Chromium do sistema via Playwright. Versões de dependências fixadas no package-lock.json.

| Verificação executada | Resultado |
| --- | --- |
| npm ci | instalação reproduzível concluída |
| npm run build | TypeScript e Vite aprovados |
| npm run typecheck após ajustes finais de automação | aprovado |
| npm test | 9 testes, todos aprovados |
| Chromium: menu, configurações após reload, início, pausa, movimento e esquiva | aprovado |
| Chromium: Sentinela persegue e causa dano | aprovado |
| Chromium: ataque derrota Sentinela, checkpoint salvo, movimento até portal, vitória e continuar após reload | aprovado |
| Build de produção aberto com Playwright | canvas e HUD presentes, nenhum pageerror |
| Capturas de menu e arena | geradas e inspecionadas visualmente |
| Firefox | não executado: download negado por política de rede |
| Gamepads físicos, Windows, Linux desktop empacotado, Steam | não executados |

Os dois primeiros cenários Chromium passaram na execução de três testes. O terceiro inicialmente falhou por atraso da automação na soltura da tecla; foi corrigido e passou em execução direcionada. A automação observa coordenadas do canvas e envia eventos de teclado, sem modificar o estado da simulação. Não houve redução das condições de vitória nem remoção de assertions.

Unitários: projeção/inversa/altura; movimento normalizado/limites; pausa; aviso de ataque/dano/esquiva/cooldown; morte do inimigo e conclusão; morte do jogador; validação de dados corrompidos/versão; round trip de checkpoint; falha de quota.

Evidências: [menu](screenshots/menu.png), [arena](screenshots/arena.png), [vitória](screenshots/victory.png). Capturas não são assets do jogo.

## Limitações

- Primeira arena curta, sem salto, plataformas físicas, ataques pesado/especial, outros inimigos ou remapeamento completo.
- Colunas decorativas não têm colisão; oclusão de cenário simplificada. Arte e animação precisam evoluir para qualidade comercial.
- Gamepad implementado por API, ainda sem validação com hardware. Tela cheia e áudio precisam de matriz real de dispositivos; o teste automatizado não confirma percepção sonora.
- Sem benchmark que comprove 60 FPS em computador intermediário.
- Save é marco de progresso local, não snapshot exato. Desktop/Cloud exigem adapter e migrações descritos no plano.
- Nenhuma execução do GitHub Actions foi confirmada nesta sessão.

O rascunho do ambiente inclui install_script e start_skill e os domínios cdn.playwright.dev, playwright.download.prss.microsoft.com e storage.googleapis.com para downloads. Salvar o rascunho não aplicou nem publicou essa política; Firefox continua pendente até aplicação e nova validação.

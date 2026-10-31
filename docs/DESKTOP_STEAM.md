# Windows, Linux e Steam — plano de integração

Estado: navegador implementado; Electron, electron-builder e Steamworks ainda não instalados. Builds nativos e funcionamento desktop não foram validados. Não publicar na Steam nem realizar pagamentos sem autorização explícita do proprietário.

## Limites da aplicação

Manter um único renderer web. `core`, matemática e regras não importam Electron, Node ou Steam. O bootstrap recebe `PlatformServices`: browser hoje, bridge desktop depois. Integrações opcionais não bloqueiam iniciar, pausar, salvar localmente ou concluir o jogo. Detecção será por capacidade explícita exposta pelo preload, nunca por user-agent.

Estrutura futura: `desktop/main.ts` cria BrowserWindow; `desktop/preload.ts` expõe operações mínimas tipadas via contextBridge; `src/platform/desktop.ts` adapta o contrato. `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Validar payload, tamanho, versão e remetente de cada IPC no main. Não expor ipcRenderer, fs, shell ou caminhos arbitrários. Bloquear navegações/janelas não autorizadas. CSP deve aceitar só assets locais, com política distinta para o servidor Vite em desenvolvimento.

Preferir protocolo local registrado seguro e padrão (ex.: aetherion://app), com roteamento restrito ao diretório empacotado e proteção contra traversal. `base: './'` já evita caminhos absolutos de assets, mas não substitui testes com build empacotado. Em desenvolvimento, carregar somente o servidor local configurado. Validar WebGL, áudio e fetch no protocolo escolhido antes de considerá-lo suportado.

## Dados e caminhos

- Desktop: main grava em `app.getPath('userData')`, subdiretórios `saves/<perfil>/` e `settings/`. Nunca escrever em `resources`, diretório de instalação, ASAR ou cwd.
- Cada slot terá envelope versionado, schema validado e migrações sequenciais testadas. Escritas serializadas, arquivo temporário no mesmo volume, flush e troca atômica quando suportada, com cópia anterior recuperável. Testar interrupção e rename no Windows; não assumir equivalência POSIX.
- Corrompidos: preservar original, oferecer recuperação do backup; nunca sobrescrever silenciosamente versões futuras. Tratar disco cheio, bloqueios antivírus, falta de permissão e múltiplas instâncias.
- IDs de slots viram nomes internos fixos; renderer não fornece paths. Usar path.join no main, nomes com caixa consistente e testar espaços, acentos, caminhos longos e usuário não administrador.
- Assets são somente leitura, empacotados e locais. Arquivos nativos futuros podem exigir `asarUnpack`; verificar DLLs/.so por plataforma e arquitetura.
- Migrar save web por exportação/importação validada, pois localStorage do navegador não é compartilhado com Electron. Não prometer migração automática.

## Entrada, janela e áudio

Gamepad API permanece no renderer; verificar hotplug, desconexão, deadzone, mudança de foco, Xbox e DualShock/DualSense em Windows/Linux. Não depender de nomes ou ordem fixa de dispositivos. Remapeamento por ações, teclado navegável e ícones dependentes da família devem preceder lançamento. Steam Input pode emular XInput: evitar eventos duplicados e testar com e sem Steam Input. Vibração é opcional, com detecção de suporte.

Fullscreen desktop será responsabilidade de BrowserWindow via IPC limitado; preservar/restaurar estado, resolução e monitor. Testar Alt-Tab, Esc, F11, DPI, redimensionamento e múltiplos monitores. Não salvar preferência de tela cheia como garantia de disponibilidade. Browser mantém Fullscreen API acionada por gesto, com erro recuperável.

Web Audio exige desbloqueio por gesto e retomada após suspensão. Implementação atual já pausa ao perder foco; testar troca de dispositivo, mute do SO, saída Bluetooth e recuperação após sleep. Volume permanece local; ausência de áudio não impede gameplay.

## Electron e electron-builder

Adicionar somente após estabilizar a arena. Fixar versões compatíveis de Electron e electron-builder no lockfile. Separar tsconfig e builds de main/preload do renderer; incluir explicitamente dist web, main e preload no pacote. `appId` do electron-builder é um identificador reverso próprio, NÃO o App ID numérico da Steam. Nome final deve ser decidido antes da primeira distribuição para estabilizar o diretório de dados.

Primeiros alvos: Windows x64 (`dir`/zip de teste) e Linux x64 (`dir`/tar.gz; AppImage após validação). Empacotar em runners do próprio SO; não usar cross-compilation como substituto dos testes nativos. Instalar/recompilar módulos nativos contra a ABI exata de Electron. Assinatura e instaladores comerciais ficam em etapa posterior, com credenciais seguras. Atualizações da distribuição Steam serão feitas pela Steam; não ativar autoUpdater por padrão.

## GitHub Actions futuro

O workflow atual valida somente o browser e armazena dist/resultados de teste. Quando main/preload e configuração builder existirem, criar `desktop-test.yml` com workflow_dispatch e pull_request, permissions contents:read e matriz:

| Runner | Arquitetura | Artefato de teste |
| --- | --- | --- |
| windows-latest | x64 | aetherion-windows-x64-<sha>.zip |
| ubuntu-latest | x64 | aetherion-linux-x64-<sha>.tar.gz |

Passos: checkout; Node 24; npm ci; unitários; build web e processos Electron; electron-builder com `--publish never`, plataforma e `--x64`; smoke do executável real; upload-artifact com retenção de 14 dias, logs e checksums SHA-256. Cache npm pela hash do lockfile; não reutilizar node_modules entre SOs. Separar diretórios de saída da aplicação e dos instaladores. Em Linux, usar display virtual quando necessário, mantendo sandbox onde suportado.

Smoke obrigatório em ambos: janela abre sem rede, assets renderizam, iniciar/mover/atacar/concluir, salvar/reabrir/restaurar, alterar configurações, tela cheia, áudio, gamepad virtual quando disponível e diretórios Unicode. Guardar screenshot e logs de erro. Um zip existente não demonstra que o jogo funciona. Testar ainda em Windows real e Fedora Linux (Wayland/X11), drivers e controles físicos antes de declarar compatibilidade. Estes pipelines nativos estão planejados, não ativos.

## Steamworks futuro

1. Após conta/parceria e App ID reais estarem disponíveis, selecionar wrapper mantido e compatível com Electron/Node ABI e licença do SDK. Revalidar documentação oficial da Valve nessa etapa. Nenhum ID fictício ou 480 será tratado como produto final.
2. Inicializar SDK no processo principal, manter callbacks, encerrar corretamente; registrar indisponibilidade e manter modo offline local. `steam_appid.txt` apenas no desenvolvimento autorizado, excluído da distribuição. Separar App ID, Depot IDs, branch de testes e appId do builder.
3. Conquistas: IDs estáveis declarados no painel Steamworks e mapeados a eventos de domínio (ex.: derrota da primeira Sentinela); fila local idempotente, carregar estatísticas antes de desbloquear, persistir com retorno confirmado e tentar de novo após reconexão. Não desbloquear a partir da renderização ou por repetição de frames.
4. Steam Cloud: escolher Auto-Cloud OU Remote Storage como dono da sincronização, evitando dois mecanismos escrevendo os mesmos arquivos. Mapear raízes Windows/Linux para saves portáveis. Separar preferências de dispositivo (monitor, áudio, bindings locais) do progresso. Isolar perfis por usuário Steam; permitir perfil offline sem misturar contas.
5. Conflitos: guardar revision/schema/build de origem, não escolher vencedor apenas pelo relógio. Preservar ambas as versões, oferecer escolha compreensível ao jogador, testar offline em dois computadores e reconexão. Verificar quotas e falhas antes de anunciar upload concluído.
6. Conquistas e Cloud não são pré-requisitos da primeira arena. Testar conta autenticada, Steam fechado, overlay, troca de conta e SDK ausente. Credenciais de publicação nunca entram no renderer, repositório ou artefatos de CI.

SteamPipe, criação de loja, submissão, publicação de depots e taxas exigem autorização explícita futura. Nenhuma dessas operações faz parte desta entrega.

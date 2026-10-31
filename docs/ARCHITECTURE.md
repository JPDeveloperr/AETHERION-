# Arquitetura — primeira arena

Decisão: TypeScript estrito, PixiJS 8 e Vite. Pixi gera toda a arte com Graphics: polígonos, curvas, elipses e linhas; nenhuma imagem externa é carregada. Fontes são do sistema. Vite usa `base: './'` para recursos relativos e distribuição em subdiretórios. Não há CDN nem backend obrigatório.

- `core/world.ts`: simulação determinística a 60 Hz, estados e combate; sem DOM, Pixi, Node ou SDK Steam.
- `math/iso.ts`: mundo x/y, projeção com altura z e transformação inversa. Altura existe na projeção; salto físico fica para a próxima entrega.
- `rendering/scene.ts`: geometria estática retida, personagens articulados e efeitos; câmera suavizada, zoom e resolução limitada a 2x.
- `input/controls.ts`: teclado, mouse e Gamepad API geram comandos sem dependência da simulação. Movimento no plano ajustado aos eixos da tela. Analógicos com zona morta; D-pad percorre menus e botão A confirma.
- `audio/synth.ts`: Web Audio inicializado por gesto; pausa ao perder foco e retomada explícita. Sons sintetizados locais.
- `platform/services.ts`: contrato assíncrono de persistência e tela cheia; adaptador browser. Não expõe caminhos nem objetos nativos.
- `main.ts`: composição, interface, ciclo fixo e tratamento de erros dos serviços.

Colisões simples por distância e limites da arena substituem Matter.js nesta entrega. Matter resolve física 2D, mas não representa por si só altura e sobreposição isométrica. Adicionar biblioteca somente quando a geometria de colisão justificar o custo.

Limitações: sem interpolação entre snapshots, articular animações mais profundamente, separar UI do bootstrap ao adicionar novas telas, oclusão de colunas ainda simplificada (objetos estáticos em camada própria). A arena atual é plana; plataformas elevadas e suas colisões ainda não existem. Geometria dinâmica é redesenhada por quadro; medir CPU/GPU antes de ampliar população. Meta de 60 FPS ainda não medida em hardware intermediário.

## Persistência atual

Settings e checkpoint têm chaves separadas (`aetherion.settings.v1` e `aetherion.checkpoint.v1`). Configurações são validadas e limitadas. Save v1 registra derrota da Sentinela e horário UTC; continuar restaura esse marco com vida cheia. Não promete restaurar cada posição ou ataque. Gravação ocorre ao vencer o inimigo e concluir a arena, sem depender de unload. Falhas de quota/permissão são apresentadas. Dados corrompidos ou versão desconhecida não são aceitos como checkpoint válido.

No desktop, injetar a implementação de PlatformServices no ponto de composição. O contrato ainda não implementa Electron: o procedimento e requisitos estão em DESKTOP_STEAM.md.

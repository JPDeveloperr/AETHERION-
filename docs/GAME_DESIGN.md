# Primeiro fragmento

Kael desperta no Santuário Partido. Objetivo: derrotar uma Sentinela Rubra e atravessar o portal a sudeste. Esta arena curta prova o ciclo de jogo; ainda não é o percurso de 5–10 minutos do projeto completo.

Kael: 100 de vida, ataque de 25 a cada 0,38 s, alcance 125 e cone frontal. Esquiva concede 0,24 s de invulnerabilidade, recarga de 1,1 s. Sentinela: 100 de vida, aproximação a 90 unidades/s, aviso de 0,8 s antes de 15 de dano, intervalo de 1,3 s entre ataques. A área vermelha é o sinal para esquivar.

WASD/setas movem e orientam em direções da tela; o cursor não orienta a espada; clique esquerdo ou J ataca; espaço esquiva; Esc pausa. Controle: analógico esquerdo move, direito aponta, X/□ ataca, A/× esquiva, Start pausa. D-pad navega menus; A confirma ou ajusta o campo selecionado. Remapeamento completo ainda está no roadmap.

Morte permite reiniciar. Derrota do inimigo salva um marco; entrar no portal conclui. Não há moeda, compra, serviço online ou autenticação necessária para jogar.

## 0.2 — O Despertar do Santuário

A mesma arena contém três encontros: Sentinela; Espectro; Sentinela + Espectro. Kael recupera até 20 HP entre encontros. O portal exige os três concluídos. Não há obstáculos novos sobre o piso jogável.

Combo com três entradas separadas: 25 / 25 / 42 de dano, knockback 15 / 15 / 32. As durações são 360 / 360 / 500 ms e cooldowns 380 / 380 / 540 ms. O reverso inverte o arco; o finalizador tem uma preparação mais longa, elevação contínua da espada e compressão do corpo. O buffer de 320 ms aceita uma entrada após os primeiros 60 ms; a janela de continuação termina 480 ms após o fim do golpe. Segurar o botão deixa de repetir, intencionalmente. Cada alvo pode receber um acerto por golpe; mover continua possível.

Espectro: 100 HP, velocidade radial de 78, órbita leve durante cooldown; tenta manter 175–265 unidades. Mira fixa anunciada por 850 ms, projétil a 230 unidades/s, 12 de dano, duração máxima 3 s. O Espectro para para preparar e disparar. Dano interrompe a preparação e causa reação de 200 ms, também na Sentinela. Kael tem uma proteção de dano de 300 ms; esquiva preserva seus 240 ms de invulnerabilidade. Limites e IDs mantêm inimigos alcançáveis e coleções limitadas.

## 0.3 — O Poder do Aether

Energia temporária 0–100, começando em 0 e sem regeneração. Cada alvo vivo atingido uma vez por golpe J rende 12 / 12 / 20; o limite de um acerto por alvo/golpe impede bônus duplicados. Acertar o ar ou inimigos mortos não rende energia. Especiais não geram energia por dano. Uma esquiva perfeita rende 20 por ataque hostil distinto evitado nos primeiros 120 ms, sem estender os 240 ms de invulnerabilidade ou o cooldown de 1,1 s. Não há bônus se a imunidade de dano já impediria o acerto.

K / RB-R1: Lâmina de Aether. Custo 35, cooldown 1,8 s, preparação 140 ms, emissão 230 ms, recuperação completa 620 ms. A frente curva avança 180 unidades em 450 ms, em um setor frontal de ±0,72 rad, com largura visual/colisão de aproximadamente 12 unidades. Dano 30 e knockback 20 por alvo, uma vez por ativação. Direção fixa; origem na posição de Kael no instante de emissão.

L / LB-L1: Nova Astral. Custo 70, cooldown 6 s, preparação/emissão 240 ms, recuperação completa 820 ms. Frente circular se expande até 135 unidades em 160 ms e aplica 45 de dano/25 de knockback uma vez por alvo ao passar. O centro é a posição no instante da emissão, sem deslocar Kael ou a câmera. Energia permanece entre encontros e volta a zero em nova partida ou checkpoint; o save v2 não muda.

Prioridade de solicitações simultâneas: esquiva, Nova, Lâmina, J. Habilidades usam uma entrada por pressão; segurar não repete. Durante J, especial, cooldown básico ou esquiva ativa, um pedido especial é rejeitado com feedback, sem buffer ou gasto. Um especial aceito limpa o buffer e a sequência J; após recuperar, J recomeça no Crescente. A esquiva e a movimentação continuam disponíveis durante uma ação já comprometida: a esquiva altera locomoção/invulnerabilidade, sem uma segunda pose corporal incompatível. Não há invulnerabilidade de habilidade. Pausa cancela e limpa especiais/ondas sem reembolsar custo; cooldowns congelam. J mantém a pausa anterior. Morte/vitória limpam efeitos.

Nenhum HP, dano, velocidade ou timing dos inimigos foi aumentado. Valores básicos J permanecem 25/25/42. A reação visual de 200 ms acrescenta um recuo suave de até 8 unidades somente na apresentação, sem modificar colisões. Sons sintetizados distinguem os três cortes, os especiais e a esquiva perfeita. Brilhos, anéis e fragmentos têm vida/contagem fixa; nenhum asset raster entra no jogo.

# BioVault Pro 5.1.0

A atualização resolve a barra de navegação do Android sobre os controles e acrescenta metas pessoais com comparação de evolução.

## Android

- Oculta apenas a navegação do sistema; o gesto a partir da borda inferior revela os controles temporariamente.
- Android 11+ usa `WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`; Android 8–10 usa immersive sticky.
- Reaplica o modo ao recuperar foco ou voltar do seletor de arquivos/instalador.
- Respeita a barra de status, recortes e teclado. O conteúdo web também reserva espaço para sua própria navegação.
- Mantém `com.biovault.pro` e o mesmo certificado. `versionCode` sobe de 50000 para 50100; atualizar preserva a instalação e seus dados.

Referência: [modo imersivo no Android](https://developer.android.com/develop/ui/views/layout/immersive).

## Metas

Depois de salvar a primeira pesagem, abre “Quais são suas metas?”. A medição já está guardada antes dessa etapa. É possível definir depois ou abrir o plano pelo botão de metas.

- Objetivo: perder peso, ganhar massa muscular, reduzir gordura e ganhar músculo, ou manter os resultados.
- Alvos opcionais de peso, gordura, músculo e gordura visceral. Pelo menos um alvo é necessário; valores não são preenchidos como metas por padrão.
- Prazo opcional com data ou atalhos de 4, 8 e 12 semanas.
- Comparação entre partida, pesagem selecionada e alvo; progresso por indicador, distância restante e primeiro registro que chegou ao alvo.
- Valores ausentes permanecem sem comparação, nunca viram zero. O prazo é de acompanhamento, não uma previsão ou prescrição automática.
- Editar preserva a partida e até 20 versões anteriores do plano. Metas entram no backup JSON.
- Cache/fila offline por UID e sincronização em `users/{uid}/goals/active`. Regras permitem acesso somente ao dono.

## Validação

- 46 regressões de medições/visualização/exportação.
- 8 verificações de contas e concorrência.
- 9 verificações de metas: primeiro uso, partida, prazos, progresso, dados ausentes, adiamento e isolamento.
- 27 verificações de regras no emulador Firestore, incluindo as metas.
- 9 verificações no servidor real com contas e documento temporários; sem alterar registros de usuários.
- APK compilado e assinatura verificada com as ferramentas oficiais Android.

O gesto do sistema precisa de conferência no aparelho físico; este ambiente não oferece um celular Android conectado.

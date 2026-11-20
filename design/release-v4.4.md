# BioVault Pro v4.4.1 — 20/11/2026

## Resultado

- Explicações adaptadas ao valor, sexo e idade registrados, em linguagem acessível.
- Músculo alto e muito alto descrito como uma reserva a preservar; separado de excesso de gordura. Sua contribuição ao gasto em repouso é explicada sem prometer emagrecimento automático.
- Todos os indicadores abrem em diálogo com X, Escape, foco contido e retorno ao mesmo ponto da página.
- Dez gráficos individuais: peso, gordura, músculo, visceral, IMC, metabolismo em repouso, idade corporal, RCQ, cintura e quadril. Resumo combinado anterior mantido.
- Filtros de indicador e de 7, 30, 90, 180 e 365 dias, além do histórico completo; janela termina na última pesagem. Comparação usa a referência selecionada. Gordura e músculo usam pontos percentuais.
- Cabeça sem traços faciais nas duas ilustrações holográficas; modos 3D e 2D anteriores mantidos.
- Idade corporal fora da faixa exibida pela Omron é sinalizada para conferir a transcrição, sem alterar o valor salvo.

## Base científica

Documento versionado em public/clinical-knowledge-v4.4.json e cópia incorporada para funcionamento offline. Nove fontes oficiais/primárias: manual Omron HBF-514C; OMS (IMC e cintura/RCQ); NIH/NIDDK; Wang et al. 2010; Ross et al. 2020; Kyle et al. 2004; EWGSOP2; Roza e Shizgal 1984. Links por indicador no diálogo.

Cópia verificada no Firestore em clinical_knowledge/biovault-v4-4, separada de measurements. A página lê somente o conteúdo revisado equivalente ao incorporado nesta versão. Nenhuma regra de acesso foi alterada.

## Preservação

Não houve migração destrutiva, edição ou exclusão de pesagens de produção. Campos antigos em português/inglês, preferências, fila offline, histórico, protocolos, filtro de jejum, metas, comparação, PDF/impressão, compartilhamento e controles do corpo foram preservados. As versões anteriores permanecem no histórico Git.

## Validação

- 38 verificações automatizadas aprovadas; suíte reproduzível em tests/.
- Revisão da página publicada em desktop e iframe de 393 × 852.
- Tela principal sem transbordamento horizontal (387 px úteis); imagens neutras carregadas.
- Pop-up de músculo muito alto legível, X visível e posição da página preservada.
- Galeria com dez gráficos e gráfico do músculo acessível diretamente pelo pop-up; unidades e dimensões verificadas.
- Base científica gravada e lida de volta, com conteúdo equivalente à cópia revisada.
- As verificações no navegador foram somente de navegação/leitura; não salvaram nem excluíram dados de saúde.

## Limites

A imagem frontal é ilustrativa: não representa exame anatômico ou termografia. A balança fornece estimativas; o conteúdo educacional não diagnostica doenças nem prescreve calorias individualmente. A suíte simula o Firestore; a conferência da publicação verifica a integração real por leitura.

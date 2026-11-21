# BioVault Pro — evolução multimarca para revisão

Base solicitada: **5.1.0**, commit `ba47615c9bee8a3cda24b7d9bb699493f9cbe665`.
Trabalho isolado em `feat/biovault-multimarca`. Esta entrega contém código, não uma atualização publicada. O APK e o feed de atualização continuam na versão publicada anteriormente.

## Análise das sugestões

As propostas de uma tela inicial pessoal, ações visíveis, quatro destinos de navegação e identificação do equipamento são válidas e foram implementadas. A generalização exige distinguir grandezas e referências: aceitar resultados de várias marcas não autoriza usar a tabela de um fabricante para todos os exames.

O cadastro continua manual, com peso/altura e perfil adulto como na base. Não foi acrescentado pareamento Bluetooth, leitura automática de arquivos de fabricantes ou interpretação de exames por IA. Resultados sem campo próprio podem ser preservados nas observações, com indicador, valor e unidade transcritos pela pessoa.

## Estrutura da tela e impacto visual

| Área | Comportamento implementado |
| --- | --- |
| Resumo inicial | Nome da pessoa ativa, último peso com data, altura informada e variação desde a pesagem anterior. Selecionar uma pesagem antiga não altera o peso atual do resumo. |
| Ações principais | “Adicionar nova pesagem” e “Adicionar nova meta” abrem os fluxos existentes. |
| Barra inferior | Exatamente Inicial, Comparações gráficas, Treino e Configuração. Está no fluxo do documento, no fim da página, sem sobrepor indicadores. |
| Histórico | Continua disponível nas ferramentas, abas e acesso rápido. Edição, exclusão, seleção e versões anteriores permanecem. |
| Treino | Resumo da última composição e objetivo pessoal, com acesso à evolução muscular e metas. Não é um diário de exercícios nem gera treino, dieta ou previsão. |
| Identidade | Fundo escuro, ciano, alertas e holograma preservados. Indicadores sem referência não recebem classificação normal por padrão. |
| Android | Mantido o código nativo 5.1 que oculta a navegação do sistema e permite revelá-la por gesto. Sem nova validação em aparelho físico nesta etapa. |

## Dados e compatibilidade

Novos registros acrescentam campos opcionais, sem migração destrutiva:

- `measurementSchema: 2` distingue a entrada multimarca de registros do app anteriormente exclusivo da Omron.
- `equipment`: nome do equipamento/laboratório, ou `null` quando não informado. O formulário não atribui Omron por padrão.
- `muscleUnit`: `percent` (% do peso corporal) ou `kg`.
- `muscleKind`: `skeletal` ou `total`. Massa magra não é tratada como músculo.
- `visceralUnit`: `index` ou `cm2`. Não há conversão automática entre índices de aparelhos e área estimada.
- `notes`: texto opcional, até 2.000 caracteres, preservado no backup, CSV e relatório da medição selecionada.

Registros anteriores sem metadados são interpretados no contexto do BioVault então exclusivo da Omron, sem regravar o equipamento nesses documentos. Campos portugueses antigos e revisões anteriores são preservados. Não se atribui retrospectivamente uma marca arbitrária a uma entrada multimarca sem equipamento.

Metas existentes conservam seus alvos e partida. Novos planos incluem `units: {muscle, visceral}` e `muscleKind`; planos antigos sem esses campos continuam usando % esquelético e nível. A pessoa define os números e o prazo; somente unidades e tipo do indicador podem ser sugeridos a partir de uma medição real. Os controles rápidos antigos não sobrescrevem metas em outras unidades.

Os limites numéricos de entrada são limites técnicos de armazenamento, não metas recomendadas nem faixas saudáveis. O peso passa a aceitar até 500 kg, independentemente da capacidade da Omron; idade/perfil adulto e altura mantêm as restrições existentes. Percentuais não são somados a massa em kg.

## Regras de interpretação e comparação

- Tabelas de gordura/músculo/visceral e textos específicos da Omron só se aplicam ao modelo e indicador compatíveis.
- Outros aparelhos preservam os valores com “Sem referência”; isso não significa resultado normal.
- Músculo em kg e percentual não é subtraído nem desenhado na mesma série. Massa muscular total e músculo esquelético também ficam separados.
- Índices viscerais e idade corporal de equipamentos diferentes não recebem delta. Equipamento ausente impede confirmar a comparabilidade desses indicadores.
- Troca de equipamento ou origem desconhecida gera aviso. Pontos de composição não são unidos por uma curva nessa situação.
- Metas só calculam progresso com definição/unidade compatíveis; índices viscerais exigem o mesmo equipamento identificado. Uma meta em % não é atingida por um valor em kg.
- Ausências continuam ausentes: sem zero fictício, alvo preenchido por padrão, diagnóstico ou prescrição automática.
- O holograma é ilustrativo, sem reconstrução anatômica, medição regional ou previsão de resultado.
- A estimativa por Harris–Benedict já existente continua identificada como cálculo, separada do repouso informado pelo equipamento.

Fontes para as distinções: [InBody — parâmetros do laudo](https://research.inbody.com/result-sheet-interpretation-parameter-keynote/), [InBody — definições dos compartimentos](https://research.inbody.com/faq/), [Kyle et al. — princípios e métodos da BIA](https://pubmed.ncbi.nlm.nih.gov/15380917/). As faixas Omron mantêm a fonte específica já citada no app. Não foi incorporada uma faixa universal nova para outras marcas.

## Isolamento e futura publicação

Continuam os caminhos `users/{uid}/measurements/{id}`, `users/{uid}/profile/main` e `users/{uid}/goals/active`. Não houve gravação em Firebase de produção, alteração do app financeiro ou implantação.

O arquivo `firestore.rules` foi atualizado **somente no código** para aceitar os novos metadados/unidades das metas e o limite técnico de peso, preservando restrição ao proprietário e leitura dos registros legados. Antes de uma futura publicação do app, as regras precisam ser revisadas e publicadas de forma coordenada. As regras atualmente em produção podem recusar planos com os novos campos e pesos acima do limite antigo; o app conserva essas alterações na fila local, sem marcar sincronização inexistente. Esta entrega não deve ser anunciada como uma atualização já instalada.

Não há conversão ou regravação em massa das pesagens. Backup JSON continua schema 1, com preservação dos campos adicionais; o CSV acrescenta colunas de unidade/tipo/observações. Na importação, os metadados são validados antes de qualquer inclusão; documentos existentes não são sobrescritos. Versões antigas do app não conhecem as novas unidades, portanto uma futura publicação deve manter app e regras compatíveis e não recomendar abrir novos dados num APK antigo.

## Arquivos principais

- `public/index.html`: resumo, navegação, formulários, metadados, interpretação, unidades, metas e exportações.
- `firestore.rules`: validação dos novos campos e metas, sempre sob o UID proprietário.
- `tests/multibrand.test.cjs`: regressões específicas da evolução.
- `tests/biovault.test.cjs`: mantidas as 46 verificações; a fixture da Omron identifica agora explicitamente o equipamento e a navegação usa os novos acessos.
- `tests/rules.test.cjs`: testes antigos e novos no emulador local.
- `tests/mobile.test.cjs`: roteiro atualizado para resumo, quatro botões, metas e larguras 360/393/768; fecha o servidor mesmo se o navegador falhar.
- `package.json` e lock: comandos de verificação e ferramentas de teste com versões fixadas. Sem nova dependência de produção.
- `public/vendor/tailwind.css`: regenerado pelo processo de build existente.

## Comandos de verificação

Na raiz do projeto, com Node compatível com as dependências e Java 21 para o emulador:

```sh
npm ci
npm ci --prefix tests
npm run build:web
npm run test:all
npx firebase emulators:exec --project demo-biovault --only firestore 'npm run test:rules'
```

Apenas em um ambiente que permita executar Chromium:

```sh
npx playwright install chromium
npm run test:mobile
```

É possível indicar um navegador já instalado com `BIOVAULT_CHROMIUM_PATH=/caminho/do/chromium`. A suíte móvel bloqueia chamadas externas e testa somente a interface local. Não é um teste do teclado ou das barras físicas do Android.

Para abrir manualmente a interface local:

```sh
python3 -m http.server 8080 --directory public
```

Usar `http://localhost:8080`, escolher o modo somente neste aparelho e dados de teste. O app de produção permanece separado.

## Resultado da verificação nesta entrega

- Build web concluído, incluindo cópia para os assets Android offline.
- 46 regressões da base, 8 de contas, 9 de metas e 18 multimarca aprovadas.
- 39 verificações de regras aprovadas no emulador `demo-biovault` — total de 120 testes aprovados, sem gravações de produção.
- O navegador automatizado foi bloqueado pelo ambiente antes de abrir a página: `socket() failed: Operation not permitted`. Portanto não se afirma aprovação visual, screenshots novas ou validação em aparelho físico.
- Nenhuma publicação, alteração de versão instalada, gravação em Firebase de produção ou modificação do financeiro.

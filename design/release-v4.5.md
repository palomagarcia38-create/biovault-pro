# BioVault Pro v4.5 — 20/11/2026

## Alterações solicitadas

- Holograma como única visualização. Controles 3D/2D e dependência Three.js removidos da experiência; nenhum renderizador GPU ou software é inicializado.
- Controles de jejum, hidratação, pós-treino e final do dia retirados. O histórico, gráficos e relatórios incluem todas as medições. Campos de protocolo dos registros antigos permanecem intactos.
- Formulário único com duas seções: pessoa (nome, idade, sexo de referência) e medição (data, peso, altura e demais indicadores). Nome e perfil são lembrados nas próximas inclusões; peso e leituras anteriores não são preenchidos automaticamente.
- Nome, personId, sexo, idade e altura são fotografados em cada registro novo, junto com equipamento e origem manual. O perfil é único neste navegador; não representa cadastro autenticado nem isolamento de contas.
- Registros antigos sem nome não são associados automaticamente a uma pessoa. Nome fica visível no histórico, relatório PDF e compartilhamento. Nenhuma pesagem de produção foi renomeada nesta atualização.

## Melhorias recuperadas da conversa sobre lançamento

- Editar pelo histórico, preservando ID e até 20 versões anteriores no próprio registro/exportação. Navegação não faz gravações.
- Exportação CSV com nomes, unidades e origem do gasto em repouso; proteção contra fórmulas em campos de texto.
- Backup JSON de todos os registros locais, incluindo metadados e versões anteriores.
- Restauração com validação e prévia; confirmação adiciona somente IDs novos, sem sobrescrever registros ou ressuscitar exclusões conhecidas. Arquivos inválidos não causam importação parcial. Limites: 5 MB e 5.000 registros.
- Somente nome, idade, sexo, data, peso e altura são obrigatórios. Outros campos ausentes permanecem nulos, sem classificações inventadas nem pontos de zero nos gráficos.
- Respeito a movimento reduzido e campos de formulário com área de toque ampliada.

## Preservação e verificação

Pop-ups científicos, fontes, gráficos por indicador, comparação, metas, PDF, compartilhamento, fila offline, dados legados e sincronização Firebase permanecem. A base científica não foi alterada. Não houve escrita em measurements durante implementação/revisão, alteração de regras nem migração destrutiva.

45 verificações automatizadas aprovadas. As verificações antigas específicas de modos/protocolos foram substituídas por verificações da retirada solicitada e preservação de dados. Testes de edição/importação utilizam registros sintéticos e Firestore simulado.

## Etapas posteriores para distribuição pública

Autenticação e isolamento de dados por conta, revisão das regras do Firebase, política de privacidade e gestão de conta exigem uma etapa própria antes de publicação comercial. Esta versão atualiza o aplicativo web existente; não declara lançamento em loja nem validação de OCR. OCR não foi adicionado sem uma base de imagens/testes de precisão.

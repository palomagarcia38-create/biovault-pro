# Verificações do BioVault Pro

A suíte executa a página real em DOM isolado, com Firestore e Chart.js simulados e geometria Three.js real. Nenhuma pesagem de produção é criada, modificada ou excluída.

## Executar

A partir da raiz do repositório:

```sh
npm ci --prefix tests
npm test --prefix tests
```

46 verificações cobrem compatibilidade de registros e preferências antigos, fila offline, exclusão por ID, falhas do Firebase, referências Omron, conteúdo contextual, abertura/fechamento do pop-up sem rolagem, dez gráficos individuais, filtros, relatório preservação das funcionalidades anteriores, perfil pessoal, campos opcionais, edição com versão anterior, CSV e importação revisada de backup. Os modos 3D/2D e filtros de protocolo foram retirados a pedido; a suíte verifica o holograma único e preservação dos dados antigos.

As fixtures contêm somente IDs de elementos das versões anteriores. Dados usados nos testes são sintéticos. A suíte não substitui a revisão visual no navegador e no celular.

No modo local, nome e pesagens permanecem no aparelho. Após autenticação, o nome e as versões das medições sincronizam somente em `users/{uid}/measurements`; o perfil fica em `users/{uid}/profile/main`. A suíte cobre os caminhos de proprietário e a preservação de dados antigos.

A versão 5.0 acrescenta 8 verificações de conta em `accounts.test.cjs` e 19 verificações de regras em `rules.test.cjs`, no emulador `demo-biovault`. Na ativação do servidor, 12 verificações adicionais de cadastro, login e autorização passaram com contas e documentos temporários, removidos após o teste. Nenhum registro real foi alterado.

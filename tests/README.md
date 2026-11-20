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

O nome e o identificador pessoal permanecem no aparelho, inclusive após sincronização e edição; não são enviados no payload das medições nem nas versões anteriores. A suíte cobre essa fronteira.

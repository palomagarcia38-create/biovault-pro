# Verificações do BioVault Pro

A suíte executa a página real em DOM isolado, com Firestore e Chart.js simulados e geometria Three.js real. Nenhuma pesagem de produção é criada, modificada ou excluída.

## Executar

A partir da raiz do repositório:

```sh
npm ci --prefix tests
npm test --prefix tests
```

38 verificações cobrem compatibilidade de registros e preferências antigos, fila offline, exclusão por ID, falhas do Firebase, referências Omron, conteúdo contextual, abertura/fechamento do pop-up sem rolagem, dez gráficos individuais, filtros, relatório e preservação das funcionalidades anteriores.

As fixtures contêm somente IDs de elementos das versões anteriores. Dados usados nos testes são sintéticos. A suíte não substitui a revisão visual no navegador e no celular.

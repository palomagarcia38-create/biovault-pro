# BIOSHAPE 5.2.0

Nome público alterado de BioVault Pro para **BIOSHAPE**, conforme solicitado. Atualização da mesma instalação: `com.biovault.pro`, mesmo certificado de assinatura, `versionCode 50200`. Cache, backup legado, ponte nativa, histórico e isolamento por UID mantidos.

Inclui a evolução multimarca detalhada em `evolucao-multimarca.md`: resumo inicial pessoal e último peso/data, ações de pesagem/meta, navegação de quatro destinos no fim da página, equipamento opcional, unidades e definições explícitas, comparações compatíveis e metas pessoais. Treino reúne dados reais de composição e acesso às metas; não prescreve exercícios.

O nome aparece na tela inicial, login, barra, relatórios, impressão, compartilhamento, nomes dos arquivos exportados, diálogos de atualização e rótulo instalado no Android. As iniciais visuais passam a BS. Identificadores internos permanecem compatíveis com o histórico.

## Publicação autorizada

Pedido “Publique” seguido de “Mude o nome para BIOSHAPE”, em 21/11/2026. As regras do arquivo `firestore.rules` foram publicadas no projeto exclusivo `bioimpedancia-59fce`; o Console confirmou a revisão ativa às 07:31 no horário de São Paulo. Nenhuma pesagem ou documento pessoal foi alterado, e o app financeiro permanece separado.

APK: `public/updates/BIOSHAPE_5.2.0.apk`. Feed compatível com os APKs anteriores em `public/updates/latest.json`, conservando o endereço de atualização para permitir atualização no mesmo app. `public/version.json` também passa a 5.2.0.

SHA-256 do APK: `f03cfc2c1e96a98c4483e0944504fe97e725d9687612502b65c088ec62faf302`.

## Verificação

- Build web e APK assinado concluídos.
- Certificado comparado com o APK 5.1.0: idêntico.
- Identificação do pacote: `com.biovault.pro`, versão 5.2.0, código 50200, rótulo BIOSHAPE.
- 46 regressões, 8 testes de contas, 9 de metas, 18 multimarca e 39 regras no emulador: 120 verificações.
- A validação automatizada local em Chromium continua limitada pelo ambiente. A instalação e o gesto da barra do Android ainda dependem de verificação em aparelho físico.
- Os documentos de preparação multimarca registram a etapa anterior sem publicação; este documento registra a preparação da versão autorizada para produção.

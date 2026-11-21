# BioVault Pro 5.0 — aplicativo pessoal para Android

O APK inclui a interface, hologramas, gráficos, estilos, ícones e SDKs Firebase. Abre sem baixar recursos visuais externos. Requer Android 8 ou superior. A assinatura usa a chave privada já existente, que permanece fora do repositório.

## Comportamento

- Entrar, criar conta com nome/e-mail/senha e recuperar senha pelo Firebase Authentication.
- Sessão persistente no aparelho; saudação com o primeiro nome e nome automático nas novas pesagens.
- Histórico e perfil em `users/{uid}/measurements/{id}` e `users/{uid}/profile/main`.
- Cache e fila offline distintos por UID; callbacks e confirmações tardias de outra conta são descartados.
- Modo local explícito preserva as chaves antigas. Importar histórico para uma conta exige revisão; não apaga o original.
- Mantém edição com versões, gráficos, interpretação de indicadores, backup JSON, CSV e impressão/PDF pelo Android.
- Atualizador verifica versão, SHA-256, nome do pacote e certificado de assinatura antes de abrir o instalador do Android. A confirmação do sistema é obrigatória; não há instalação silenciosa.
- Sem permissão de acesso geral aos arquivos. Importação e exportação usam os seletores do Android.

## Servidor ativado

Em 20/11/2026, após a reconexão da conta Google:

- Firebase Authentication ativado com o provedor E-mail/senha no projeto `bioimpedancia-59fce`.
- Regras anteriores de modo de teste substituídas por isolamento por UID. A versão anterior permanece no histórico do console.
- Cadastro, entrada, gravação/leitura do dono e bloqueio entre contas validados no serviço real com contas e documentos temporários.
- Coleção compartilhada antiga bloqueada para clientes; seus documentos permanecem armazenados.
- APK assinado e manifesto de atualização publicados e conferidos por SHA-256.

Nenhum registro real foi alterado. As coleções antigas não são apagadas nem automaticamente atribuídas ao primeiro usuário. O projeto financeiro não foi usado.

No primeiro acesso, tocar em **Criar conta** e cadastrar nome, e-mail e senha do BioVault. Nas próximas aberturas, a sessão e o nome são lembrados. O APK 5.0.0 já entregue passa a usar o servidor ativado sem reinstalação.

## Validação executada

- 46 verificações de regressão clínica, histórico, edição, gráficos e exportação.
- 8 verificações de conta, cache separado, callbacks tardios, envio em andamento, importação revisada e mensagens de acesso.
- 19 verificações no emulador Firestore: dono, outro usuário, visitante, perfil, identidade inválida e bloqueio da coleção compartilhada. Sem gravações em produção.
- 12 verificações no serviço real de Authentication/Firestore com dados sintéticos; contas e documentos temporários removidos após o teste.
- SDKs empacotados inicializam Auth e Firestore com o mesmo registro de componentes Firebase.
- Compilação e assinatura APK v2/v3 verificadas pelas ferramentas oficiais Android.

A suíte visual `tests/mobile.test.cjs` está preparada, mas o navegador headless não pôde iniciar neste ambiente por restrição a sockets. Não houve instalação em celular físico. O login e as regras foram validados separadamente no serviço real, conforme descrito acima.

## Reproduzir

```sh
npm ci
npm ci --prefix tests
npm test
npm run test:accounts
npx firebase-tools emulators:exec --project demo-biovault --only firestore 'node tests/rules.test.cjs'
npm run build:web
python3 scripts/build-android.py
```

Para o APK, definir `ANDROID_SDK_ROOT`, `JAVA_HOME`, `BIOVAULT_KEYSTORE`, `BIOVAULT_STORE_PASSWORD` e `BIOVAULT_KEY_ALIAS`. O script exige SDK 35 e Build Tools 35.0.0. Não commitar chave nem senha. O arquivo privado de assinatura já salvo é necessário para assinar atualizações compatíveis.

## Formato do canal de atualização

`https://palomagarcia38-create.github.io/biovault-pro/public/updates/latest.json`:

```json
{"version":"5.0.0","versionCode":50000,"apkUrl":"https://palomagarcia38-create.github.io/biovault-pro/public/updates/BioVault_Pro_5.0.0.apk","sha256":"SHA256_DO_APK_ASSINADO"}
```

Incrementar `versionCode` e assinar com a mesma chave. O botão não remove armazenamento nem reinstala um segundo aplicativo.

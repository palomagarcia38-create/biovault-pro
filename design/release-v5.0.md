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

## Ativação pendente no servidor

Em 20/11/2026, a consulta ao provedor retornou `CONFIGURATION_NOT_FOUND`; o serviço Authentication ainda não está configurado no projeto `bioimpedancia-59fce`. O navegador de administração está desconectado da conta Google.

Antes de liberar o acesso por conta em produção:

1. Entrar no console do projeto `bioimpedancia-59fce` e ativar Authentication > E-mail/senha.
2. Ler as regras atuais e preservar regras necessárias a outras coleções do projeto. Publicar as regras de isolamento propostas em `firestore.rules`, substituindo permissões amplas que também coincidam com os caminhos privados. Regras permissivas sobrepostas prevalecem: apenas adicionar um `allow false` não corrige um wildcard permissivo.
3. Validar criação/entrada e leitura/gravação apenas da própria conta. Nenhuma pesagem de produção foi criada durante o desenvolvimento.
4. Publicar o APK assinado e `public/updates/latest.json` no canal de atualização.

As coleções antigas não são apagadas nem automaticamente atribuídas ao primeiro usuário. Não usar o projeto do aplicativo financeiro para esta ativação.

## Validação executada

- 46 verificações de regressão clínica, histórico, edição, gráficos e exportação.
- 8 verificações de conta, cache separado, callbacks tardios, envio em andamento, importação revisada e mensagens de acesso.
- 19 verificações no emulador Firestore: dono, outro usuário, visitante, perfil, identidade inválida e bloqueio da coleção compartilhada. Sem gravações em produção.
- SDKs empacotados inicializam Auth e Firestore com o mesmo registro de componentes Firebase.
- Compilação e assinatura APK v2/v3 verificadas pelas ferramentas oficiais Android.

A suíte visual `tests/mobile.test.cjs` está preparada, mas o navegador headless não pôde iniciar neste ambiente por restrição a sockets. Não houve instalação em celular físico nem validação do login no servidor de produção.

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

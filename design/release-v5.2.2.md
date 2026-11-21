# BIOSHAPE 5.2.2

As faixas anteriores passam a ser referências de acompanhamento adotadas pelo app, também quando a origem da medição não é informada ou é de outra marca. Os valores dos limites de gordura e músculo por idade/sexo não foram alterados. A fonte continua identificada nos detalhes (manual Omron HBF-514C); isso não é uma afirmação de que essas faixas sejam validadas universalmente para qualquer aparelho.

O seletor de modelo foi retirado da interface. Existe apenas um campo opcional de origem, usado para guardar a procedência e alertar se ela mudar. A falta da origem não bloqueia as faixas nem comparações na mesma unidade/escala. Índices de origens conhecidas diferentes continuam sinalizados; kg, % e cm² não são tratados como a mesma grandeza. Massa muscular total não recebe a tabela de músculo esquelético. Idade corporal é apresentada como comparação numérica, sem atribuir seu algoritmo a uma marca desconhecida.

## Gordura estimada em kg

Abaixo do percentual de gordura há uma linha sempre visível com a massa estimada: `peso da pesagem × percentual informado ÷ 100`. Exemplo apenas ilustrativo: 80 kg × 35% ÷ 100 = 28 kg de gordura estimada.

A mesma conta aparece nos detalhes, relatório/PDF, compartilhamento e nova coluna do CSV. Usa o peso do registro selecionado, inclusive ao consultar o histórico. O resultado é derivado na apresentação; não sobrescreve pesagens, alvos ou campos originais no backup. Peso ou percentual ausente produz ausência de estimativa, nunca zero fictício.

As tabelas adotadas continuam respeitando a idade e a definição do indicador; não se inventam faixas para idades não contempladas ou unidades incompatíveis. O holograma permanece ilustrativo e animado, a barra continua fixa e Treino permanece vazio. Nenhuma previsão, diagnóstico ou prescrição automática foi adicionada.

## Verificação e entrega

- Build web e APK assinado; página dentro do APK conferida byte a byte contra o código.
- Mesmo pacote `com.biovault.pro`, certificado idêntico à versão anterior, versão 5.2.2 / código 50202.
- 46 regressões da base, 8 de contas, 9 de metas e 22 multimarca/estimativa: **85 testes aprovados**.
- Casos novos cobrem 80 kg/35%, mudança de pesagem, ausência/zero explícito, precisão do cálculo, PDF/CSV, origem opcional e preservação dos dados originais.
- Regras e caminhos Firebase inalterados; sem escrita em dados pessoais de produção ou no app financeiro.
- A instalação e os gestos do sistema ainda dependem de validação em aparelho Android físico.

APK: `public/updates/BIOSHAPE_5.2.2.apk`
SHA-256: `d93e85d232fffe20efc88668446d78f5d1071ea35d00035ecd404646bfa6bade`

Fontes mantidas: [manual Omron](https://omronhealthcare.com/storage/pdfs/1665708-0f_hbf-514c-z_e_m_web_alt_text_acc.pdf) e [InBody Report — definição de percentual de gordura](https://www.inbody.com/assets/download/2024InBody%20Report_ENG_web.pdf).

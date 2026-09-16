# Observatório da Discriminação Racial no Futebol (ODRF) - Painel de Dados

Este repositório contém o protótipo do Painel de Dados interativo para o Observatório da Discriminação Racial no Futebol.

## 1. Visão Geral e Arquitetura Técnica
O protótipo é uma aplicação web estática (SPA - Single Page Application) construída em formato *Single-File* (código condensado em um único arquivo). É uma abordagem ágil ideal para demonstrações visuais e validações rápidas de fluxo e design.

**Tecnologias e Bibliotecas Utilizadas:**
* **HTML5 & CSS3 nativos:** Não utiliza frameworks externos (como Bootstrap ou Tailwind), garantindo um código leve, limpo e de carregamento instantâneo.
* **CSS Variables (Custom Properties):** O uso do seletor `:root` permite a troca fluída entre Modo Claro (Light) e Modo Escuro (Dark) alterando apenas o atributo `data-theme` na tag raiz.
* **JavaScript Vanilla:** Toda a lógica de renderização de interface, filtragem da base de dados e navegação em abas é feita com JS puro.
* **SlimSelect (v2.8.2):** Utilizado para estilizar e aprimorar a usabilidade dos campos de seleção (`<select>`) nos filtros.
* **Chart.js:** Biblioteca responsável pela plotagem e renderização dos gráficos analíticos (barras, listas horizontais e gráfico de rosca/donut).
* **SheetJS (XLSX):** Ferramenta utilizada para permitir a exportação da tabela de dados filtrada para os formatos CSV e Excel.

## 2. Estrutura de Telas (Views)
A interface é composta por uma barra superior e um menu lateral, alternando a área de conteúdo central entre 6 seções (Views):

1. **Visão Geral:** Dashboard principal exibindo KPIs (total de casos, regiões, decisões judiciais) e gráficos de evolução histórica. Possui botões de "Acesso rápido" para aplicar filtros comuns.
2. **Consulta Avançada:** Motor de busca e filtros combinados (Ano, Região, Competição, Categoria, Desdobramento, etc.) permitindo explorar detalhadamente os casos e gerar exportações.
3. **Relatórios:** Uma vitrine conceitual para acessar os relatórios anuais em PDF já existentes do Observatório.
4. **Contato:** Formulário simulado para contato institucional, pesquisas, imprensa e sugestões.
5. **Área Interna / Admin:** Ambiente restrito (simulado por login) voltado à equipe do ODRF para checagem da integridade dos dados e pendências de revisão.
6. **Fonte de Dados & Governança:** Interface de ingestão (upload local de planilhas via navegador) e registro claro das regras de negócio que ditam o comportamento do painel.

## 3. Dinâmica de Dados e Regras de Negócio
No estágio atual, o protótipo carrega uma base de dados *mock* em formato JSON diretamente no script. Os dados tipificam ocorrências registradas desde 2014, classificadas por critérios como Estado, Gênero e o Desdobramento judicial.

**Princípios Institucionais Traduzidos em Código:**
* **Sem Rankings de Clubes:** Por decisão institucional, o painel foca na denúncia do fenômeno estrutural e seus desdobramentos judiciais. Portanto, buscas e comparações nominais por clubes foram omitidas da interface.
* **Privacidade Temporal (Ano Corrente):** Os dados do ano vigente ficam restritos à equipe interna e bloqueados para consultas públicas. Isso evita interferências metodológicas até o fechamento anual do relatório oficial.

## 4. Pontos Fortes do Protótipo
* **UI/UX:** Design elegante (paleta terrosa), legível e focado na facilidade do acesso à informação.
* **Responsividade:** Estrutura adaptável via *Media Queries*. A tabela se reconfigura para formato de *cards* em dispositivos móveis, e a barra lateral se transforma em um menu expansível.
* **Print-Friendly:** Uso eficiente de `@media print` para ocultar elementos de interface (como barras e menus) e gerar folhas de impressão limpas apenas com o conteúdo dos dados.

## 5. Próximos Passos (Evolução para Produção)
Para a conversão deste protótipo em uma aplicação de produção sustentável, sugere-se a seguinte evolução:
1. **Modularização (Separação de Arquivos):** Desmembrar o arquivo único em uma estrutura robusta de `index.html`, `style.css` e submódulos `.js`.
2. **Desacoplamento de Dados (Backend/API):** Remover o objeto JSON *mockado* do código cliente e passar a consultar as informações por meio de uma API ou banco de dados externo.
3. **Integração de Framework (React/Vue):** Caso as regras de filtragem cruzada ganhem alta complexidade, a migração para um framework reativo ajudará na estabilidade e manutenção dos estados na tela de Consulta Avançada.
4. **Otimização de Acessibilidade (a11y):** Inclusão de suporte total a navegação via teclado, alto contraste aprimorado e adição de `aria-labels` nos gráficos e componentes para leitores de tela.

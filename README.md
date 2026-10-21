# UNN-A — site e gestão de projetos

Site estático com um painel Decap em `/admin/`. Cada projeto é um ficheiro em `projetos/`; o painel gere estes ficheiros e as imagens, sem uma base de dados adicional.

## Adicionar ou editar um projeto

1. Abra `/admin/` no alojamento com autenticação configurada e inicie sessão.
2. Em **Projetos**, escolha um existente ou **Novo Projeto**.
3. Preencha o nome e um identificador único (ex.: `casa-do-rio`). Mantenha o identificador depois da primeira publicação para não quebrar links.
4. Adicione os dados conhecidos, a descrição, uma capa e as imagens. Arraste os itens da galeria para os ordenar. Campos ingleses vazios usam o texto português.
5. Confira a pré-visualização em PT e EN. **Mostrar no site** controla a visibilidade; **Abrir página** distingue projetos completos de entradas apenas no índice.
6. Guarde/publice. O alojamento gera o site a partir dos ficheiros, incluindo automaticamente projetos novos. Aguarde a publicação terminar antes de verificar o site.

**Revisão dos conteúdos** é um filtro editorial, independente da visibilidade. Novos projetos começam ocultos. Ocultar não torna os ficheiros privados num repositório público. Evite dados pessoais, documentos de clientes e credenciais nos conteúdos.

As descrições usam texto simples com parágrafos. Capa vazia usa a primeira imagem. A ficha técnica mostra apenas os dados preenchidos. Não confunda o ano de um documento com o ano do projeto ou da conclusão da obra.

## Acesso online — configuração necessária

A configuração existente usa `git-gateway`. O GitHub Pages serve o site e o painel, mas **não fornece Netlify Identity nem Git Gateway**. A presença de `/admin/` por si só não significa que guardar alterações funciona.

Para continuar com esse backend, é necessário um alojamento Netlify com Identity e Git Gateway configurados e acesso ao repositório. Abra o painel nesse alojamento; o `netlify.toml` já prepara o build. Confirme que esses serviços estão disponíveis na conta antes de escolher esta via. Alternativamente, configure o backend GitHub do Decap com um serviço OAuth apropriado. Nunca coloque tokens no HTML, no YAML nem no repositório.

Documentação: [Git Gateway](https://decapcms.org/docs/git-gateway-backend/) e [backend GitHub](https://decapcms.org/docs/github-backend/).

## Desenvolvimento e verificação local

Requer Node.js 22 ou superior.

```sh
npm ci
npm run dev
```

Noutro terminal, na mesma pasta:

```sh
npm run cms
```

Abra `http://localhost:8080/admin/`. O backend local não pede autenticação e altera os ficheiros locais; mantenha-o apenas no computador de desenvolvimento. O site lê os ficheiros atualizados sempre que a página é recarregada.

```sh
npm test
npm run build
```

O resultado está em `dist/`. O build valida identificadores, campos e existência das imagens e não publica projetos ocultos, fontes Markdown, documentação ou ficheiros soltos da raiz. Os ficheiros de imagens existentes continuam a ser copiados; a ocultação não é um mecanismo de privacidade.

## Publicação no GitHub Pages

Antes de integrar esta alteração em `main`, selecionar **Settings → Pages → Build and deployment → Source: GitHub Actions**. O workflow `.github/workflows/site.yml` testa e prepara o site em pull requests e publica `dist/` após alterações em `main`. Não usar publicação direta da raiz: o site precisa do ficheiro gerado `data/projects.json`.

No Netlify, o build e a pasta de publicação são lidos de `netlify.toml`. Cada gravação do CMS em `main` desencadeia a publicação configurada no alojamento.

## Informação dos projetos

Ver [revisão dos conteúdos](docs/content-review.md) para as fontes consultadas e os dados que ainda precisam de confirmação.

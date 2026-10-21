/* Decap supplies createClass, h, getAsset and the current unsaved entry. */
CMS.registerPreviewStyle(new URL('./preview.css', window.location.href).href);
const ProjectPreview = createClass({
  getInitialState: function () { return { lang: 'pt' }; },
  render: function () {
    const p = this.props.entry.get('data').toJS();
    const lang = this.state.lang;
    const { translated, descriptionHTML, detailsHTML } = ProjectContent;
    const title = translated(p, 'title', lang) || 'Novo projeto';
    const photo = (source, alt, key) => source ? h('img', {
      key, src: this.props.getAsset(source).toString(), alt: alt || title
    }) : null;
    return h('article', {},
      h('div', { className: 'preview-toolbar' },
        h('span', {}, p.published ? 'Visível no site' : 'Oculto no site'),
        h('button', { type: 'button', onClick: () => this.setState({ lang: lang === 'pt' ? 'en' : 'pt' }) }, lang === 'pt' ? 'Ver EN' : 'Ver PT')
      ),
      h('h1', {}, title),
      h('p', { className: 'meta' }, translated(p, 'meta', lang) || [translated(p, 'program', lang), translated(p, 'location', lang)].filter(Boolean).join(' · ')),
      p.pageEnabled === false ? h('p', {}, 'Este projeto aparece apenas no índice.') : h('div', {},
        h('div', { className: 'project-description', dangerouslySetInnerHTML: { __html: descriptionHTML(translated(p, 'description', lang)) } }),
        h('div', { dangerouslySetInnerHTML: { __html: detailsHTML(p, lang) } }),
        h('h2', {}, 'Capa do índice'),
        photo(p.coverImage || p.images?.[0]?.image, title, 'cover'),
        h('h2', {}, 'Galeria'),
        ...(p.images || []).map((item, i) => photo(item.image, translated(item, 'alt', lang), i))
      )
    );
  }
});
CMS.registerPreviewTemplate('projetos', ProjectPreview);

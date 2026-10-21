(function (global) {
  'use strict';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const translated = (project, field, lang) => (lang === 'en' && project[field + 'EN']) || project[field + 'PT'] || '';
  function imageURL(value, base = document.baseURI) {
    if (!value) return '';
    const source = String(value).replace(/^\/unn-a-site\//, '').replace(/^\//, '');
    if (/^(?:javascript|data|file):/i.test(source)) return '';
    const url = new URL(source, base);
    return ['http:', 'https:', 'blob:'].includes(url.protocol) ? url.href : '';
  }
  function descriptionHTML(value) {
    return String(value || '').trim().split(/\n\s*\n/).filter(Boolean)
      .map(paragraph => `<p>${escapeHTML(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
  }
  function detailsHTML(project, lang) {
    const en = lang === 'en';
    const fields = [
      [en ? 'Location' : 'Localização', translated(project, 'location', lang)],
      [en ? 'Programme' : 'Programa', translated(project, 'program', lang)],
      [en ? 'Intervention' : 'Intervenção', translated(project, 'intervention', lang)],
      [en ? 'Status' : 'Estado', translated(project, 'status', lang)],
      [en ? 'Project period' : 'Período do projeto', project.projectDuration],
      [en ? 'Completion' : 'Conclusão', project.completion],
      [en ? 'Gross floor area' : 'Área bruta', project.grossFloorArea],
      [en ? 'Architecture' : 'Arquitetura', project.architect],
      [en ? 'Team' : 'Equipa', project.projectTeam],
      [en ? 'Photography' : 'Fotografia', project.photography]
    ].filter(([, value]) => value);
    if (!fields.length) return '';
    return `<dl class="project-details">${fields.map(([label, value]) =>
      `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join('')}</dl>`;
  }
  global.ProjectContent = { escapeHTML, translated, imageURL, descriptionHTML, detailsHTML };
})(typeof window !== 'undefined' ? window : globalThis);

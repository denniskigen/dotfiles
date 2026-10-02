// Paste into a browser JavaScript tool (or DevTools console) on an O3 page.
// Returns the PageHeader's geometry and where the page content starts, so a
// target page can be compared with canonical ones. Run it on the shipping
// build (a Docker app shell or dev3), not only a local dev server, because
// app shell CSS can differ.
//
// PageHeader class names are hashed, so the header is found from its title:
// the heading-04 text (28px) inside a 96px-tall flex row. Returns
// { found: false } if the page has no such header.
(() => {
  const titles = [...document.querySelectorAll('p, h1, h2')].filter((el) => getComputedStyle(el).fontSize === '28px');
  let header = null;
  let title = null;
  for (const t of titles) {
    for (let el = t.parentElement; el && el !== document.body; el = el.parentElement) {
      if (getComputedStyle(el).display === 'flex' && Math.round(el.getBoundingClientRect().height) === 96) {
        header = el;
        title = t;
        break;
      }
    }
    if (header) break;
  }
  if (!header) return { url: location.pathname, found: false };

  const rect = header.getBoundingClientRect();
  const style = getComputedStyle(header);
  const svg = header.querySelector('svg');
  const range = document.createRange();
  range.selectNodeContents(title);

  // First visible text after the header.
  let content = null;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim() || header.contains(n) || !(header.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    const r = document.createRange();
    r.selectNodeContents(n);
    const b = r.getBoundingClientRect();
    if (b.width && b.top >= rect.bottom - 1) {
      content = { left: Math.round(b.left), top: Math.round(b.top), text: n.textContent.trim().slice(0, 40) };
      break;
    }
  }

  const nav = document.querySelector('.cds--header, header[aria-label]');
  return {
    url: location.pathname,
    found: true,
    viewportWidth: innerWidth,
    navBottom: nav ? Math.round(nav.getBoundingClientRect().bottom) : null,
    header: { left: Math.round(rect.left), top: Math.round(rect.top), bottom: Math.round(rect.bottom), padding: style.padding, background: style.backgroundColor, borderBottom: style.borderBottom, marginBottom: style.marginBottom },
    pictogram: svg ? { left: Math.round(svg.getBoundingClientRect().left), width: Math.round(svg.getBoundingClientRect().width), use: svg.querySelector('use')?.getAttribute('href') || null } : null,
    titleTextLeft: Math.round(range.getBoundingClientRect().left),
    content,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
})();

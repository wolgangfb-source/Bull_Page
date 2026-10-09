/** Mobile menu toggle. Returns `setTone('dark' | 'light')` so the cover can match the header to the scene behind it. */
export function initHeader() {
  const header = document.querySelector('.site-header');
  const nav = header.querySelector('#nav');
  const menu = header.querySelector('#menu');

  menu.onclick = () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', open);
  };

  nav.querySelectorAll('a').forEach(link => {
    link.onclick = () => {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', false);
    };
  });

  return {
    setTone(tone) { header.dataset.tone = tone; },
  };
}

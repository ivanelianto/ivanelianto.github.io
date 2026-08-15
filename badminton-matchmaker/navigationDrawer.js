import { $ } from './dom.js';

export function setupNavigationDrawer() {
  const toggle = $('#menu-toggle');
  const drawer = $('#navigation-drawer');
  const backdrop = $('#drawer-backdrop');
  if (!toggle || !drawer || !backdrop) return () => {};

  const openDrawer = () => {
    backdrop.hidden = false;
    requestAnimationFrame(() => {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
    });
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => {
      if (!drawer.classList.contains('open')) backdrop.hidden = true;
    }, 280);
  };

  toggle.addEventListener('click', () => {
    if (drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  });

  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });

  return closeDrawer;
}

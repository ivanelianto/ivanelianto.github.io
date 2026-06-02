const DEFAULT_LIMIT = 8;

export function createAutocompleteInput(input, {
  source,
  minChars = 2,
  limit = DEFAULT_LIMIT,
  getLabel = (item) => String(item?.label ?? item?.name ?? item ?? ''),
  onSelect = () => {},
} = {}) {
  if (!input || typeof source !== 'function') return () => {};

  const parent = input.parentElement;
  if (!parent) return () => {};

  const wrapper = document.createElement('div');
  wrapper.className = 'autocomplete-shell';
  parent.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const menu = document.createElement('div');
  menu.className = 'autocomplete-menu';
  menu.hidden = true;
  wrapper.appendChild(menu);

  let items = [];
  let activeIndex = -1;
  let open = false;

  const setOpen = (value) => {
    open = value;
    menu.hidden = !value;
    input.setAttribute('aria-expanded', value ? 'true' : 'false');
  };

  const clearActive = () => {
    activeIndex = -1;
    Array.from(menu.querySelectorAll('[data-autocomplete-index]')).forEach((btn) => {
      btn.classList.remove('active');
    });
  };

  const activate = (index) => {
    const buttons = Array.from(menu.querySelectorAll('[data-autocomplete-index]'));
    if (!buttons.length) return;
    activeIndex = ((index % buttons.length) + buttons.length) % buttons.length;
    buttons.forEach((btn, idx) => btn.classList.toggle('active', idx === activeIndex));
    buttons[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  };

  const render = (results) => {
    items = results.slice(0, limit);
    menu.hidden = true;
    menu.innerHTML = '';

    if (!items.length) {
      setOpen(false);
      clearActive();
      return;
    }

    menu.innerHTML = items
      .map((item, idx) => `
        <button type="button" class="autocomplete-item" data-autocomplete-index="${idx}">
          ${getLabel(item)}
        </button>
      `)
      .join('');

    setOpen(true);
    clearActive();
  };

  const selectItem = (item) => {
    input.value = item?.name ?? getLabel(item);
    setOpen(false);
    clearActive();
    onSelect(item);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const update = async () => {
    const query = input.value.trim();
    menu.hidden = true;
    if (query.length < minChars) {
      setOpen(false);
      menu.innerHTML = '';
      clearActive();
      return;
    }

    const results = await Promise.resolve(source(query));
    if (input.value.trim() !== query) return;
    render(Array.isArray(results) ? results : []);
  };

  const onInput = () => {
    update();
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activate(activeIndex + 1);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      activate(activeIndex - 1);
      return;
    }

    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) selectItem(item);
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      clearActive();
    }
  };

  const onMenuClick = (e) => {
    const btn = e.target?.closest?.('button[data-autocomplete-index]');
    if (!btn) return;
    e.preventDefault();
    const idx = Number(btn.getAttribute('data-autocomplete-index'));
    const item = items[idx];
    if (item) selectItem(item);
  };

  const onDocumentClick = (e) => {
    if (!wrapper.contains(e.target)) {
      setOpen(false);
      clearActive();
    }
  };

  input.setAttribute('autocomplete', 'off');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);
  menu.addEventListener('click', onMenuClick);
  document.addEventListener('click', onDocumentClick);

  const teardown = () => {
    input.removeEventListener('input', onInput);
    input.removeEventListener('keydown', onKeyDown);
    menu.removeEventListener('click', onMenuClick);
    document.removeEventListener('click', onDocumentClick);
    if (wrapper.contains(input)) {
      parent.insertBefore(input, wrapper);
      wrapper.remove();
    }
  };

  input.focus?.();
  return teardown;
}

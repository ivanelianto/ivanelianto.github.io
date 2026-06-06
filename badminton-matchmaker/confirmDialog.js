import { $ } from './dom.js';

let activeDismiss = null;

function closeActiveDialog() {
  if (typeof activeDismiss === 'function') {
    const dismiss = activeDismiss;
    activeDismiss = null;
    dismiss(false);
  }
}

export function confirmDialog(
  message,
  {
    title = 'Confirm',
    okText = 'OK',
    cancelText = 'Cancel',
    danger = true,
  } = {},
) {
  return new Promise((resolve) => {
    const modal = $('#modal');
    if (!modal) {
      resolve(window.confirm(message));
      return;
    }

    closeActiveDialog();
    if (modal.classList.contains('is-active')) modal.classList.remove('is-active');

    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (modal.classList.contains('is-active')) modal.classList.remove('is-active');
      if (activeDismiss === finish) activeDismiss = null;
      resolve(value);
    };

    const cleanup = () => {
      modal.removeEventListener('click', onBackdropClick);

      document.removeEventListener('keydown', onKeyDown);
      const okBtn = $('#confirm-ok');
      const cancelBtn = $('#confirm-cancel');
      okBtn?.removeEventListener('click', onOk);
      cancelBtn?.removeEventListener('click', onCancelClick);
      // restore focus to previously focused element
      try { previousActive?.focus?.(); } catch (e) { /* ignore */ }
      // cleanup aria attributes
      try { modal.removeAttribute('aria-modal'); } catch (e) {}
      const mainContent = document.querySelector('main') || document.querySelector('.content');
      if (mainContent) mainContent.removeAttribute('aria-hidden');
    };

    const onBackdropClick = (e) => {
      if (e.target && e.target.classList && e.target.classList.contains('modal-background')) finish(false);
    };

    const onCancel = (e) => {
      e.preventDefault();
      finish(false);
    };

    const onOk = (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    };

    const onCancelClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    };

    // Focus trap and keyboard handling
    let previousActive = null;
    const focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
        return;
      }
      if (e.key === 'Tab') {
        const focusable = Array.from(modal.querySelectorAll(focusableSelector)).filter(el => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    // Use Bulma modal markup
    modal.innerHTML = `
      <div class="modal-background"></div>
      <div class="modal-card" role="document" aria-labelledby="confirm-title">
        <header class="modal-card-head">
          <p class="modal-card-title" id="confirm-title">${title}</p>
          <button class="delete" aria-label="close" id="confirm-close"></button>
        </header>
        <section class="modal-card-body">
          <div class="has-text-light">${message}</div>
        </section>
        <footer class="modal-card-foot">
          <button type="button" class="button" id="confirm-cancel">${cancelText}</button>
          <button type="button" class="button ${danger ? 'is-danger' : 'is-primary'}" id="confirm-ok">${okText}</button>
        </footer>
      </div>
    `;

    modal.addEventListener('click', onBackdropClick);
    // Note: dialog 'cancel' event is not used for div-based Bulma modal

    const okBtn = $('#confirm-ok');
    const cancelBtn = $('#confirm-cancel');
    okBtn?.addEventListener('click', onOk);
    cancelBtn?.addEventListener('click', onCancelClick);

    // save focus, move focus into dialog and enable trap
    previousActive = document.activeElement;
    // mark modal as modal for assistive tech
    modal.setAttribute('aria-modal', 'true');
    // hide main content from AT while modal open
    const mainContent = document.querySelector('main') || document.querySelector('.content');
    if (mainContent) mainContent.setAttribute('aria-hidden', 'true');
    document.addEventListener('keydown', onKeyDown);
    // focus the first focusable element inside modal
    const focusable = Array.from(modal.querySelectorAll(focusableSelector)).filter(el => el.offsetParent !== null);
    (focusable[0] || okBtn || cancelBtn || modal).focus();

    activeDismiss = finish;
    modal.classList.add('is-active');
  });
}

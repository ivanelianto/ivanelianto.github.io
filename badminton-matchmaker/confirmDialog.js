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
    if (modal.open) modal.close();

    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (modal.open) modal.close();
      if (activeDismiss === finish) activeDismiss = null;
      resolve(value);
    };

    const cleanup = () => {
      modal.removeEventListener('click', onBackdropClick);
      modal.removeEventListener('cancel', onCancel);
      const okBtn = $('#confirm-ok');
      const cancelBtn = $('#confirm-cancel');
      okBtn?.removeEventListener('click', onOk);
      cancelBtn?.removeEventListener('click', onCancelClick);
    };

    const onBackdropClick = (e) => {
      if (e.target === modal) finish(false);
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

    modal.innerHTML = `
      <div class="modal-inner confirm-dialog" role="document" aria-labelledby="confirm-title">
        <div class="confirm-dialog-title" id="confirm-title">${title}</div>
        <div class="confirm-dialog-body">${message}</div>
        <div class="modal-actions confirm-dialog-actions">
          <button type="button" class="btn" id="confirm-cancel">${cancelText}</button>
          <button type="button" class="btn ${danger ? 'danger' : 'primary'}" id="confirm-ok">${okText}</button>
        </div>
      </div>
    `;

    modal.addEventListener('click', onBackdropClick);
    modal.addEventListener('cancel', onCancel);

    const okBtn = $('#confirm-ok');
    const cancelBtn = $('#confirm-cancel');
    okBtn?.addEventListener('click', onOk);
    cancelBtn?.addEventListener('click', onCancelClick);

    activeDismiss = finish;
    modal.showModal();
  });
}

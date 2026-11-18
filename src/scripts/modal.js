// Відкриття / закриття попапів (<dialog class="modal">), як Overlay у Framer:
// затемнення з'являється за 0.3 с і зникає за 0.3 с, саме вікно — одразу.
// Закривається хрестиком [data-modal-close], кліком по затемненню і клавішею Esc.
const CLOSE_MS = 300;

// Попап лежить у «верхньому шарі» браузера, над будь-яким z-index, тож власний курсор
// переносимо всередину відкритого попапа, а після закриття — назад.
const cursor = document.querySelector('[data-cursor]');
const cursorHome = cursor?.parentElement;
const moveCursor = () => {
  if (!cursor) return;
  const open = [...document.querySelectorAll('dialog.modal[open]')].pop();
  (open || cursorHome).append(cursor);
};

export function openModal(dialog) {
  if (dialog.open) return;
  dialog.classList.remove('is-closing');
  dialog.showModal();
  document.documentElement.classList.add('modal-open');
  moveCursor();
}

export function closeModal(dialog) {
  if (!dialog.open || dialog.classList.contains('is-closing')) return;
  dialog.classList.add('is-closing');
  setTimeout(() => {
    dialog.close();
    dialog.classList.remove('is-closing');
    if (!document.querySelector('dialog[open]')) document.documentElement.classList.remove('modal-open');
    moveCursor();
  }, CLOSE_MS);
}

document.querySelectorAll('dialog.modal').forEach((dialog) => {
  dialog.querySelectorAll('[data-modal-close]').forEach((btn) => btn.addEventListener('click', () => closeModal(dialog)));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeModal(dialog); }); // клік по затемненню
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(dialog); }); // Esc — теж з анімацією
});

// Бургер-меню і попап з формою.
// Плавний скрол до блоків уже працює через CSS (scroll-behavior у global.css).

// Бургер-меню: кнопка [data-burger], меню [data-nav]
const burger = document.querySelector('[data-burger]');
const nav = document.querySelector('[data-nav]');

if (burger && nav) {
  const setOpen = (open) => {
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => {
    setOpen(!document.body.classList.contains('nav-open'));
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
}

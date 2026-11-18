// Анімації появи на GSAP. Вмикаються атрибутами в розмітці, без нового коду:
//
//   data-anim="fade-up"   — елемент з'являється знизу при скролі
//   data-anim="fade"      — плавна поява без зсуву
//   data-anim="stagger"   — дочірні елементи з'являються по черзі (картки в сітці)
//   data-count="350"      — лічильник цифр від 0 до числа (data-suffix="+" — знак після)
//
// Для користувачів з увімкненим reduced motion анімації вимкнені.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Плавна прокрутка як у Framer (компонент Smooth Scroll, intensity 10 → Lenis duration 1).
// Зупиняється, поки відкритий попап.
const lenis = reduce ? null : new Lenis({ duration: 1 });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  const sync = () => (document.querySelector('dialog[open]') ? lenis.stop() : lenis.start());
  document.querySelectorAll('dialog').forEach((d) => new MutationObserver(sync).observe(d, { attributes: true, attributeFilter: ['open'] }));
}

function initAnimations() {
  if (reduce) return;

  const start = 'top 85%';

  gsap.utils.toArray('[data-anim="fade-up"]').forEach((el) => {
    gsap.from(el, {
      y: 30, opacity: 0, duration: 0.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start, once: true },
    });
  });

  gsap.utils.toArray('[data-anim="fade"]').forEach((el) => {
    gsap.from(el, {
      opacity: 0, duration: 0.8, ease: 'power1.out',
      scrollTrigger: { trigger: el, start, once: true },
    });
  });

  gsap.utils.toArray('[data-anim="stagger"]').forEach((el) => {
    gsap.from(el.children, {
      y: 30, opacity: 0, duration: 0.6, ease: 'power2.out', stagger: 0.1,
      scrollTrigger: { trigger: el, start, once: true },
    });
  });

  gsap.utils.toArray('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const counter = { value: 0 };
    el.textContent = `0${suffix}`;
    gsap.to(counter, {
      value: target, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start, once: true },
      onUpdate: () => { el.textContent = `${Math.round(counter.value)}${suffix}`; },
    });
  });
}

initAnimations();

// Піксель макета в реальних px (мобільний 375, ПК 1440) — для зсувів з Framer
const designPx = () => window.innerWidth / (window.innerWidth >= 768 ? 1440 : 375);

// Старт сторінки (прелоадера немає): текст першого екрана одразу м'яко проявляється по черзі
function initIntro() {
  document.documentElement.classList.add('is-ready');
  if (reduce) return;

  // Після перезавантаження починаємо зверху, інакше зум скважини «доганяє» збережену прокрутку
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  lenis?.scrollTo(0, { immediate: true });

  // Поява [data-hero-appear] — у CSS (Block1.astro), щоб не чекати на скрипти
}

// Посилання на блоки (#block-6 тощо) — плавна прокрутка через Lenis, як і решта сторінки
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href^="#"]');
  const target = a && a.getAttribute('href').length > 1 && document.querySelector(a.getAttribute('href'));
  if (!target || !lenis) return;
  e.preventDefault();
  lenis.scrollTo(target);
});

// Масштаб при скролі (як Scroll Transform у Framer):
//   data-zoom-track — блок, прокрутка якого керує анімацією
//   data-zoom="10" data-zoom-y="450" — кінцевий масштаб і зсув (px макета)
//   data-zoom-mobile / data-zoom-y-mobile — те саме для мобільного
//   data-zoom-scrub="1" — плавність (секунди), як spring у Framer
//   data-zoom-end="50%" — зум завершується за пів екрана прокрутки (на треку — для всіх)
function initZoom() {
  if (reduce) return;
  gsap.matchMedia().add({ mobile: '(max-width: 767px)', desktop: '(min-width: 768px)' }, ({ conditions }) => {
    gsap.utils.toArray('[data-zoom-track]').forEach((track) => {
      track.querySelectorAll('[data-zoom]').forEach((el) => {
        const d = el.dataset;
        const scale = Number((conditions.mobile && d.zoomMobile) || d.zoom);
        const y = Number((conditions.mobile && d.zoomYMobile) || d.zoomY || 0) * designPx();
        const x = Number(d.zoomX || 0) * designPx(); // data-zoom-x — зсув убік (px макета)
        const scrollTrigger = {
          trigger: track, start: 'top top',
          // data-zoom-end на елементі або на треку — за яку частину екрана прокрутки завершується зум
          end: (d.zoomEnd || track.dataset.zoomEnd) ? `+=${d.zoomEnd || track.dataset.zoomEnd}` : 'bottom bottom',
          scrub: Number(d.zoomScrub || 1),
        };
        gsap.fromTo(el, { scale: 1, x: 0, y: 0 }, { scale, x, y, ease: 'none', scrollTrigger });
        // data-zoom-fadeout="85" — плавно зникає з 85% зуму до кінця (щоб розмиті краї не світилися)
        if (d.zoomFadeout) {
          const from = Number(d.zoomFadeout);
          gsap.fromTo(el, { opacity: 1 }, {
            opacity: 0, ease: 'none',
            scrollTrigger: { trigger: track, start: `top -${from}%`, end: `+=${100 - from}%`, scrub: scrollTrigger.scrub },
          });
        }
        // data-zoom-fade — швидко гасне під час зуму (ефект прольоту камери)
        if (d.zoomFade !== undefined) {
          gsap.fromTo(el, { opacity: 1 }, { opacity: 0, ease: 'power2.in', scrollTrigger: { ...scrollTrigger } });
        }
        // data-zoom-blur="6" (data-zoom-blur-from="0.5") — розмиття під час зуму, у px макета (автоскейл).
        // data-zoom-blur-ease — як наростає (power1.in — повільно на початку, сильніше в кінці)
        if (d.zoomBlur) {
          const k = designPx();
          gsap.fromTo(el, { filter: `blur(${(d.zoomBlurFrom || 0) * k}px)` }, {
            filter: `blur(${d.zoomBlur * k}px)`, ease: d.zoomBlurEase || 'power3.out', scrollTrigger: { ...scrollTrigger },
          });
        }
      });
    });
  });
}

// Блок 2 (як у Framer): на початку прокрутки фото інтер'єрів змінюються кожні 0.25 с і останнє «від'їжджає»
// в рамку з макета; на середині зуму логотип летить у шапку, шапка виїжджає. Прокрутка назад — усе повертається.
//   data-b2-slides / data-b2-slide — стопка фото;  data-b2-final — кінцевий розмір фото
//   data-b2-logo / data-b2-logo-slot — логотип і його місце в шапці;  data-b2-header — шапка
function initTransition() {
  const track = document.querySelector('[data-zoom-track]');
  const box = document.querySelector('[data-b2-slides]');
  if (!track || !box) return;
  const sticky = document.querySelector('[data-zoom-sticky]');
  const slides = gsap.utils.toArray('[data-b2-slide]');
  const final = document.querySelector('[data-b2-final]');
  const logo = document.querySelector('[data-b2-logo]');
  const slot = document.querySelector('[data-b2-logo-slot]');
  const header = document.querySelector('[data-b2-header]');

  const logoY = () => header.offsetTop + slot.offsetTop + slot.offsetHeight / 2 - sticky.clientHeight / 2;
  const logoScale = () => slot.offsetWidth / logo.offsetWidth;

  if (reduce) return;

  // Усе як у Framer (тайминги з його коду):
  // 1) Фото: на середині зуму кадри змінюються кожні 0.25 с (перехід 0.4 с),
  //    потім останнє фото зменшується з повного екрана до рамки з макета (колонки 3–14, 912:513).
  const STEP = 0.25;
  const photos = gsap.timeline({ paused: true });
  slides.slice(1).forEach((s, i) => {
    photos.fromTo(s, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out' }, STEP * (i + 1));
  });
  photos.fromTo(box, { width: '100%', height: '100%' }, {
    width: () => final.offsetWidth, height: () => final.offsetHeight, duration: 1, ease: 'power3.inOut',
  }, STEP * slides.length + 0.25);

  // 2) Шапка й логотип — на середині зуму (тригер Framer): шапка виїжджає знизу на 100px, лого летить у шапку
  const head = gsap.timeline({ paused: true });
  head.fromTo(header, { autoAlpha: 0, y: () => 100 * designPx() }, { autoAlpha: 1, y: 0, duration: 1, ease: 'back.out(1.2)' }, 0)
    .fromTo(logo, { y: 0, scale: 1 }, { y: logoY, scale: logoScale, duration: 1, ease: 'back.out(1.2)' }, 0);

  // Один тригер, як у Framer (зміна варіанта фону): на середині зуму разом стартують фото, шапка й логотип.
  // До цього моменту прокрутка вперед-назад усередині скважини фото не змінює.
  ScrollTrigger.create({
    trigger: track, start: 'top -50%',
    onEnter: () => { photos.timeScale(1).play(); head.timeScale(1).play(); },
    onLeaveBack: () => { photos.timeScale(2).reverse(); head.timeScale(2).reverse(); },
  });
  // Після зміни розміру вікна перераховуємо кінцеві розміри й позиції
  ScrollTrigger.addEventListener('refresh', () => {
    [photos, head].forEach((t) => { const p = t.progress(); t.invalidate().progress(p); });
  });
}

// Розбиває текст елемента на <span class="char"> (вкладені span-и зберігаються)
function splitChars(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    [...node.textContent].forEach((ch) => {
      if (ch === ' ' || ch === '\n') { frag.append(ch); return; }
      const s = document.createElement('span');
      s.className = 'char';
      s.style.display = 'inline-block';
      s.textContent = ch;
      frag.append(s);
    });
    node.replaceWith(frag);
  });
}

// data-anim="reveal" — точна копія TextReveal з Framer: заголовок ріжеться на слова, кожне слово
// залите градієнтом (золото / темний) через background-clip: text, і за прокруткою слова по черзі
// заливаються золотом зліва направо (duration 1.7, stagger 2, scrub 1.7, від «top bottom» до «bottom center»)
function splitWords(root) {
  const out = document.createDocumentFragment();
  let word = null;
  const add = (node) => {
    if (!word) { word = document.createElement('span'); word.className = 'word'; out.append(word); }
    word.append(node);
  };
  const walk = (node) => {
    [...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 3) {
        for (const c of ch.textContent) {
          if (/\s/.test(c)) { word = null; out.append(c); } else add(document.createTextNode(c));
        }
      } else if (ch.nodeName === 'BR') { word = null; out.append(document.createElement('br')); }
      else if (ch.classList?.contains('ap__decor')) add(ch.cloneNode(true));
      else walk(ch);
    });
  };
  walk(root);
  root.replaceChildren(out);
}

function initReveal() {
  if (reduce) return;
  const css = getComputedStyle(document.documentElement);
  const lit = css.getPropertyValue('--color-beige').trim();
  const dim = css.getPropertyValue('--color-reveal-dim').trim();
  gsap.utils.toArray('[data-anim="reveal"]').forEach((el) => {
    [...el.children].forEach(splitWords);
    el.querySelectorAll('.word').forEach((w) => Object.assign(w.style, {
      background: `linear-gradient(to left, ${lit} 50%, ${dim} 50%)`,
      backgroundSize: '200% 100%', color: 'transparent',
      backgroundClip: 'text', webkitBackgroundClip: 'text',
      display: 'inline-block', whiteSpace: 'pre-wrap',
      // запас, щоб фон (а з ним і текст) не обрізав букви, що виходять за рамку слова (А, акцент над É)
      padding: '0.2em 0.1em', margin: '-0.2em -0.1em',
    }));
    gsap.matchMedia().add({ mobile: '(max-width: 767px)', desktop: '(min-width: 768px)' }, () => {
      const words = [...el.querySelectorAll('.word')].filter((w) => w.offsetParent !== null);
      gsap.to(words, {
        backgroundPosition: '-100% 0%', duration: 1.7, stagger: 2, ease: 'linear',
        scrollTrigger: { trigger: el, scrub: 1.7, start: 'top bottom', end: 'bottom center' },
      });
    });
  });
}

// data-anim="chars" — поява по літерах, як у Framer: з розмиття 5px, прозорості й повороту 90°.
// Повторюється при кожному вході в екран.
function initChars() {
  gsap.utils.toArray('[data-anim="chars"]').forEach((el) => {
    splitChars(el);
    if (reduce) return;
    const chars = el.querySelectorAll('.char');
    // Як у Framer: blur 5px + opacity, без жодного обертання; пружина bounce 0 / 0.4 с на літеру,
    // крок 0.05 с, старт через 0.5 с, повтор при кожному вході
    const spring = (t) => 1 - (1 + 9.23 * t) * Math.exp(-9.23 * t); // критично згасна пружина Framer
    gsap.fromTo(chars,
      { opacity: 0, filter: 'blur(5px)' },
      {
        opacity: 1, filter: 'blur(0px)', duration: 0.4, ease: spring, stagger: 0.05, delay: 0.5,
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', toggleActions: 'restart none restart reset' },
      });
  });
}

// data-anim="rise" — виїзд знизу на 150px з прозорості (як «Переваги» у Framer), повторюється.
//   data-delay="0.2" — затримка;  data-start="bottom bottom" — коли спрацювати (тригер — data-rise-group)
function initRise() {
  if (reduce) return;
  gsap.utils.toArray('[data-anim="rise"]').forEach((el) => {
    gsap.fromTo(el, { opacity: 0, y: () => 150 * designPx() }, {
      opacity: 1, y: 0, duration: 1, ease: 'back.out(1.2)', delay: Number(el.dataset.delay || 0),
      scrollTrigger: {
        trigger: el.closest('[data-rise-group]') || el,
        start: el.dataset.start || 'top 85%',
        toggleActions: 'play none none reverse',
        invalidateOnRefresh: true,
      },
    });
  });
}

// data-cursor — власний курсор: золота точка + світлова пляма, плавно ковзає за мишкою (lerp 0.18).
// Без ефектів наведення — завжди точка з ореолом; клік — коротке стискання.
// Лише для мишки; на сенсорних екранах і при reduced motion лишається звичайний курсор.
function initCursorGlow() {
  const el = document.querySelector('[data-cursor]');
  if (!el || reduce || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.documentElement.classList.add('has-cursor');

  const LERP = 0.18;     // інерція
  const mouse = { x: -100, y: -100 };
  const pos = { x: -100, y: -100 };

  // над клікабельним точка розростається в коло (як на Shark Agency), над полями — звичайний текстовий курсор
  const HOVER = "a, button, label, select, summary, [role='button'], .pf__card";
  const NATIVE = 'input, textarea';
  addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    el.classList.add('is-visible');
    const t = e.target;
    el.classList.toggle('is-native', !!t.closest?.(NATIVE));
    el.classList.toggle('is-hover', !t.closest?.(NATIVE) && !!t.closest?.(HOVER));
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => el.classList.remove('is-visible'));
  addEventListener('pointerdown', () => {
    el.classList.add('is-down');
    setTimeout(() => el.classList.remove('is-down'), 150);
  });

  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min((now - last) / 16.67, 3); // однакова плавність при будь-якій частоті кадрів
    last = now;
    const tx = mouse.x, ty = mouse.y;
    const k = 1 - Math.pow(1 - LERP, dt);
    pos.x += (tx - pos.x) * k;
    pos.y += (ty - pos.y) * k;
    el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// data-marquee — бігучий рядок, як Ticker у Framer: 100 px/с (px макета) уліво, проміжок між копіями
// задає CSS (gap), рядок можна тягнути (draggable) — після відпускання рух продовжується.
function initMarquee() {
  document.querySelectorAll('[data-marquee]').forEach((track) => {
    const row = track.firstElementChild;
    const item = row.firstElementChild;
    const fill = () => {
      while (row.children.length > 1) row.lastElementChild.remove();
      const need = track.offsetWidth * 2 + item.offsetWidth;
      while (row.scrollWidth < need) {
        const c = item.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        row.append(c);
      }
    };
    fill();
    addEventListener('resize', fill);

    let x = 0, dragging = false, lastX = 0;
    const cycle = () => item.offsetWidth + parseFloat(getComputedStyle(row).columnGap || 0);
    track.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; track.setPointerCapture(e.pointerId); });
    track.addEventListener('pointermove', (e) => { if (!dragging) return; x += e.clientX - lastX; lastX = e.clientX; });
    const up = () => { dragging = false; };
    track.addEventListener('pointerup', up);
    track.addEventListener('pointercancel', up);

    gsap.ticker.add((_, dt) => {
      if (!dragging && !reduce) x -= 100 * designPx() * dt / 1000;
      const c = cycle();
      if (!c) return;
      x = ((x % c) - c) % c; // тримаємо зсув у межах одного циклу — рядок безшовний
      row.style.transform = `translate3d(${x}px, 0, 0)`;
    });
  });
}

// data-dim-on-view — як варіанти «Початковий / Кінцевий» у Framer (threshold 0.5, повторюється):
// коли елемент наполовину у видимій зоні — клас is-dim (колір змінюється в CSS пружиною), при виході — назад.
function initDimOnView() {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    e.target.classList.toggle('is-dim', e.intersectionRatio >= 0.5);
  }), { threshold: [0, 0.5, 1] });
  document.querySelectorAll('[data-dim-on-view]').forEach((el) => io.observe(el));
}

// data-slider — мобільний слайдер карток, як Slideshow у Framer: перетягування, пружина
// { stiffness 200, damping 40, mass 1 }, точки внизу. На ПК вимкнений (картки стоять у макеті).
function initSlider() {
  document.querySelectorAll('[data-slider]').forEach((root) => {
    const track = root.querySelector('[data-slider-track]');
    const dots = [...root.querySelectorAll('[data-slider-dots] button')];
    const mobile = matchMedia('(max-width: 767px)');
    // x — логічна позиція: 0 = перша справжня картка на місці. Нескінченність: на мобільному
    // перед і після карток додаються їхні копії, а після зупинки позиція непомітно повертається в середину.
    let x = 0, v = 0, target = 0, index = 0, dragging = false, startX = 0, startPos = 0, lastX = 0, lastT = 0;
    const originals = [...track.children];
    const n = originals.length;
    const loop = n > 1;
    const mod = (i) => ((i % n) + n) % n;

    const step = () => {
      const [a, b] = originals;
      return b ? b.offsetLeft - a.offsetLeft : a.offsetWidth;
    };
    const setClones = (on) => {
      track.querySelectorAll('.is-clone').forEach((c) => c.remove());
      if (!on || !loop) return;
      const copies = () => originals.map((o) => {
        const c = o.cloneNode(true);
        c.classList.add('is-clone');
        c.setAttribute('aria-hidden', 'true');
        return c;
      });
      track.prepend(...copies());
      track.append(...copies());
    };
    const go = (i) => {
      index = loop ? i : Math.max(0, Math.min(n - 1, i));
      target = -index * step();
      dots.forEach((d, k) => d.classList.toggle('is-active', k === mod(index)));
    };
    // після зупинки повертаємося до справжніх карток (на тому ж кадрі, тож стрибка не видно)
    const normalize = () => {
      if (!loop || (index >= 0 && index < n)) return;
      const shift = (index - mod(index)) * step();
      index = mod(index); x += shift; target += shift;
    };
    setClones(mobile.matches);
    mobile.addEventListener('change', (e) => { setClones(e.matches); go(0); x = target; v = 0; });
    dots.forEach((d, k) => d.addEventListener('click', () => go(index - mod(index) + k)));

    track.addEventListener('pointerdown', (e) => {
      if (!mobile.matches) return;
      dragging = true; startX = lastX = e.clientX; startPos = x; lastT = performance.now(); v = 0;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const now = performance.now();
      v = (e.clientX - lastX) / Math.max(1, now - lastT) * 1000;
      lastX = e.clientX; lastT = now;
      x = startPos + (e.clientX - startX);
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      if (performance.now() - lastT > 80) v = 0; // палець зупинився перед відпусканням — без кидка
      const moved = x - startPos;
      let i = Math.round(-(x + v * 0.2) / step());
      if (i === index && Math.abs(moved) > step() * 0.15) i += moved < 0 ? 1 : -1;
      go(i);
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    addEventListener('resize', () => go(index));

    const K = 200, C = 40, M = 1;
    gsap.ticker.add((_, dt) => {
      if (!mobile.matches) { x = v = 0; return; }
      if (!dragging) {
        const s = Math.min(dt, 32) / 1000;
        if (reduce) { x = target; v = 0; }
        else {
          const a = (-K * (x - target) - C * v) / M;
          v += a * s; x += v * s;
          if (Math.abs(x - target) < 0.1 && Math.abs(v) < 0.1) { x = target; v = 0; }
        }
        if (x === target) normalize();
      }
      const base = loop ? -n * step() : 0; // зсув на копії, що стоять попереду
      track.style.transform = `translate3d(${x + base}px, 0, 0)`;
    });
  });
}

// data-defer-src / data-defer-srcset — картинки, яких не видно на першому кадрі: вантажаться після load,
// щоб не забирати канал у першого екрана
function initDeferredImages() {
  const run = () => document.querySelectorAll('[data-defer-src], [data-defer-srcset]').forEach((el) => {
    if (el.dataset.deferSrcset) el.srcset = el.dataset.deferSrcset;
    if (el.dataset.deferSrc) el.src = el.dataset.deferSrc;
  });
  // старт — перший скрол/дотик/рух миші або через 2.5 с після load (перший екран уже намальований)
  let done = false;
  const go = () => { if (done) return; done = true; run(); };
  ['scroll', 'wheel', 'touchstart', 'pointermove', 'keydown'].forEach((t) => addEventListener(t, go, { once: true, passive: true }));
  const later = () => setTimeout(go, 2500);
  if (document.readyState === 'complete') later();
  else addEventListener('load', later, { once: true });
}

initDeferredImages();
initIntro();
initCursorGlow();
initMarquee();
initDimOnView();
initSlider();
initZoom();

initTransition();
initChars();
initReveal();
initRise();

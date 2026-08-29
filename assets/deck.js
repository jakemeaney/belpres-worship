/* The expectations, one card at a time, turning like a card in your hand.
   Everything still works with no JavaScript: the cards are in the page, and
   the full list is in the drawer underneath. */
(function () {
  'use strict';

  var deck = document.getElementById('deck');
  if (!deck) return;

  var cards = Array.prototype.slice.call(deck.querySelectorAll('.card'));
  var dots = Array.prototype.slice.call(deck.querySelectorAll('.dot'));
  var prev = document.getElementById('deckPrev');
  var next = document.getElementById('deckNext');
  if (cards.length < 2) return;

  var at = 0;
  var busy = false;

  function go(to, dir) {
    if (busy) return;
    to = (to + cards.length) % cards.length;
    if (to === at) return;
    busy = true;

    var out = cards[at];
    var incoming = cards[to];

    /* Turn the outgoing card away, bring the next one round to face you. */
    incoming.style.transition = 'none';
    incoming.classList.add('is-next');
    incoming.style.transform = 'rotateY(' + (dir > 0 ? 90 : -90) + 'deg)';
    incoming.removeAttribute('aria-hidden');
    /* force the browser to take that starting position before animating */
    void incoming.offsetWidth;
    incoming.style.transition = '';

    out.classList.add('is-leaving');
    out.style.transform = 'rotateY(' + (dir > 0 ? -90 : 90) + 'deg)';
    incoming.style.transform = '';
    incoming.classList.add('is-on');

    window.setTimeout(function () {
      out.classList.remove('is-on', 'is-leaving');
      out.style.transform = '';
      out.setAttribute('aria-hidden', 'true');
      incoming.classList.remove('is-next');
      busy = false;
    }, 420);

    dots.forEach(function (d, i) {
      if (i === to) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    at = to;
  }

  cards[0].classList.add('is-on');
  prev.addEventListener('click', function () { go(at - 1, -1); });
  next.addEventListener('click', function () { go(at + 1, 1); });
  dots.forEach(function (d, i) {
    d.addEventListener('click', function () { go(i, i > at ? 1 : -1); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1, 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1, -1); }
  });

  /* Swipe, for phones. */
  var x0 = null;
  deck.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  deck.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 45) go(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
})();

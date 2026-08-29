/* A prayer for Sunday, written around the people and songs actually on it.
   No counters and nothing to click. It is here to be prayed, not tracked. */
(function () {
  'use strict';

  var mount = document.getElementById('prayList');
  if (!mount) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function first(name) {
    return String(name || '').trim().split(/\s+/)[0];
  }

  /* "Dave", "Dave and Dawn", "Dave, Dawn and Suzannah" */
  function joinNames(list) {
    if (!list.length) return '';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }

  /* A line of prayer with the real names dropped into it. */
  function line(parts) {
    var p = el('p', 'pr-line');
    parts.forEach(function (bit) {
      if (typeof bit === 'string') p.appendChild(document.createTextNode(bit));
      else p.appendChild(el('span', 'pr-name', bit.name));
    });
    return p;
  }

  function render(d) {
    mount.textContent = '';

    var band = (d.team || []).filter(function (m) { return m.team !== 'Prayer Minister'; });
    var pray = (d.team || []).filter(function (m) { return m.team === 'Prayer Minister'; });
    var songs = d.songs || [];

    var wrap = el('div', 'prayer');

    wrap.appendChild(el('p', 'pr-open', 'Father, this Sunday is Yours.'));

    if (band.length) {
      wrap.appendChild(line([
        'Be with ',
        { name: joinNames(band.map(function (m) { return first(m.name); })) },
        ' as they play. Steady the ones who arrive unsure, and keep the ones who arrive ready from leaning on themselves.',
      ]));
    }

    if (pray.length) {
      wrap.appendChild(line([
        'Give ',
        { name: joinNames(pray.map(function (m) { return first(m.name); })) },
        ' Your words for whoever comes to them, and the patience to wait for them.',
      ]));
    }

    if (songs.length) {
      wrap.appendChild(line(
        ['Take '].concat(
          songs.reduce(function (acc, s, i) {
            if (i) acc.push(i === songs.length - 1 ? ' and ' : ', ');
            acc.push({ name: s.title });
            return acc;
          }, [])
        ).concat([' and make them more than songs in a room. Let the words be true of us before they are true on a screen.'])
      ));
    } else {
      wrap.appendChild(el('p', 'pr-line',
        'Give us the songs for that morning, and let them be the ones this room needs rather than the ones we like.'));
    }

    wrap.appendChild(el('p', 'pr-line',
      'For everyone who walks in: that they would see You for who You are, and have room to answer.'));
    wrap.appendChild(el('p', 'pr-line',
      'For whoever is leading: that they would follow You, and not the plan.'));

    wrap.appendChild(el('p', 'pr-close',
      'We are asking for You. Not a good service. You.'));

    mount.appendChild(wrap);
    mount.appendChild(el('p', 'fine pr-foot',
      'Pray it as it stands, or in your own words. It rebuilds itself every week around whoever is on.'));
  }

  fetch('api/service')
    .then(function (r) { if (!r.ok) throw new Error('api'); return r.json(); })
    .then(function (d) { if (d.error) throw new Error(d.error); return d; })
    .catch(function () {
      return fetch('data/service.json').then(function (r) { return r.json(); });
    })
    .then(render)
    .catch(function () {
      mount.textContent = '';
      mount.appendChild(el('p', 'note', 'This fills in from Planning Center once the site is deployed.'));
    });
})();

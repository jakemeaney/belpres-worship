/* Upcoming service, from Planning Center.
   Tries the live API function first; falls back to the snapshot in
   data/service.json, which tools/fetch_service.py writes. That way the page
   still works locally and if PCO is unreachable. */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };
  var TEAM_ORDER = ['Modern Worship Band', 'Production', 'Pastor'];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function mins(seconds) {
    if (!seconds) return '';
    var m = Math.floor(seconds / 60), s = seconds % 60;
    return m ? m + ':' + (s < 10 ? '0' : '') + s : ':' + (s < 10 ? '0' : '') + s;
  }

  function rank(name) {
    var i = TEAM_ORDER.indexOf(name);
    return i === -1 ? TEAM_ORDER.length : i;
  }

  function group(rows, key) {
    var out = [];
    rows.forEach(function (r) {
      var found = out.find(function (g) { return g.name === r[key]; });
      if (found) found.rows.push(r);
      else out.push({ name: r[key], rows: [r] });
    });
    out.sort(function (a, b) { return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name); });
    return out;
  }

  /* Titles from Planning Center will not match our ids character for character. */
  function norm(t) {
    return String(t || '').toLowerCase()
      .replace(/['\u2019`]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
  var book = {};

  function render(d, live) {
    var when = d.plan.date + (d.plan.title ? '. ' + d.plan.title : '');
    $('#svcWhen').textContent = when;

    /* who is on */
    var team = $('#svcTeam');
    team.textContent = '';
    if (!d.team.length) {
      team.appendChild(el('p', 'note', 'Nobody scheduled yet.'));
    } else {
      group(d.team, 'team').forEach(function (g) {
        team.appendChild(el('p', 'lab grp', g.name));
        var ul = el('ul', 'roster');
        g.rows.forEach(function (m) {
          var li = el('li');
          li.setAttribute('data-status', m.status);
          li.appendChild(el('span', 'rn', m.name));
          li.appendChild(el('span', 'rp', m.position));
          li.appendChild(el('span', 'rs', m.status));
          ul.appendChild(li);
        });
        team.appendChild(ul);
      });
    }

    /* songs, linked to their chart where we have one */
    var songs = $('#svcSongs');
    songs.textContent = '';
    if (!d.songs || !d.songs.length) {
      songs.appendChild(el('p', 'note', 'Songs are not picked yet. They land here as soon as they are in Planning Center.'));
    } else {
      var ul = el('ul', 'setlist');
      d.songs.forEach(function (sg) {
        var li = el('li');
        var id = book[norm(sg.title)];
        var head = id ? el('a', 'sg-t') : el('span', 'sg-t');
        head.textContent = sg.title;
        if (id) head.href = 'songbook.html#song/' + id;
        li.appendChild(head);
        if (sg.author) li.appendChild(el('span', 'sg-a', sg.author));
        if (sg.key) li.appendChild(el('span', 'sg-k', sg.key));
        ul.appendChild(li);
      });
      songs.appendChild(ul);
    }

    var stamp = d.fetched ? new Date(d.fetched) : null;
    $('#svcSource').textContent =
      'From Planning Center' +
      (live ? '. Updates every Sunday at 3pm, once that morning is done.' : ', from the last saved copy.') +
      (stamp ? ' Read ' + stamp.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      }) + '.' : '');
  }

  function fail() {
    $('#svcWhen').textContent = 'Could not reach Planning Center.';
    ['#svcTeam', '#svcSongs'].forEach(function (id) {
      $(id).textContent = '';
      $(id).appendChild(el('p', 'note', 'Check Planning Center directly for now.'));
    });
  }

  function load() {
    return fetch('api/service')
      .then(function (r) { if (!r.ok) throw new Error('api'); return r.json(); })
      .then(function (d) {
        if (d.error) throw new Error(d.error);
        render(d, true);
      })
      .catch(function () {
        return fetch('data/service.json')
          .then(function (r) { if (!r.ok) throw new Error('snapshot'); return r.json(); })
          .then(function (d) { render(d, false); })
          .catch(fail);
      });
  }

  fetch('data/songs.json')
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      (list || []).forEach(function (sg) { book[norm(sg.title)] = sg.id; });
    })
    .catch(function () {})
    .then(load);
})();

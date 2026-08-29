/* The team inbox: questions, songs, concerns, service ideas, prayer. */
(function(){
'use strict';
var $ = function(s){ return document.querySelector(s); };
var form = $('#ask');
if(!form) return;

var send = $('#aSend'), msg = $('#aMsg'), list = $('#asks');
var priv = $('#aPrivate');
var TO = 'jmeaney@belpres.org';
var PRIVATE_BY_DEFAULT = ['Concern', 'Prayer'];

/* Each kind asks for what it actually needs. */
var SHAPE = {
  'Question':     { label: 'What is your question?',   ph: 'Required', need: 'body' },
  'Song':         { label: 'Why this one',             ph: 'Where you think it fits, or leave it blank', need: 'song' },
  'Service idea': { label: 'What is the idea?',        ph: 'Required', need: 'body' },
  'Concern':      { label: 'What is the concern?',     ph: 'Required', need: 'body' },
  'Prayer':       { label: 'What can we pray for?',    ph: 'Required', need: 'body' }
};

function shape(){
  var k = kind(), sh = SHAPE[k] || SHAPE.Question;
  $('#aBodyLabel').textContent = sh.label;
  $('#aBody').setAttribute('placeholder', sh.ph);
  Array.prototype.forEach.call(form.querySelectorAll('[data-for]'), function(f){
    f.hidden = f.getAttribute('data-for') !== k;
  });
  return sh;
}

function kind(){
  var el = form.querySelector('input[name=kind]:checked');
  return el ? el.value : 'Question';
}
function say(t, tone){ msg.textContent = t; msg.setAttribute('data-tone', tone || ''); }
function el(t, c, x){ var n = document.createElement(t); if(c) n.className = c; if(x != null) n.textContent = x; return n; }
function when(iso){
  var d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

/* Concerns and prayer are private unless somebody deliberately says otherwise. */
form.addEventListener('change', function(e){
  if(e.target.name !== 'kind') return;
  priv.checked = PRIVATE_BY_DEFAULT.indexOf(kind()) > -1;
  shape();
});

function row(r, isNew){
  var li = el('li', 'entry' + (isNew ? ' new' : ''));
  li.appendChild(el('p', 'ttl', r.kind || 'Question'));
  if(r.kind === 'Song'){
    li.appendChild(el('p', 'song', r.song));
    if(r.artist) li.appendChild(el('p', 'sub', r.artist));
    if(r.link){
      var a = el('a', 'sub link', 'Listen');
      a.href = r.link; a.target = '_blank'; a.rel = 'noopener';
      var wrap = el('p', 'sub'); wrap.appendChild(a); li.appendChild(wrap);
    }
  }
  if(r.when) li.appendChild(el('p', 'sub', r.when));
  if(r.body) li.appendChild(el('p', 'txt', r.body));
  var ln = el('p', 'ln');
  ln.appendChild(el('span', null, r.name));
  ln.appendChild(el('span', null, when(r.at)));
  li.appendChild(ln);
  var empty = $('#asksEmpty');
  if(empty) empty.remove();
  if(isNew && list.firstChild) list.insertBefore(li, list.firstChild);
  else list.appendChild(li);
}
function emptyCard(text){
  var li = el('li', 'entry empty');
  li.id = 'asksEmpty';
  li.appendChild(el('p', 'txt', text));
  return li;
}

fetch('api/ask')
  .then(function(r){ if(!r.ok) throw new Error('api'); return r.json(); })
  .then(function(items){
    list.textContent = '';
    if(!items.length){ list.appendChild(emptyCard('Nothing yet. Yours would be the first.')); return; }
    items.forEach(function(r){ row(r, false); });
  })
  .catch(function(){
    list.textContent = '';
    list.appendChild(emptyCard('The board loads once the site is deployed.'));
  });

/* If the backend is unreachable, hand it to their mail app so it still arrives. */
function fallback(d){
  var lines = ['Kind: ' + d.kind, 'From: ' + d.name, d.private ? 'Private' : 'For the board'];
  if(d.song)   lines.push('Song: ' + d.song);
  if(d.artist) lines.push('Artist: ' + d.artist);
  if(d.link)   lines.push('Link: ' + d.link);
  if(d.when)   lines.push('When: ' + d.when);
  var body = lines.concat(['', d.body]).join('\n');
  window.location.href = 'mailto:' + TO +
    '?subject=' + encodeURIComponent(d.kind + ' from ' + d.name) +
    '&body=' + encodeURIComponent(body);
  say('Opening your email app so this still reaches Jake. Send the message it drafts.', '');
}

/* Arriving from a song sheet: preselect Song and fill it in. */
(function(){
  var q = new URLSearchParams(location.search);
  if(!q.get('song')) return;
  var r = form.querySelector('input[name=kind][value="Song"]');
  if(r){ r.checked = true; r.dispatchEvent(new Event('change', { bubbles:true })); }
  $('#aSong').value = q.get('song') || '';
  $('#aArtist').value = q.get('artist') || '';
  $('#aName').focus();
})();

form.addEventListener('submit', function(e){
  e.preventDefault();
  var sh = SHAPE[kind()] || SHAPE.Question;
  var d = {
    name: $('#aName').value.trim(),
    kind: kind(),
    song: $('#aSong').value.trim(),
    artist: $('#aArtist').value.trim(),
    link: $('#aLink').value.trim(),
    when: $('#aWhen').value.trim(),
    body: $('#aBody').value.trim(),
    private: priv.checked
  };
  if(!d.name){ say('Add your name so we know who to come back to.', 'bad'); $('#aName').focus(); return; }
  if(sh.need === 'song' && !d.song){ say('Which song? Add a title and send it again.', 'bad'); $('#aSong').focus(); return; }
  if(sh.need === 'body' && !d.body){ say('Add a line or two about what you want to say.', 'bad'); $('#aBody').focus(); return; }

  send.disabled = true;
  say('Sending...', '');

  fetch('api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(d)
  })
    .then(function(r){ if(!r.ok) throw new Error('api'); return r.json(); })
    .then(function(saved){
      ['#aBody','#aSong','#aArtist','#aLink','#aWhen'].forEach(function(id){ $(id).value = ''; });
      if(d.private) say('Sent to Jake. It stays off the board.', 'good');
      else { row(saved.at ? saved : d, true); say('Sent, and it is on the board.', 'good'); }
    })
    .catch(function(){ fallback(d); })
    .then(function(){ send.disabled = false; });
});
shape();
})();

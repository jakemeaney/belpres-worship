/* Chart Room */
(function(){
'use strict';

var $  = function(s){ return document.querySelector(s); };
var el = function(t, c, x){ var n = document.createElement(t); if(c) n.className = c; if(x != null) n.textContent = x; return n; };

var KEYS  = ['F','C','G','D','A','E','B'];              /* circle of fifths */
var SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
var FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
var NAT   = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
var DEG   = ['1','b2','2','b3','3','4','#4','5','b6','6','b7','7'];
var CHORD = /^([A-G][#b]*)(.*)$/;

function norm(s){
  /* Apostrophes vanish so "Porter's Gate" answers to "porters gate";
     every other mark becomes a space. */
  return String(s).toLowerCase().replace(/['’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/* ============================================================
   Chords
   ============================================================ */
function pcOf(note){
  var p = NAT[note.charAt(0).toUpperCase()];
  for(var i = 1; i < note.length; i++){
    if(note.charAt(i) === '#') p++;
    else if(note.charAt(i) === 'b') p--;
  }
  return ((p % 12) + 12) % 12;
}
function mod12(n){ return ((n % 12) + 12) % 12; }

/* Of our seven keys only F wants flats; everything else spells sharp. */
function flatsFor(key){ return key === 'F'; }

function shiftChord(tok, steps, flats){
  return tok.split('/').map(function(part){
    var m = CHORD.exec(part);
    if(!m) return part;
    return (flats ? FLAT : SHARP)[mod12(pcOf(m[1]) + steps)] + m[2];
  }).join('/');
}
function numberChord(tok, keyPc){
  return tok.split('/').map(function(part){
    var m = CHORD.exec(part);
    if(!m) return part;
    return DEG[mod12(pcOf(m[1]) - keyPc)] + m[2];
  }).join('/');
}

/* ============================================================
   ChordPro
   ============================================================ */
var META = ['title','t','subtitle','st','artist','key','tempo','time','capo','ccli'];

function splitLine(line){
  var chunks = [], re = /\[([^\]]*)\]/g, last = 0, pending = null, m;
  while((m = re.exec(line))){
    var text = line.slice(last, m.index);
    if(pending === null){ if(text) chunks.push({ chord:'', text:text }); }
    else chunks.push({ chord:pending, text:text });
    pending = m[1];
    last = re.lastIndex;
  }
  var tail = line.slice(last);
  if(pending === null) chunks.push({ chord:'', text:tail });
  else chunks.push({ chord:pending, text:tail });
  return chunks;
}

var BARE_SECTION = /^\s*(verse|chorus|bridge|intro|outro|tag|pre-?chorus|instrumental|interlude|turnaround|vamp|refrain|ending|coda|channel|breakdown)\b[^a-z]*$/i;

function parseChordPro(src){
  var meta = {}, out = [];
  src.split(/\r?\n/).forEach(function(raw){
    var line = raw.replace(/\s+$/, '');
    if(/^\s*#/.test(line)) return;

    var d = /^\s*\{\s*([^:}]+?)\s*(?::\s*([\s\S]*?))?\s*\}\s*$/.exec(line);
    if(d){
      var name = d[1].toLowerCase(), val = (d[2] || '').trim();
      if(META.indexOf(name) > -1){
        meta[name === 't' ? 'title' : name === 'st' ? 'subtitle' : name] = val;
      } else if(/^(comment|c|comment_italic|ci)$/.test(name)){
        out.push({ type:'section', text:val });
      } else if(/^(start_of_chorus|soc)$/.test(name)){
        out.push({ type:'chorus', on:true });
        out.push({ type:'section', text: val || 'Chorus' });
      } else if(/^(end_of_chorus|eoc)$/.test(name)){
        out.push({ type:'chorus', on:false });
      } else if(/^(start_of_(verse|bridge|part|tab|grid)|sov|sob)$/.test(name)){
        if(val) out.push({ type:'section', text:val });
      }
      return;
    }

    if(!line.trim()){ out.push({ type:'blank' }); return; }
    if(line.indexOf('[') === -1 && BARE_SECTION.test(line)){
      out.push({ type:'section', text: line.trim().replace(/:+$/, '') });
      return;
    }
    out.push({ type:'line', chunks: splitLine(line) });
  });
  return { meta:meta, body:out };
}

/* Render into `mount`, transposed by `steps` (or as scale degrees). */
function renderChart(mount, parsed, steps, targetKey, numbers, srcKeyPc){
  mount.textContent = '';
  var flats = flatsFor(targetKey);
  var host = mount, chorus = null;

  parsed.body.forEach(function(node){
    if(node.type === 'chorus'){
      if(node.on){ chorus = el('div', 'chorus'); mount.appendChild(chorus); host = chorus; }
      else { chorus = null; host = mount; }
      return;
    }
    if(node.type === 'section'){ host.appendChild(el('p', 'sec', node.text)); return; }
    if(node.type === 'blank'){ host.appendChild(el('div', 'ln')); return; }

    var only = node.chunks.every(function(c){ return !c.text.trim(); });
    var line = el('span', 'ln' + (only ? ' chords-only' : ''));
    var any = false;

    node.chunks.forEach(function(c){
      var ck = el('span', 'ck');
      var label = '';
      if(c.chord){
        any = true;
        label = numbers ? numberChord(c.chord, srcKeyPc) : shiftChord(c.chord, steps, flats);
      }
      ck.appendChild(el('b', null, label));
      ck.appendChild(el('i', null, c.text));
      line.appendChild(ck);
    });

    if(!any) line.className += ' plain';
    host.appendChild(line);
  });
}

/* Rebuild ChordPro text in the target key, for download. */
function chartSource(src, steps, targetKey){
  var flats = flatsFor(targetKey);
  var out = src.replace(/\[([^\]]*)\]/g, function(_, c){
    return '[' + shiftChord(c, steps, flats) + ']';
  });
  if(/\{\s*key\s*:/i.test(out)) out = out.replace(/\{\s*key\s*:[^}]*\}/i, '{key: ' + targetKey + '}');
  else out = '{key: ' + targetKey + '}\n' + out;
  return out;
}

/* ============================================================
   State
   ============================================================ */
var songs = [], byId = {}, sheetSong = null, sheetKey = 'G';
var parsedChart = null, chartRaw = '', numbers = false;
var audio = new Audio(); audio.preload = 'metadata';
var seeking = false;
var query = '', facet = 'all', order = 'title';

function audioUrl(song, key){ return 'audio/' + song.id + '/' + song.id + '-' + key + '.mp3'; }

/* ============================================================
   Stage mode
   Rehearsal rooms are dim. Remembered per device.
   ============================================================ */
var stageBtn = $('#stageBtn');
function setStage(on){
  document.documentElement.setAttribute('data-stage', on ? 'on' : 'off');
  if(stageBtn) stageBtn.setAttribute('aria-pressed', String(on));
  var meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', on ? '#14201F' : '#FDFCF9');
  try{ localStorage.setItem('cr.stage', on ? '1' : '0'); }catch(e){}
}
setStage((function(){ try{ return localStorage.getItem('cr.stage') === '1'; }catch(e){ return false; } })());
if(stageBtn) stageBtn.addEventListener('click', function(){
  setStage(stageBtn.getAttribute('aria-pressed') !== 'true');
});

/* ============================================================
   Library
   ============================================================ */
var listEl = $('#songs'), qEl = $('#q'), chipsEl = $('#chips');
var countEl = $('#count'), noHits = $('#noHits'), clearQ = $('#clearQ');

function ready(s){ return !!s.chart || !!(s.audio && s.audio.length); }

/* A song is a match when the text query and the active facet both pass. */
function matches(s){
  if(query && s._s.indexOf(query) === -1) return false;
  if(facet === 'chart')  return !!s.chart;
  if(facet === 'track')  return !!(s.audio && s.audio.length);
  if(facet.indexOf('a:') === 0) return s._a.indexOf(facet.slice(2)) > -1;
  return true;
}

function sorted(list){
  var out = list.slice();
  if(order === 'artist'){
    out.sort(function(a, b){
      return a._a.localeCompare(b._a) || a._t.localeCompare(b._t);
    });
  } else if(order === 'ready'){
    out.sort(function(a, b){
      return (ready(b) - ready(a)) || a._t.localeCompare(b._t);
    });
  } else {
    out.sort(function(a, b){ return a._t.localeCompare(b._t); });
  }
  return out;
}

function pill(cls, text){ return el('span', 'pill ' + cls, text); }

function songRow(s){
  var li = el('li', 'song');
  li.dataset.id = s.id;

  var hit = el('button', 'song-hit');
  hit.type = 'button';

  var main = el('span', 'song-main');
  main.appendChild(el('span', 'song-title', s.title));
  main.appendChild(el('span', 'song-artist', s.artist));
  hit.appendChild(main);

  var meta = el('span', 'song-meta');
  if(s.chart) meta.appendChild(pill('pill-chart', 'Chart'));
  var n = (s.audio || []).length;
  if(n) meta.appendChild(pill('pill-track', n + ' keys'));

  var chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chev.setAttribute('class', 'chev');
  chev.setAttribute('viewBox', '0 0 16 16');
  chev.setAttribute('aria-hidden', 'true');
  var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', 'M6 2.5 11.5 8 6 13.5');
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '1.8');
  p.setAttribute('stroke-linecap', 'round');
  p.setAttribute('stroke-linejoin', 'round');
  chev.appendChild(p);
  meta.appendChild(chev);

  hit.appendChild(meta);
  hit.addEventListener('click', function(){ openSheet(s.id); });
  li.appendChild(hit);
  return li;
}

function renderLibrary(){
  var list = sorted(songs.filter(matches));
  listEl.textContent = '';

  /* Letter headings only make sense when the list is in title order. */
  var letters = (order === 'title' && !query), seen = '';
  list.forEach(function(s){
    if(letters){
      var c = s._t.charAt(0).toUpperCase();
      if(!/[A-Z]/.test(c)) c = '#';
      if(c !== seen){
        seen = c;
        var h = el('li', 'alpha', c);
        h.setAttribute('aria-hidden', 'true');
        listEl.appendChild(h);
      }
    }
    listEl.appendChild(songRow(s));
  });

  var n = list.length;
  noHits.hidden = n > 0;
  listEl.hidden = n === 0;
  countEl.textContent = n === songs.length
    ? songs.length + ' songs'
    : n + (n === 1 ? ' song' : ' songs') + ' of ' + songs.length;
}

qEl.addEventListener('input', function(){
  query = norm(qEl.value);
  clearQ.hidden = !qEl.value;
  renderLibrary();
});
clearQ.addEventListener('click', function(){
  qEl.value = ''; query = ''; clearQ.hidden = true;
  qEl.focus();
  renderLibrary();
});

chipsEl.addEventListener('click', function(e){
  var b = e.target.closest('button[data-k]');
  if(!b) return;
  /* Tapping the live chip turns it off rather than stranding the volunteer. */
  facet = (b.dataset.k === facet) ? 'all' : b.dataset.k;
  Array.prototype.forEach.call(chipsEl.querySelectorAll('button[data-k]'), function(x){
    x.setAttribute('aria-pressed', String(x.dataset.k === facet));
  });
  renderLibrary();
});

$('#sort').addEventListener('change', function(){
  order = this.value;
  renderLibrary();
});

$('#resetAll').addEventListener('click', function(){
  qEl.value = ''; query = ''; clearQ.hidden = true; facet = 'all';
  Array.prototype.forEach.call(chipsEl.querySelectorAll('button[data-k]'), function(x){
    x.setAttribute('aria-pressed', String(x.dataset.k === 'all'));
  });
  renderLibrary();
});

/* "/" jumps to the search box, the way it does everywhere else. */
document.addEventListener('keydown', function(e){
  if(e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  if(!sheet.hidden) return;
  var t = e.target.tagName;
  if(t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
  e.preventDefault();
  qEl.focus();
  qEl.select();
});

/* ============================================================
   Song sheet
   ============================================================ */
var sheet = $('#sheet'), sheetBg = $('#sheetBg'), wheel = $('#shWheel');
var chartEl = $('#shChart'), noChart = $('#shNoChart'), tools = $('#shTools');
var player = $('#shPlayer'), noTrack = $('#shNoTrack'), trackN = $('#shTrackN');
var playBtn = $('#shPlay'), seek = $('#shSeek'), timeEl = $('#shTime'), dl = $('#shDl');
var lastFocus = null;

KEYS.forEach(function(k){
  var b = el('button', null, k);
  b.type = 'button';
  b.dataset.k = k;
  b.setAttribute('aria-pressed', 'false');
  b.setAttribute('aria-label', 'Key of ' + k);
  b.addEventListener('click', function(){ selectKey(k); });
  wheel.appendChild(b);
});

function openSheet(id){
  var s = byId[id];
  if(!s) return;
  lastFocus = document.activeElement;
  sheetSong = s;

  $('#shTitle').textContent = s.title;
  $('#shArtist').textContent = s.artist;
  $('#shPc').href = s.praisecharts;

  chartRaw = '';
  parsedChart = null;
  numbers = false;
  $('#mChords').setAttribute('aria-pressed', 'true');
  $('#mNums').setAttribute('aria-pressed', 'false');

  sheet.hidden = false;
  sheetBg.hidden = false;
  document.body.classList.add('locked');
  history.replaceState(null, '', '#song/' + s.id);
  $('#shBody').scrollTop = 0;
  $('#shClose').focus();

  /* Open in the song's own key when we know it, otherwise our house key. */
  var start = (s.key && KEYS.indexOf(s.key) > -1) ? s.key : (s.audio && s.audio.length ? s.audio[0] : 'G');
  selectKey(start);

  if(s.chart) loadChart(s);
  else showNoChart(s);
}

function closeSheet(){
  audio.pause();
  sheet.hidden = true;
  sheetBg.hidden = true;
  document.body.classList.remove('locked');
  history.replaceState(null, '', location.pathname + location.search);
  sheetSong = null;
  if(lastFocus && lastFocus.focus) lastFocus.focus();
}
$('#shClose').addEventListener('click', closeSheet);
sheetBg.addEventListener('click', closeSheet);
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && !sheet.hidden) closeSheet();
});

function selectKey(k){
  sheetKey = k;
  var home = sheetSong ? sourceKey() : null;
  Array.prototype.forEach.call(wheel.children, function(b){
    b.setAttribute('aria-pressed', String(b.dataset.k === k));
    b.classList.toggle('home', b.dataset.k === home);
  });
  paintChart();
  loadTrack();
}

/* ---- track ---- */
function loadTrack(){
  var s = sheetSong;
  if(!s) return;
  var has = s.audio && s.audio.indexOf(sheetKey) > -1;

  Array.prototype.forEach.call(wheel.children, function(b){
    b.classList.toggle('none', !!(s.audio && s.audio.length) && s.audio.indexOf(b.dataset.k) === -1);
  });

  audio.pause();
  playBtn.setAttribute('aria-pressed', 'false');

  if(!has){
    player.hidden = true;
    noTrack.hidden = false;
    trackN.textContent = '';
    noTrack.textContent = '';
    if(s.audio && s.audio.length){
      noTrack.appendChild(el('p', 'blank-t', 'No track in ' + sheetKey + ' yet'));
      noTrack.appendChild(el('p', 'blank-p',
        'This one is rendered in ' + s.audio.join(', ') + '. Tap one of those keys to hear it.'));
    } else {
      noTrack.appendChild(el('p', 'blank-t', 'No rehearsal track yet'));
      noTrack.appendChild(el('p', 'blank-p',
        'Nothing has been recorded for this song so far. The chart below still transposes.'));
    }
    return;
  }

  noTrack.hidden = true;
  player.hidden = false;
  trackN.textContent = 'Key of ' + sheetKey;
  audio.src = audioUrl(s, sheetKey);
  audio.load();
  dl.href = audio.src;
  dl.setAttribute('download', s.id + '-' + sheetKey + '.mp3');
}

playBtn.addEventListener('click', function(){
  if(audio.paused) audio.play().catch(function(){}); else audio.pause();
});
audio.addEventListener('play',  function(){ playBtn.setAttribute('aria-pressed', 'true');  playBtn.setAttribute('aria-label', 'Pause'); });
['pause','ended'].forEach(function(ev){
  audio.addEventListener(ev, function(){ playBtn.setAttribute('aria-pressed', 'false'); playBtn.setAttribute('aria-label', 'Play'); });
});
function fmt(s){
  if(!isFinite(s) || s < 0) s = 0;
  var m = Math.floor(s / 60), r = Math.floor(s % 60);
  return m + ':' + (r < 10 ? '0' : '') + r;
}
['timeupdate','loadedmetadata','durationchange'].forEach(function(ev){
  audio.addEventListener(ev, function(){
    var d = audio.duration || 0, c = audio.currentTime || 0;
    if(!seeking) seek.value = d ? Math.round(c / d * 1000) : 0;
    timeEl.textContent = fmt(c) + ' / ' + fmt(d);
  });
});
seek.addEventListener('input',  function(){ seeking = true; });
seek.addEventListener('change', function(){
  if(audio.duration) audio.currentTime = seek.value / 1000 * audio.duration;
  seeking = false;
});

/* ---- chart ---- */
/* Written for the volunteer holding the phone, not for whoever
   maintains the folder. The way out is PraiseCharts or a request. */
function showNoChart(s){
  chartEl.textContent = '';
  tools.hidden = true;
  noChart.hidden = false;
  noChart.textContent = '';
  $('#shPc').parentNode.hidden = true;

  noChart.appendChild(el('p', 'blank-t', 'No chart for this one yet'));
  noChart.appendChild(el('p', 'blank-p',
    'Nobody has typed this song into the songbook, so there is nothing here to transpose. ' +
    'The official chart is on PraiseCharts in the meantime.'));

  var row = el('p', 'controls');
  var pc = el('a', 'btn btn-key btn-sm', 'Open on PraiseCharts');
  pc.href = s.praisecharts;
  pc.target = '_blank';
  pc.rel = 'noopener';
  row.appendChild(pc);

  var ask = el('button', 'btn btn-sm', 'Ask for this chart');
  ask.type = 'button';
  ask.addEventListener('click', function(){ askFor(s); });
  row.appendChild(ask);

  noChart.appendChild(row);
}

/* Requests moved to the Ask page; carry the song across in the URL. */
function askFor(s){
  location.href = 'ask.html?kind=Song&song=' + encodeURIComponent(s.title) +
                  '&artist=' + encodeURIComponent(s.artist);
}

function loadChart(s){
  fetch('data/charts/' + s.id + '.pro')
    .then(function(r){ if(!r.ok) throw new Error('missing'); return r.text(); })
    .then(function(txt){
      if(sheetSong !== s) return;                 /* user moved on */
      chartRaw = txt;
      parsedChart = parseChordPro(txt);
      if(!s.key && parsedChart.meta.key) s.key = parsedChart.meta.key;
      noChart.hidden = true;
      tools.hidden = false;
      $('#shPc').parentNode.hidden = false;
      selectKey(sheetKey);                        /* re-mark the home key */
      paintChart();
    })
    .catch(function(){ if(sheetSong === s) showNoChart(s); });
}

/* Semitones from the chart's written key to the selected key, nearest way round. */
function stepsFor(){
  var srcPc = pcOf(sourceKey());
  var n = mod12(pcOf(sheetKey) - srcPc);
  return n > 6 ? n - 12 : n;
}
function sourceKey(){
  return (sheetSong && sheetSong.key) || (parsedChart && parsedChart.meta.key) || 'C';
}

function paintChart(){
  if(!parsedChart || !sheetSong) return;
  var srcPc = pcOf(sourceKey());
  renderChart(chartEl, parsedChart, stepsFor(), sheetKey, numbers, srcPc);
  $('#shArtist').textContent = sheetSong.artist + ' · Key of ' + sheetKey +
    (numbers ? ' · Nashville numbers' : '');
}

$('#mChords').addEventListener('click', function(){
  numbers = false;
  this.setAttribute('aria-pressed', 'true');
  $('#mNums').setAttribute('aria-pressed', 'false');
  paintChart();
});
$('#mNums').addEventListener('click', function(){
  numbers = true;
  this.setAttribute('aria-pressed', 'true');
  $('#mChords').setAttribute('aria-pressed', 'false');
  paintChart();
});

var size = parseInt(localStorage.getItem('cr.size') || '17', 10);
function setSize(n){
  size = Math.min(30, Math.max(12, n));
  document.documentElement.style.setProperty('--chart-size', size + 'px');
  try{ localStorage.setItem('cr.size', String(size)); }catch(e){}
}
setSize(size);
$('#szUp').addEventListener('click',   function(){ setSize(size + 1); });
$('#szDown').addEventListener('click', function(){ setSize(size - 1); });
$('#shPrint').addEventListener('click', function(){ window.print(); });
$('#shSave').addEventListener('click', function(){
  if(!chartRaw) return;
  var text = chartSource(chartRaw, stepsFor(), sheetKey);
  var a = el('a');
  a.href = URL.createObjectURL(new Blob([text], { type:'text/plain' }));
  a.download = sheetSong.id + '-' + sheetKey + '.pro';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
});

/* ============================================================
   Boot
   ============================================================ */
fetch('data/songs.json')
  .then(function(r){ return r.json(); })
  .then(function(list){
    songs = list;
    /* Precompute the search and sort keys once rather than per keystroke. */
    songs.forEach(function(s){
      s._s = norm(s.title + ' ' + s.artist);
      s._t = norm(s.title);
      s._a = norm(s.artist);
      byId[s.id] = s;
    });
    renderLibrary();
    var m = /^#song\/(.+)$/.exec(location.hash);
    if(m && byId[m[1]]) openSheet(m[1]);
  })
  .catch(function(){
    listEl.hidden = true;
    noHits.hidden = false;
    noHits.textContent = '';
    noHits.appendChild(el('p', 'blank-t', 'The songbook did not load'));
    noHits.appendChild(el('p', 'blank-p',
      'Reload the page. If you are running this locally, serve the folder over http rather than opening the file directly.'));
  });

})();

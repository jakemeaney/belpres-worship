/* The welcome video on the home page.
   Drop the file at video/welcome.mp4 (and optionally video/welcome.jpg as a
   still). Until it is there, the card says so instead of showing a broken
   player. */
(function(){
'use strict';
var wrap = document.getElementById('welcome');
var btn  = document.getElementById('vplay');
if(!wrap || !btn) return;

var SRC = 'video/welcome.mp4';
var POSTER = 'video/welcome.jpg';
var ready = false;

fetch(SRC, { method: 'HEAD' })
  .then(function(r){ ready = r.ok; })
  .catch(function(){ ready = false; })
  .then(function(){
    if(ready){
      wrap.classList.add('has-video');
      fetch(POSTER, { method: 'HEAD' })
        .then(function(r){ if(r.ok) wrap.style.backgroundImage = 'url(' + POSTER + ')'; })
        .catch(function(){});
    } else {
      document.getElementById('vd').textContent = 'Not recorded yet. Save it as video/welcome.mp4';
      btn.setAttribute('aria-disabled', 'true');
    }
  });

btn.addEventListener('click', function(){
  if(!ready) return;
  var v = document.createElement('video');
  v.src = SRC;
  v.controls = true;
  v.autoplay = true;
  v.playsInline = true;
  v.setAttribute('poster', POSTER);
  wrap.textContent = '';
  wrap.classList.add('playing');
  wrap.appendChild(v);
  v.play().catch(function(){});
});
})();

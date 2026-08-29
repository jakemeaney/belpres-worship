/* Tap any Scripture reference to read it.
   Text is the World English Bible, which is public domain, so it can sit on
   the page without a licence. Fetched at build time by tools/fetch_verses.py. */
(function(){
'use strict';

fetch('data/verses.json')
  .then(function(r){ return r.ok ? r.json() : null; })
  .then(function(data){ if(data) wire(data); })
  .catch(function(){});

function wire(data){
  Array.prototype.forEach.call(document.querySelectorAll('.ref, .r'), function(el){
    var parts = el.textContent.split('·').map(function(p){ return p.trim(); })
                  .filter(function(p){ return p && data[p]; });
    if(!parts.length) return;

    var panel = document.createElement('span');
    panel.className = 'vpanel';
    panel.hidden = true;
    parts.forEach(function(p){
      var q = document.createElement('span');
      q.className = 'vq';
      q.textContent = data[p].text;
      var r = document.createElement('span');
      r.className = 'vr';
      r.textContent = data[p].ref;
      panel.appendChild(q);
      panel.appendChild(r);
    });
    el.parentNode.insertBefore(panel, el.nextSibling);

    el.classList.add('ref-btn');
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-expanded', 'false');

    function toggle(){
      var opening = panel.hidden;
      panel.hidden = !opening;
      el.setAttribute('aria-expanded', String(opening));
    }
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle(); }
    });
  });
}
})();

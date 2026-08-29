/* The "get involved" form on the join page. */
(function(){
'use strict';
var $ = function(s){ return document.querySelector(s); };
var form = $('#interest');
if(!form) return;

var send = $('#iSend'), msg = $('#iMsg');
var TO = 'jmeaney@belpres.org';

function say(text, tone){ msg.textContent = text; msg.setAttribute('data-tone', tone || ''); }

/* If the backend is not reachable, hand the message to their mail app so it
   still gets to Jake rather than disappearing. */
function fallback(d){
  var body = [
    'Name: ' + d.name,
    'Email: ' + d.email,
    'Phone: ' + (d.phone || 'not given'),
    'Plays or sings: ' + (d.plays || 'not given'),
    '',
    d.note || ''
  ].join('\n');
  window.location.href = 'mailto:' + TO +
    '?subject=' + encodeURIComponent('Worship team interest: ' + d.name) +
    '&body=' + encodeURIComponent(body);
  say('Opening your email app so this still reaches Jake. Send the message it drafts.', '');
}

form.addEventListener('submit', function(e){
  e.preventDefault();
  var d = {
    name:  $('#iName').value.trim(),
    email: $('#iEmail').value.trim(),
    phone: $('#iPhone').value.trim(),
    plays: $('#iPlays').value.trim(),
    note:  $('#iNote').value.trim()
  };

  if(!d.name){  say('Add your name so I know who I am talking to.', 'bad'); $('#iName').focus();  return; }
  if(!d.email || d.email.indexOf('@') < 1){ say('Add an email address I can reply to.', 'bad'); $('#iEmail').focus(); return; }

  send.disabled = true;
  say('Sending...', '');

  fetch('api/interest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(d)
  })
    .then(function(r){ if(!r.ok) throw new Error('api'); return r.json(); })
    .then(function(){
      form.reset();
      say('Got it. I will be in touch. In the meantime, come to a service or the prayer room.', 'good');
    })
    .catch(function(){ fallback(d); })
    .then(function(){ send.disabled = false; });
});
})();

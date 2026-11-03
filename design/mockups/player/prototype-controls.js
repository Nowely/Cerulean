
(function () {
  var live = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  document.documentElement.classList.toggle('live', !!live);
  var root = document.getElementById('root'), phone = document.getElementById('phone'), sel = document.getElementById('st');
  var theme = document.documentElement.getAttribute('data-theme') || 'system';
  function fit() {
    if (live) {
      var vv = window.visualViewport, h = vv ? vv.height : innerHeight;
      root.style.setProperty('--vvh', h + 'px');
      root.style.transform = vv && vv.offsetTop ? 'translateY(' + vv.offsetTop + 'px)' : '';
    } else {
      var o = sel.options[sel.selectedIndex], w = +o.dataset.w, h = +o.dataset.h;
      var s = Math.min(1, (innerHeight - 76) / h, (innerWidth - 32) / w);
      phone.style.width = w + 'px'; phone.style.height = h + 'px';
      phone.classList.toggle('wide', w > 600);
      phone.style.transform = 'scale(' + s + ')';
      phone.style.marginBottom = (h * (s - 1)) + 'px';
      phone.style.marginLeft = phone.style.marginRight = (w * (s - 1) / 2) + 'px';
    }
  }
  // On a touch screen only the phone states are offered
  if (live) for (var i = sel.options.length - 1; i >= 0; i--) if (+sel.options[i].dataset.w > 600) sel.remove(i);
  var prev = document.getElementById('prev'), next = document.getElementById('next');
  function go(start) {
    fit(); root.innerHTML = ''; window.__reset(); window.__render('Flow', { theme: theme, start: start }, root);
    prev.disabled = sel.selectedIndex <= 0; next.disabled = sel.selectedIndex >= sel.options.length - 1;
  }
  // Back and forward through the states in the storyboard's order; «Сначала» starts the chosen one over
  function step(d) {
    var i = sel.selectedIndex + d;
    if (i < 0 || i >= sel.options.length) return;
    sel.selectedIndex = i; go(sel.value);
  }
  sel.addEventListener('change', function () { go(sel.value); });
  prev.addEventListener('click', function () { step(-1); });
  next.addEventListener('click', function () { step(1); });
  document.getElementById('again').addEventListener('click', function () { go(sel.value); });
  // ← and → step too, unless the caret is in a field of the artboard
  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });
  window.addEventListener('resize', fit);
  if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', fit); }
  // A state can be linked: the artifact's link + #ai, #week… (on a phone too, where the list is hidden)
  function fromHash() {
    var h = (location.hash || '').slice(1);
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === h) { sel.selectedIndex = i; return true; }
    return false;
  }
  window.addEventListener('hashchange', function () { if (fromHash()) go(sel.value); });
  fromHash();
  fit(); go(sel.value);
})();

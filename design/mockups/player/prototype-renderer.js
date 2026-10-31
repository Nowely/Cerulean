// The player's renderer: the same holes, sc-if, sc-for and dc-import as dc.js, but a render patches the page in place
// (fields keep focus, caret and the phone's own keyboard), and handlers are swapped on the nodes that stay.
(function () {
  window.DCLogic = class { constructor(p) { this.props = p || {}; this.state = {}; } setState(x) { Object.assign(this.state, typeof x === 'function' ? x(this.state) : x); window.__rerender(); } };
  function parse(src) {
    var helmet = (src.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ''])[1];
    var body = src.match(/<\/helmet>([\s\S]*?)<\/x-dc>/)[1];
    var js = src.match(/data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
    var C = new Function('return (' + js + ')')();
    return { helmet: helmet, body: body, C: C };
  }
  function look(scope, p) { p = p.trim(); if (p === 'true') return true; if (p === 'false') return false; if (/^-?\d+(\.\d+)?$/.test(p)) return +p; return p.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, scope); }
  function interp(s, scope) { return s.replace(/\{\{([^}]+)\}\}/g, function (_, p) { var v = look(scope, p); return v == null ? '' : String(v); }); }
  var EV = { onclick: 'click', onchange: 'input', onsubmit: 'submit', onkeydown: 'keydown', onblur: 'blur', onpointerdown: 'pointerdown' };
  function disp(e) { var f = this.__h && this.__h[e.type]; if (f) f(e); }
  function on(el, type, fn) { el.__h = el.__h || {}; el.__h[type] = fn; el.__on = el.__on || {}; if (!el.__on[type]) { el.addEventListener(type, disp); el.__on[type] = true; } }
  function renderNodes(nodes, scope, parent, ctx) { for (var i = 0; i < nodes.length; i++) renderNode(nodes[i], scope, parent, ctx); }
  function renderNode(n, scope, parent, ctx) {
    if (n.nodeType === 3) { parent.appendChild(document.createTextNode(interp(n.nodeValue, scope))); return; }
    if (n.nodeType !== 1) return;
    var tag = n.tagName.toLowerCase(), m;
    if (tag === 'sc-if') { m = n.getAttribute('value').match(/^\{\{(.+)\}\}$/); if (look(scope, m[1])) renderNodes(n.childNodes, scope, parent, ctx); return; }
    if (tag === 'sc-for') {
      m = n.getAttribute('list').match(/^\{\{(.+)\}\}$/); var as = n.getAttribute('as');
      (look(scope, m[1]) || []).forEach(function (it, i) { var sc = Object.assign({}, scope); sc[as] = it; sc.$index = i; renderNodes(n.childNodes, sc, parent, ctx); });
      return;
    }
    if (tag === 'dc-import') {
      // as the canvas does it: whole holes pass values, names go from kebab to camel, the child sits in a <div class="sc-host">
      var props = {}; for (var a of n.attributes) if (['name', 'hint-size', 'style'].indexOf(a.name) < 0) { var w = a.value.match(/^\{\{([^}]+)\}\}$/); props[a.name.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); })] = w ? look(scope, w[1]) : interp(a.value, scope); }
      var name = n.getAttribute('name'), host = document.createElement('div');
      host.className = 'sc-host'; host.setAttribute('data-sc-name', name);
      var k = ctx + '/' + name; seq[k] = (seq[k] || 0) + 1;
      mount(name, props, host, ctx, k + ':' + seq[k]); parent.appendChild(host); return;
    }
    var el = n.namespaceURI === 'http://www.w3.org/2000/svg' ? document.createElementNS(n.namespaceURI, n.tagName) : document.createElement(n.tagName);
    for (var at of n.attributes) {
      var whole = at.value.match(/^\{\{([^}]+)\}\}$/), name = at.name;
      if (EV[name] && whole) { var fn = look(scope, whole[1]); if (typeof fn === 'function') on(el, EV[name], fn); continue; }
      if (name.indexOf('hint-') === 0) continue;
      if (name === 'value' && (tag === 'input' || tag === 'textarea')) { el.__value = interp(at.value, scope); el.value = el.__value; continue; }
      el.setAttribute(name, interp(at.value, scope));
    }
    renderNodes(n.childNodes, scope, el, ctx);
    parent.appendChild(el);
  }
  var instances = {}, files = {}, helmets = {}, seq = {};
  function mount(name, props, parent, ctx, key) {
    var p = files[name] || (files[name] = parse(window.__files[name]));
    if (!helmets[name]) { document.head.insertAdjacentHTML('beforeend', p.helmet); helmets[name] = true; }
    var id = key || ctx + '/' + name;
    if (!instances[id]) instances[id] = new p.C(props);
    var inst = instances[id]; inst.props = props;
    var t = document.createElement('template'); t.innerHTML = p.body;
    renderNodes(t.content.childNodes, inst.renderVals(), parent, id);
  }
  // Patch a into b: same kind of node in the same place stays (its text, attributes, value and handlers follow b)
  function same(a, b) { return a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.tagName === b.tagName && (a.id || '') === (b.id || ''))); }
  function morphKids(a, b) {
    var ak = Array.from(a.childNodes), bk = Array.from(b.childNodes);
    for (var i = 0; i < bk.length; i++) {
      if (i < ak.length && same(ak[i], bk[i])) morph(ak[i], bk[i]);
      else if (i < ak.length) a.replaceChild(bk[i], ak[i]);
      else a.appendChild(bk[i]);
    }
    for (var j = bk.length; j < ak.length; j++) a.removeChild(ak[j]);
  }
  function morph(a, b) {
    if (a.nodeType === 3) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    for (var x of Array.from(a.attributes)) if (!b.hasAttribute(x.name)) a.removeAttribute(x.name);
    for (var y of Array.from(b.attributes)) if (a.getAttribute(y.name) !== y.value) a.setAttribute(y.name, y.value);
    if ('__value' in b && a.value !== b.__value) a.value = b.__value;
    a.__h = {};
    for (var t in (b.__h || {})) on(a, t, b.__h[t]);
    morphKids(a, b);
  }
  window.__reset = function () { instances = {}; };
  window.__render = function (name, props, root) {
    window.__rerender = function () { var tmp = document.createElement('div'); seq = {}; mount(name, props, tmp, 'r'); morphKids(root, tmp); };
    window.__rerender();
  };
})();

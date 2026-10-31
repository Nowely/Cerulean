(function () {
  function fail(error) {
    var pre = document.createElement('pre');
    pre.className = 'load-error';
    pre.textContent = 'Не удалось загрузить компоненты: ' + (error && error.message ? error.message : error);
    document.body.appendChild(pre);
    console.error(error);
  }

  fetch('player/components.json', { cache: 'no-cache' }).then(function (response) {
    if (!response.ok) throw new Error('components.json: HTTP ' + response.status);
    return response.json();
  }).then(function (manifest) {
    return Promise.all(manifest.components.map(function (name) {
      return fetch('project/' + encodeURIComponent(name) + '.dc.html', { cache: 'no-cache' }).then(function (response) {
        if (!response.ok) throw new Error(name + '.dc.html: HTTP ' + response.status);
        return response.text();
      }).then(function (source) {
        window.__files = window.__files || {};
        window.__files[name] = source;
      });
    }));
  }).then(function () {
    var script = document.createElement('script');
    script.src = 'player/prototype-controls.js';
    script.onerror = function () { fail(new Error('prototype-controls.js failed to load')); };
    document.body.appendChild(script);
  }).catch(fail);
})();

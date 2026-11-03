(function () {
  var pageSelect = document.getElementById('page');
  var boardSelect = document.getElementById('board');
  var themeSelect = document.getElementById('theme');
  var frame = document.getElementById('board-frame');
  var stage = document.getElementById('stage');
  var scaler = document.getElementById('scaler');
  var title = document.getElementById('title');
  var size = document.getElementById('size');
  var canvas;

  function fail(error) {
    var pre = document.getElementById('load-error');
    pre.hidden = false;
    pre.textContent = 'Не удалось загрузить Canvas: ' + (error && error.message ? error.message : error);
    console.error(error);
  }

  function boardPath(file) {
    return 'project/' + file.split('/').map(encodeURIComponent).join('/');
  }

  function currentFile() {
    return boardSelect.value || location.hash.slice(1);
  }

  function applyTheme() {
    try {
      var win = frame.contentWindow;
      var root = win && win.__dcRootName && win.__dcRootName();
      if (root && win.__dcSetProps) win.__dcSetProps(root, { theme: themeSelect.value });
    } catch (error) {
      console.warn('Theme has not been applied yet', error);
    }
  }

  function fit() {
    var board = canvas.boards[currentFile()];
    if (!board) return;
    var scale = Math.max(0.01, Math.min(1,
      (stage.clientWidth - 32) / board.w,
      (stage.clientHeight - 32) / board.h));
    scaler.style.width = board.w * scale + 'px';
    scaler.style.height = board.h * scale + 'px';
    frame.style.width = board.w + 'px';
    frame.style.height = board.h + 'px';
    frame.style.transform = 'scale(' + scale + ')';
  }

  function show(file, updateHash) {
    var board = canvas.boards[file];
    if (!board) return;
    boardSelect.value = file;
    title.textContent = board.title || file;
    title.title = board.title || file;
    size.textContent = board.w + ' × ' + board.h;
    frame.src = boardPath(file);
    if (updateHash !== false) history.replaceState(null, '', '#' + file);
    fit();
  }

  function fillBoards(page, preferred) {
    var files = canvas.order.filter(function (file) {
      return (canvas.boards[file].page || canvas.pages[0] && canvas.pages[0].id) === page;
    });
    boardSelect.textContent = '';
    files.forEach(function (file) {
      var option = document.createElement('option');
      option.value = file;
      option.textContent = canvas.boards[file].title || file;
      boardSelect.appendChild(option);
    });
    show(files.indexOf(preferred) >= 0 ? preferred : files[0], false);
  }

  fetch('project/canvas.json').then(function (response) {
    if (!response.ok) throw new Error('canvas.json: HTTP ' + response.status);
    return response.json();
  }).then(function (data) {
    canvas = data;
    canvas.pages.forEach(function (page) {
      var option = document.createElement('option');
      option.value = page.id;
      option.textContent = page.name;
      pageSelect.appendChild(option);
    });
    var initialFile = canvas.boards[location.hash.slice(1)] ? location.hash.slice(1) : canvas.launch && canvas.launch.file;
    var initialPage = initialFile && canvas.boards[initialFile] ? canvas.boards[initialFile].page : canvas.launch && canvas.launch.page;
    if (!canvas.pages.some(function (page) { return page.id === initialPage; })) initialPage = canvas.pages[0].id;
    pageSelect.value = initialPage;
    fillBoards(initialPage, initialFile);
    history.replaceState(null, '', '#' + currentFile());
  }).catch(fail);

  pageSelect.addEventListener('change', function () { fillBoards(pageSelect.value); history.replaceState(null, '', '#' + currentFile()); });
  boardSelect.addEventListener('change', function () { show(boardSelect.value); });
  themeSelect.addEventListener('change', applyTheme);
  frame.addEventListener('load', applyTheme);
  window.addEventListener('message', function (event) {
    if (event.source === frame.contentWindow && event.data && event.data.type === '__dc_booted') applyTheme();
  });
  window.addEventListener('resize', fit);
})();

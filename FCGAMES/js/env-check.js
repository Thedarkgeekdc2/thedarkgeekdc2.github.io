// Loading this app by double-clicking index.html (file:// protocol) makes every
// fetch() of the JSON data files fail silently in most browsers, which makes
// the game, Question Library, Question Builder etc. all look broken with no
// obvious reason why. This shows a clear, actionable banner instead.
(function () {
  if (location.protocol !== 'file:') return;
  var bar = document.createElement('div');
  bar.setAttribute('role', 'alert');
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#ffb238;' +
    'color:#241c15;font:600 14px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;' +
    'padding:12px 16px;text-align:center;border-bottom:3px solid #241c15;';
  bar.innerHTML = '⚠️ This page was opened directly from a file, so it can\'t load its data and will look broken. ' +
    'Serve this folder with a local web server instead (for example, run <code style="background:rgba(0,0,0,.08);' +
    'padding:1px 5px;border-radius:4px;">python -m http.server</code> inside the <code style="background:rgba(0,0,0,.08);' +
    'padding:1px 5px;border-radius:4px;">flash</code> folder and open <code style="background:rgba(0,0,0,.08);' +
    'padding:1px 5px;border-radius:4px;">http://localhost:8000</code>), or host it on any web server.';
  document.addEventListener('DOMContentLoaded', function () {
    document.body.prepend(bar);
    document.body.style.paddingTop = (bar.offsetHeight + 8) + 'px';
  });
})();

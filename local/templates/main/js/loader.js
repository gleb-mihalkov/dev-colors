!(function() {
  var duration = 1700;
  var minDelay = 1500;
  var startDelay = 1;

  var isTimeout = false;
  var isLoaded = false;

  function onTimeout() {
    isTimeout = true;
    hide();
  }

  function onLoaded() {
    isLoaded = true;
    hide();
  }

  function hide() {
    if (!isTimeout || !isLoaded) {
      return;
    }

    var loader = document.getElementById('loader');
    loader.classList.remove('active');
    loader.classList.add('leave');

    var remove = function() {
      unfixBody();
      loader.parentNode.removeChild(loader);
      $(document).trigger('start');
    };

    setTimeout(remove, duration);
  }

  window.addEventListener('DOMContentLoaded', fixBody);
  window.addEventListener('load', onLoaded);
  setTimeout(onTimeout, minDelay);
})();
!(function() {
  var duration = 1625;
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

    var start = function() {
      $(document).trigger('start');
    };

    var remove = function() {
      unfixBody();
      loader.parentNode.removeChild(loader);
      setTimeout(start, startDelay);
    };

    setTimeout(remove, duration);
  }

  window.addEventListener('DOMContentLoaded', fixBody);
  window.addEventListener('load', onLoaded);
  setTimeout(onTimeout, minDelay);
})();
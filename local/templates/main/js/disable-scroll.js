!(function($) {

  var $body = $(document.body);
  var _scrollbars = null;
  var borderColor = '#fbf1ef';

  function getScrollbars() {
    if (_scrollbars != null) return _scrollbars;

    var temp = document.createElement('DIV');

    temp.style.visibility = 'hidden';
    temp.style.overflowY = 'scroll';
    temp.style.width = '50px';
    temp.style.height = '50px';

    document.body.appendChild(temp);
    _scrollbars = temp.offsetWidth - temp.clientWidth;
    document.body.removeChild(temp);

    return _scrollbars;
  }

  function isScrollbars() {
    return document.body.scrollHeight > $body.height();
  }

  window.fixBody = function() {
    var offset = getScrollbars() + 'px';

    $body.css({
      borderRightColor: borderColor,
      borderRightStyle: 'solid',
      borderRightWidth: offset,
      overflow: 'hidden'
    });
  };

  window.unfixBody = function() {
    $body.css({
      borderRightStyle: '',
      borderRightColor: '',
      borderRightWidth: '',
      overflow: ''
    });
  };

})(window.jQuery);
!(function($) {

  var _scrollbars = null;
  var _body = null;
  var borderColor = '#fbf1ef';

  function getBody() {
    return _body ? _body : (_body = $(document.body));
  }

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

    getBody().css({
      borderRightColor: borderColor,
      borderRightStyle: 'solid',
      borderRightWidth: offset,
      overflow: 'hidden'
    });

    var event = new $.Event('fix');
    event.offset = offset;

    getBody().trigger(event);
  };

  window.unfixBody = function() {
    getBody().css({
      borderRightStyle: '',
      borderRightColor: '',
      borderRightWidth: '',
      overflow: ''
    });

    getBody().trigger('unfix');
  };

})(window.jQuery);
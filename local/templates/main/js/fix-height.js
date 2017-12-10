!(function($) {

  function refresh() {
    var $nodes = $('[data-fix-height]');

    for (var i = 0; i < $nodes.length; i++) {
      var $node = $nodes.eq(i);
      var $parent = $node.parent();
      
      var width = $parent.width();
      var height = $parent.height();

      $node.css({
        width: width + 'px',
        height: height + 'px'
      });
    }
  }

  $(document).on('start', refresh);
  $(window).on('resize', refresh);
})(window.jQuery);
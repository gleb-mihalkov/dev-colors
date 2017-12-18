!(function($) {

  window.addEventListener('DOMContentLoaded', function() {
    var $header = $('.global__header');

    var isFixed = $header.css('position') == 'fixed';
    if (!isFixed) return;

    $(document.body)

      .on('fix', function(e) {
        $header.css({paddingRight: e.offset});
      })

      .on('unfix', function() {
        $header.css({paddingRight: ''});
      });
  });

})(window.jQuery);
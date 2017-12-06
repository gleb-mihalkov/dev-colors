!(function($) {
  $(document).on('start', function() {
    var wrapper = $('.home-slider__slides-wrapper');

    if (!wrapper.length) {
      return;
    }

    wrapper
      .on('change.carousel', function() {
        wrapper.addClass('change');
      })
      .on('changeAfter.carousel', function() {
        wrapper.removeClass('change');
      });
  });
})(window.jQuery);
!(function($) {

  /**
   * Максимальная ширина экрана, при которой отображается слайдер.
   *
   * @type {Number}
   */
  var maxWidth = 1450;

  /**
   * Время задержки прокрутки.
   *
   * @type {Number}
   */
  var throttleTime = 750;

  /**
   * Документ.
   *
   * @type {jQuery}
   */
  var doc = $(document);

  /**
   * Контейнер слайдера главной страницы.
   *
   * @type {jQuery}
   */
  var container = null;

  /**
   * Слайдер.
   *
   * @type {jQuery}
   */
  var slider = null;

  /**
   * Количество слайдов.
   *
   * @type {Number}
   */
  var sliderCount = 0;

  /**
   * Текущий слайд.
   *
   * @type {Number}
   */
  var sliderIndex = 0;

  /**
   * Показывает, был ли слайдер просмотрен до конца.
   *
   * @type {Bool}
   */
  var isViewed = false;

  /**
   * Время предыдущего события прокрутки.
   *
   * @type {Number}
   */
  var prevScroll = 0;

  /**
   * Время смены слайдов.
   *
   * @type {Number}
   */
  var duration = 0;

  /**
   * Показывает, выполняется ли в данный момент смена слайдов.
   *
   * @type {Bool}
   */
  var isTransition = false;

  /**
   * Обрабатывает окончание смены слайдов.
   *
   * @return {void}
   */
  function onTransition() {
    isTransition = false;
  }

  /**
   * Обрабатывает прокрутку страницы.
   *
   * @param  {Event} e Событие.
   * @return {void}
   */
  function onScroll(e) {
    window.scrollTo(0, 0);
    e.preventDefault();
    
    if (isTransition) {
      return;
    }

    isTransition = true;
    var index = carouselIndex(slider) + 1;

    if (index >= sliderCount) {
      $.ajax('/home-slider-scrolled.php');
      doc.off('scroll', onScroll);
      return;
    }

    isTransition = true;
    carouselTo(slider, index, 'next');
    setTimeout(onTransition, duration);
  } 

  /**
   * Инициализирует просмотр сверху главной страницы.
   *
   * @return {void}
   */
  function initScrollStart() {
    carouselToFirst(slider);
    window.scrollTo(0, 0);

    doc.on('scroll', onScroll);
  }

  /**
   * Инициализирует просмотр страницы с любого места главной страницы, кроме
   * начала.
   *
   * @return {void}
   */
  function initScrollOther() {
    carouselToLast(slider);
  }

  /**
   * Выполняется при загрузке страницы.
   *
   * @return {void}
   */
  function onReady() {
    if (document.body.clientWidth < maxWidth) {
      return;
    }

    container = $('.home-slider');

    if (!container.length) {
      return;
    }

    slider = $('#homeSlider');

    if (slider.hasClass('scrolled')) {
      return;
    }

    sliderCount = carouselCount(slider);
    duration = slider.attr('data-duration') * 1 + 10;

    if (doc.scrollTop() == 0) {
      initScrollStart();
    }
    else {
      initScrollOther();
    }
  }

  // Прикрепляем события.
  doc.on('start', onReady);
})(window.jQuery);
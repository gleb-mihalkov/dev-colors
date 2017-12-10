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
   * Обрабатывает прокрутку страницы.
   *
   * @param  {Event} e Событие.
   * @return {void}
   */
  function onScroll(e) {
    window.scrollTo(0, 0);

    var time = (new Date()).getTime();
    var diff = time - prevScroll;
    prevScroll = time;
    
    if (diff <= throttleTime) {
      return;
    }

    var index = carouselIndex(slider) + 1;

    if (index < sliderCount) {
      carouselTo(slider, index, 'next');
      return;
    }

    doc.off('scroll', onScroll);
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
    sliderCount = carouselCount(slider);

    var scrollPosition = doc.scrollTop();
    var isScrollStart = scrollPosition == 0;

    if (isScrollStart) {
      initScrollStart();
    }
    else {
      initScrollOther();
    }
  }

  // Прикрепляем события.
  doc.on('start', onReady);
})(window.jQuery);
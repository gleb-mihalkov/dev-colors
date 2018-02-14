!(function($) {

  /**
   * Максимальная ширина экрана, при которой отображается слайдер.
   *
   * @type {Number}
   */
  var maxWidth = 1092;

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
   * Название события.
   *
   * @type {String}
   */
  var eventName = 'mousewheel MozMousePixelScroll';

  /**
   * Добавляет обработчик событию прокрутки.
   *
   * @return {void}
   */
  function bindScroll() {
    fixBody();
    container.on(eventName, onScroll);
  }

  /**
   * Удаляет обработчик событию прокрутки.
   *
   * @return {void}
   */
  function unbindScroll() {
    container.off(eventName, onScroll);
    unfixBody();
  }

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
    e.preventDefault();

    var isBlocked = isTransition || slider.hasClass('next') || slider.hasClass('back');

    if (isBlocked) {
      return;
    }

    var delta = e.originalEvent.deltaY || e.originalEvent.detail || e.originalEvent.wheelDelta;
    
    if (delta < 0) {
      return;
    }

    isTransition = true;
    var index = carouselIndex(slider) + 1;

    if (index >= sliderCount) {
      $.ajax('/home-slider-scrolled.php');

      unbindScroll();
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
    window.scrollTo(0, 0);
    bindScroll();
    carouselToFirst(slider);
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
      return initScrollOther();
    }

    sliderCount = carouselCount(slider);
    duration = slider.attr('data-duration') * 1;

    initScrollStart();
  }

  // Прикрепляем события.
  doc.on('start', onReady);

})(window.jQuery);
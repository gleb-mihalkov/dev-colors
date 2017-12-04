/**
 * Виджет сворачивающейся области.
 */
!(function($) {

  /**
   * Время скрытия области.
   *
   * @type {Number}
   */
  var duration = 500;

  /**
   * Селектор контейнера.
   *
   * @type {String}
   */
  var hostSelector = '.course-lesson';

  /**
   * Селектор заголовка.
   *
   * @type {String}
   */
  var headerSelector = '.course-lesson__header';

  /**
   * Селектор содержимого.
   *
   * @type {String}
   */
  var contentSelector = '.course-lesson__content';

  /**
   * Показывает содержимое области.
   *
   * @param  {jQuery} host    Область.
   * @param  {jQuery} content Содержимое.
   * @return {void}
   */
  function show(host, content) {

  }

  /**
   * Обрабатывает нажатие заголовок области.
   *
   * @param  {Event} e Событие.
   * @return {void}
   */
  function onHeaderClick(e) {
    e.preventDefault();

    var header = $(this);
    var host = header.closest(hostSelector);
    var content = host.find(contentSelector);

    content.stop();

    var isShowed = content.is(':visible');

    if (isShowed) {
      host.removeClass('active');
      content.slideUp(duration);
    }
    else {
      host.addClass('active');
      content.slideDown(duration);
    }
  }

  // Прикрепляем обработчики.
  $(document)
    .on('click', headerSelector, onHeaderClick);

})(window.jQuery);
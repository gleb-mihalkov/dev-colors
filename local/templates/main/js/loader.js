!(function($) {

  /**
   * Элемент, с помощью которого загружается страница.
   *
   * @type {HTMLElement}
   */
  var iframe = document.createElement('IFRAME');

  /**
   * Обрабатывает окончание загрузки страницы.
   *
   * @param  {Event} e Событие.
   * @return {void}
   */
  function onPageLoad(e) {
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    document.head.innerHTML = doc.head.innerHTML;
    document.body.innerHTML = doc.body.innerHTML;
  }

  /**
   * Обрабатывает переход по ссылке.
   *
   * @param  {Event} e Событие.
   * @return {void}
   */
  function onLink(e) {
    if (e.isDefaultPrevented()) return;

    var host = this.host;
    var pageHost = location.host;

    var isRelative = host === pageHost;
    if (!isRelative) return;

    e.preventDefault();

    iframe.src = this.href;
    document.body.appendChild(iframe);
  }

  // Ининциализируем глобальные переменные.
  iframe.onload = onPageLoad;

  // Прикрепляем обработчики.
  $(document).on('click', 'a', onLink);

})(window.jQuery);
/// ----------------------
/// Модальное окно.
/// ----------------------
!(function($) {

	var duration = 500;

	var _scrollbars = null;
	var $_body = null;

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
		return document.body.scrollHeight > $(document.body).height();
	}

	function unfix() {
		$(document.body).removeClass('fixed').css('padding-right', '');
	}

	function fix() {
		var $body = $(document.body).addClass('fixed');
		if (!isScrollbars()) return;

		var offset = getScrollbars() + 'px';
		$body.css('padding-right', offset);
	}

	function init($modal) {
		if (!isScrollbars()) return;

		var offset = getScrollbars() + 'px';
		
		var $close = $modal.find('.modal__close');
		$close.css('right', offset);
		$modal.css('padding-right', offset);
	}

	function show($modal, cb) {
		$modal.addClass('active');
		fix();
	}

	function hide($modal) {
		$modal.removeClass('active');
		setTimeout(unfix, duration);
	}

	function open($modal) {
		show($modal);
		$modal.trigger('open.modal');
	}

	function close($modal) {
		hide($modal);
		$modal.trigger('close.modal');
	}

	$.fn.modal = function(action) {
		if (action == null) action = 'open';
		
		if (action == 'open') open(this);
		if (action == 'close') close(this);

		return this;
	};

	function onButton(e) {
		var $item = $(this);
		var id = $item.attr('data-modal');

		var modal = document.getElementById(id);
		if (modal == null) return;

		e.preventDefault();

		var $modal = $(modal);
		$modal.modal();
	}

	function onClose(e) {
		var $item = $(e.target);
		
		var isButton = $item.attr('data-close') != null;
		var isSelf = $item.attr('data-modal-box') != null;
		var isClose = isSelf || isButton;

		if (!isClose) return;

		e.preventDefault();
		
		var $modal = isSelf ? $item : $item.closest('[data-modal-box]');
		close($modal);
	}

	function onStart() {
		var $modals = $('[data-modal-box]');
		
		for (var i = 0; i < $modals.length; i++) {
			var $modal = $modals.eq(i);
			init($modal);
		}
	}

	$(document)
		.on('click', '[data-modal-box], [data-modal-box] [data-close]', onClose)
		.on('click', '[data-modal]', onButton)
		.on('start', onStart);
})(window.jQuery);

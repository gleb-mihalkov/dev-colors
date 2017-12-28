/// ----------------------
/// Прокрутка вниз.
/// ----------------------
!(function($) {
	var _timing = 'easeInOutCubic';
	var _duration = 750;

	var $_document = null;
	var $_page = null;
	var $_scroller = null;
	var $_enters = null;

	var _viewHeight = null;
	var _scrollerBottom = null;
	var _scrollerTop = null;

	var _isEntersInited = false;
	var _isForce = false;

	function getDocument() {
		return $_document ? $_document : ($_document = $(document));
	}

	function getPage() {
		return $_page ? $_page : ($_page = $('html, body'));
	}

	function getScroller() {
		return $_scroller ? $_scroller : ($_scroller = $('[data-scroll]'));
	}

	function getElement(attr) {
		var $element = $('[' + attr + ']');
		return $element.length ? $element : null;
	}

	function getEnters() {
		return $_enters ? $_enters : ($_enters = $('.not-viewed'));
	}

	function wrap(node) {
		return node instanceof $ ? node : $(node);
	}

	function getScrollTop() {
		return getDocument().scrollTop();
	}

	function getViewHeight() {
		return _viewHeight ? _viewHeight : (
			_viewHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
		);
	}

	function getScrollerRange() {
		var $top, $bottom;

		_scrollerBottom = ($bottom = getElement('data-scroll-finish'))
			? getElementTop($bottom)
			: getDocument().height();

		_scrollerTop = ($top = getElement('data-scroll-start'))
			? getElementBottom($top)
			: getViewHeight() / 2;

		return [_scrollerTop, _scrollerBottom];
	}
	
	function scrollPageStart() {
		_isForce = true;
	}

	function scrollPageEnd() {
		_isForce = false;
	}

	function scrollPage(value, duration) {
		duration = duration || _duration;
		var params = {scrollTop: value};
		scrollPageStart();
		getPage().animate(params, duration, _timing, scrollPageEnd);
	}
	
	function getElementBottom(node) {
		var $node = wrap(node);
		var top = $node.offset().top;
		var height = $node.outerHeight();
		return top + height;
	}

	function getElementTop(node) {
		var $node = wrap(node);
		var top = $node.offset().top;
		return top;
	}

	function getOffset(offset) {
		var value = offset * 1;
		if (isNaN(value)) value = 0;

		return value;
	}

	function clearCache() {
		_viewHeight = null;
		_scrollerBottom = null;
		_scrollerTop = null;

		$_scroller = null;
		$_enters = null;
	}

	function showScroller() {
		getScroller().addClass('active');
	}

	function hideScroller() {
		getScroller().removeClass('active');
	}

	function fixScroller(top) {
		var $scroller = getScroller();
		if ($scroller.hasClass('fixed')) return;

		var padding = $scroller.attr('data-scroll') * 1;
		if (isNaN(padding)) padding = 0;

		var offset = top - padding - $scroller.outerHeight();

		$scroller.css('top', offset + 'px');
		$scroller.addClass('fixed');
	}

	function unfixScroller(top) {
		getScroller().removeClass('fixed').css('top', '');
	}

	function refreshScroller() {
		if (_isForce) return;

		var top = getScrollTop();
		var bottom = top + getViewHeight();
		var range = getScrollerRange();

		var func = null;

		func = range[0] < top ? showScroller : hideScroller;
		func();

		func = range[1] <= bottom ? fixScroller : unfixScroller;
		func(range[1]);
	}

	function isEnter($enter, viewTop, viewBottom) {
		viewTop = viewTop || getScrollTop();
		viewBottom = viewBottom || (viewTop + getViewHeight());

		var elementBottom = getElementBottom($enter);
		var elementTop = getElementTop($enter);

		var offset = getOffset($enter.attr('data-scroll-enter'));
		viewTop += offset;
		viewBottom -= offset;

		var isVisible =
			elementBottom <= viewBottom && elementBottom >= viewTop ||
			elementTop >= viewTop && elementTop <= viewBottom;

		return isVisible;
	}

	function refreshEnter($enter, viewTop, viewBottom) {
		var isExit = !$enter.hasClass('not-viewed') || !isEnter($enter, viewTop, viewBottom);
		if (isExit) return;
		$enter.removeClass('not-viewed');
		$enter.addClass('viewed');
	}

	function initEnter($enter, viewTop, viewBottom) {
		if (!$enter.hasClass('not-viewed')) return;

		var elementBottom = getElementBottom($enter);

		var isShow = elementBottom < viewTop || isEnter($enter, viewTop, viewBottom);
		if (!isShow) return;

		$enter.removeClass('not-viewed');
		$enter.addClass('viewed');
	}

	function refreshEnters() {
		if (!_isEntersInited) {
			return;
		}

		var top = getScrollTop();
		var bottom = top + getViewHeight();

		var $enters = getEnters();

		for (var i = 0; i < $enters.length; i++) {
			var $enter = $enters.eq(i);
			refreshEnter($enter, top, bottom);
		}
	}

	function initEnters() {
		var top = getScrollTop();
		var bottom = top + getViewHeight();

		var $enters = getEnters();

		for (var i = 0; i < $enters.length; i++) {
			var $enter = $enters.eq(i);
			initEnter($enter, top, bottom);
		}

		_isEntersInited = true;
	}

	function onScrollChange(e) {
		refreshScroller();
		refreshEnters();
	}

	function onScroll(e, node, func) {
		e.preventDefault();
		var value = func ? func(node) : 0;
		scrollPage(value);
	}

	function onScrollDown(e) {
		onScroll(e, this, getElementBottom);
	}

	function onScrollTop(e) {
		getScroller().removeClass('active');
		onScroll(e, this);
	}

	function onReady() {
		initEnters();
		refreshScroller();
	}

	getDocument()
		.on('click', '[data-scroll-down]', onScrollDown)
		.on('click', '[data-scroll]', onScrollTop)
		.on('scroll', onScrollChange)
		.on('start', onReady);

	$(window).on('resize', clearCache);
})(window.jQuery);

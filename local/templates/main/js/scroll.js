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
	var $_paralaxes = null;

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

	function getParalaxes() {
		return $_paralaxes ? $_paralaxes : ($_paralaxes = $('[data-paralax]'));
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

	function setEnter($enter) {
		$enter.removeClass('not-viewed');
		$enter.addClass('viewed');

		var duration = $enter.attr('data-viewing');
		if (!duration) return;

		$enter.addClass('viewing');
		
		setTimeout(function() {
			$enter.removeClass('viewing');
		}, duration * 1);
	}

	function refreshEnter($enter, viewTop, viewBottom) {
		var isExit = !$enter.hasClass('not-viewed') || !isEnter($enter, viewTop, viewBottom);
		if (isExit) return;

		setEnter($enter);
	}

	function initEnter($enter, viewTop, viewBottom) {
		if (!$enter.hasClass('not-viewed')) return;

		var elementBottom = getElementBottom($enter);

		var isShow = elementBottom < viewTop || isEnter($enter, viewTop, viewBottom);
		if (!isShow) return;

		setEnter($enter);
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

	function parseOffset(value) {
		var text = value + '';

		if (text.charAt(text.length - 1) == '%') {
			var percent = text.substr(0, text.length - 1) * 1;

			if (isNaN(percent)) {
				return 0;
			}

			var height = getViewHeight();
			return Math.round(percent * 100 / height);
		}

		value *= 1;
		return isNaN(value) ? 0 : value;
	} 

	function getParalaxOffset($paralax) {
		var bottom = $paralax.attr('data-paralax-bottom');
		var both = $paralax.attr('data-paralax-offset');
		var top = $paralax.attr('data-paralax-top');

		bottom = bottom != null ? bottom : (both != null ? both : 0);
		top = top != null ? top : (both != null ? both : 0);

		return {
			top: parseOffset(top),
			bottom: parseOffset(bottom)
		};
	}

	function getParalaxRanges($paralax) {
		var min = $paralax.attr('data-paralax-min');
		var max = $paralax.attr('data-paralax-max');

		min = min != null ? min : 0;
		max = max != null ? max : 100;

		return {
			min: min,
			max: max
		};
	}

	function getParalaxPercent($paralax, viewTop, viewBottom) {
		var elementTop = getElementTop($paralax);
		var elementBottom = getElementBottom($paralax);

		var offset = getParalaxOffset($paralax);
		viewTop += offset.top;
		viewBottom += offset.bottom;
		var viewHeight = viewBottom - viewTop;

		var maxTop = elementBottom;
		var minTop = elementTop - viewHeight;
		
		if (minTop < 0) {
			var shift = Math.abs(minTop);
			maxTop += shift;
			viewTop += shift;
			viewBottom += shift;
			minTop = 0;
		}

		var maxSize = maxTop - minTop;
		var size = maxTop - viewTop;

		var percent = size / maxSize;

		if (percent < 0) {
			percent = 0;
		}

		if (percent > 1) {
			percent = 1;
		}

		return 1 - percent; 
	}

	function refreshParalax($paralax, viewTop, viewBottom) {
		var percent = getParalaxPercent($paralax, viewTop, viewBottom);
		var ranges = getParalaxRanges($paralax);

		var maxValue = ranges.max - ranges.min;
		var value = Math.round(percent * maxValue + ranges.min);

		$paralax.attr('data-paralax', value);
	}

	function refreshParalaxes() {
		var top = getScrollTop();
		var bottom = top + getViewHeight();

		var $paralaxes = getParalaxes();

		for (var i = 0; i < $paralaxes.length; i++) {
			var $paralax = $paralaxes.eq(i);
			refreshParalax($paralax, top, bottom);
		}
	}

	function onScrollChange(e) {
		refreshScroller();
		refreshEnters();
		refreshParalaxes();
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
		refreshParalaxes();
	}

	getDocument()
		.on('click', '[data-scroll-down]', onScrollDown)
		.on('click', '[data-scroll]', onScrollTop)
		.on('scroll', onScrollChange)
		.on('start', onReady)
		.ready(refreshParalaxes);

	$(window).on('resize', clearCache);
})(window.jQuery);

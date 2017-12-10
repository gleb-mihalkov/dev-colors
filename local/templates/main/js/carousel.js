/// ----------------------
/// Карусель изображений.
/// ----------------------
!(function($) {
	if ($ == null) return console.warn('jQuery is required.');

	var durationDefault = 1500;
	var autoplay = 2000;

	function getDuration($carousel) {
		var duration = $carousel.attr('data-duration') * 1;
		
		return duration && !isNaN(duration)
			? duration
			: durationDefault;
	}

	function setClass($node, name, duration) {
		var defer = new $.Deferred();
		$node.addClass(name);

		var onFinish = function() {
			$node.removeClass(name);
			defer.resolve();
		};

		setTimeout(onFinish, duration);
		return defer.promise();
	}

	function wrap(item) {
		return item == null ? null : (item instanceof $ ? item : $(item));
	}

	function getCarousel(item, attr) {
		var id = wrap(item).attr(attr);
		var carousel = document.getElementById(id);
		if (carousel == null) return null;

		var $carousel = $(carousel);
		return $carousel.length ? $carousel : null;
	}

	var count = 0;

	function getElement(id, attr) {
		var selector = '[' + attr + '="' + id + '"]';
		var $element = $(selector);
		return $element.length ? $element : null;
	}

	function toInner($carousel, index, effect) {
		if (typeof(index) === 'object') index = wrap(index).index();

		var promise = $.when();

		var $slides = $carousel.children();
		var $active = $slides.filter('.active');
		$slides.removeClass('active');

		var $slide = $slides.eq(index);
		$slide.addClass('active');

		$carousel.trigger('change.carousel', [$slide.index()]);

		var duration = getDuration($carousel);

		if (effect) {
			var pA = setClass($carousel, effect, duration);
			var pB = setClass($active, 'leave', duration);
			var pC = setClass($slide, 'enter', duration);

			promise = $.when(pA, pB, pC);
		}

		setAutoplay($carousel);

		var id = $carousel.attr('id');
		if (id == null) return promise;

		var $index = getElement(id, 'data-index');
		if ($index) $index.text(index + 1);

		var $dots = getElement(id, 'data-dots');
		if ($dots == null) return promise;

		$dots = $dots.children();
		$dots.removeClass('active');
		$dots.eq(index).addClass('active');

		return promise;
	}

	function to($carousel, index, type) {
		var args = $carousel.data('carouselArgs');
		
		if (args != null) {
			$carousel.data('carouselArgs', [index, type]);
			return;
		}

		var promise = toInner($carousel, index, type);
		$carousel.data('carouselArgs', 0);

		var handler = function() {
			var args = $carousel.data('carouselArgs');
			$carousel.data('carouselArgs', null);
			
			if (!args) {
				$carousel.trigger('changeAfter.carousel');
				return;
			}

			var promise = toInner($carousel, args[0], args[1]);
			$carousel.data('carouselArgs', 0);
			promise.then(handler);
		};

		promise.then(handler);
	}

	function toLast($carousel, type) {
		var count = $carousel.children().length;
		var last = count - 1;
		return to($carousel, last, type);
	}

	function seed($carousel, type) {
		var $slides = $carousel.children();
		var index = $slides.filter('.active').index();
		var count = $slides.length;

		var value = type == 'next' ? 1 : -1;
		var next = index + value;

		if (next < 0) next = count - 1;
		if (next >= count) next = 0;

		to($carousel, next, type);
	}

	function setAutoplay($carousel) {
		var time = $carousel.attr('data-autoplay');
		if (time == null) return;

		var prev = $carousel.data('carouselAutoplay');
		if (prev) clearTimeout(prev);

		var duration = getDuration($carousel);

		time *= 1;
		if (!time || isNaN(time)) time = autoplay;
		time += duration;

		var tick = function() {
			seed($carousel, 'next');
		};

		var stamp = setTimeout(tick, time);
		$carousel.data('carouselAutoplay', stamp);
	}

	function onDots(e) {
		var $dots = $(e.target).closest('[data-dots]');

		var $carousel = getCarousel($dots, 'data-dots');		
		if ($carousel == null) return;

		var effect = $dots.attr('data-effect');

		e.preventDefault();
		to($carousel, this, effect);
	}

	function onSeed(e, node, type) {
		var $carousel = getCarousel(node, 'data-' + type);
		if ($carousel == null) return;

		e.preventDefault();
		seed($carousel, type);
	}

	function onNext(e) {
		return onSeed(e, this, 'next');
	}

	function onBack(e) {
		return onSeed(e, this, 'back');
	}

	function onReady() {
		var $autoplays = $('[data-autoplay]');

		for (var i = 0; i < $autoplays.length; i++) {
			var $carousel = $autoplays.eq(i);
			setAutoplay($carousel);
		}
	}

	$(document)
		.on('click', '[data-dots] > *', onDots)
		.on('click', '[data-back]', onBack)
		.on('click', '[data-next]', onNext)
		.on('start', onReady);

	window.carouselTo = function(element, index, effect) {
		var node = wrap(element);
		return to(node, index, effect);
	};

	window.carouselIndex = function(element) {
		var index = wrap(element).children().filter('.active').index();
		return index;
	};

	window.carouselToLast = function(element, effect) {
		var node = wrap(element);
		return toLast(node, effect);
	};

	window.carouselToFirst = function(element, effect) {
		var node = wrap(element);
		return to(node, 0, effect);
	};

	window.carouselCount = function(element) {
		var node = wrap(element);
		return node.children().length;
	};

})(window.jQuery);
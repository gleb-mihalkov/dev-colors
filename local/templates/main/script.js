//
// SmoothScroll for websites v1.4.6 (Balazs Galambosi)
// http://www.smoothscroll.net/
//
// Licensed under the terms of the MIT license.
//
// You may use it in your theme if you credit me. 
// It is also free to use on any individual website.
//
// Exception:
// The only restriction is to not publish any  
// extension for browsers or native application
// without getting a written permission first.
//

(function () {
  
// Scroll Variables (tweakable)
var defaultOptions = {

    // Scrolling Core
    frameRate        : 150, // [Hz]
    animationTime    : 400, // [ms]
    stepSize         : 100, // [px]

    // Pulse (less tweakable)
    // ratio of "tail" to "acceleration"
    pulseAlgorithm   : true,
    pulseScale       : 4,
    pulseNormalize   : 1,

    // Acceleration
    accelerationDelta : 50,  // 50
    accelerationMax   : 3,   // 3

    // Keyboard Settings
    keyboardSupport   : true,  // option
    arrowScroll       : 50,    // [px]

    // Other
    fixedBackground   : true, 
    excluded          : ''    
};

var options = defaultOptions;


// Other Variables
var isExcluded = false;
var isFrame = false;
var direction = { x: 0, y: 0 };
var initDone  = false;
var root = document.documentElement;
var activeElement;
var observer;
var refreshSize;
var deltaBuffer = [];
var isMac = /^Mac/.test(navigator.platform);

var key = { left: 37, up: 38, right: 39, down: 40, spacebar: 32, 
            pageup: 33, pagedown: 34, end: 35, home: 36 };
var arrowKeys = { 37: 1, 38: 1, 39: 1, 40: 1 };

/***********************************************
 * INITIALIZE
 ***********************************************/

/**
 * Tests if smooth scrolling is allowed. Shuts down everything if not.
 */
function initTest() {
    if (options.keyboardSupport) {
        addEvent('keydown', keydown);
    }
}

/**
 * Sets up scrolls array, determines if frames are involved.
 */
function init() {
  
    if (initDone || !document.body) return;

    initDone = true;

    var body = document.body;
    var html = document.documentElement;
    var windowHeight = window.innerHeight; 
    var scrollHeight = body.scrollHeight;
    
    // check compat mode for root element
    root = (document.compatMode.indexOf('CSS') >= 0) ? html : body;
    activeElement = body;
    
    initTest();

    // Checks if this script is running in a frame
    if (top != self) {
        isFrame = true;
    }

    /**
     * Safari 10 fixed it, Chrome fixed it in v45:
     * This fixes a bug where the areas left and right to 
     * the content does not trigger the onmousewheel event
     * on some pages. e.g.: html, body { height: 100% }
     */
    else if (isOldSafari &&
             scrollHeight > windowHeight &&
            (body.offsetHeight <= windowHeight || 
             html.offsetHeight <= windowHeight)) {

        var fullPageElem = document.createElement('div');
        fullPageElem.style.cssText = 'position:absolute; z-index:-10000; ' +
                                     'top:0; left:0; right:0; height:' + 
                                      root.scrollHeight + 'px';
        document.body.appendChild(fullPageElem);
        
        // DOM changed (throttled) to fix height
        var pendingRefresh;
        refreshSize = function () {
            if (pendingRefresh) return; // could also be: clearTimeout(pendingRefresh);
            pendingRefresh = setTimeout(function () {
                if (isExcluded) return; // could be running after cleanup
                fullPageElem.style.height = '0';
                fullPageElem.style.height = root.scrollHeight + 'px';
                pendingRefresh = null;
            }, 500); // act rarely to stay fast
        };
  
        setTimeout(refreshSize, 10);

        addEvent('resize', refreshSize);

        // TODO: attributeFilter?
        var config = {
            attributes: true, 
            childList: true, 
            characterData: false 
            // subtree: true
        };

        observer = new MutationObserver(refreshSize);
        observer.observe(body, config);

        if (root.offsetHeight <= windowHeight) {
            var clearfix = document.createElement('div');   
            clearfix.style.clear = 'both';
            body.appendChild(clearfix);
        }
    }

    // disable fixed background
    if (!options.fixedBackground && !isExcluded) {
        body.style.backgroundAttachment = 'scroll';
        html.style.backgroundAttachment = 'scroll';
    }
}

/**
 * Removes event listeners and other traces left on the page.
 */
function cleanup() {
    observer && observer.disconnect();
    removeEvent(wheelEvent, wheel);
    removeEvent('mousedown', mousedown);
    removeEvent('keydown', keydown);
    removeEvent('resize', refreshSize);
    removeEvent('load', init);
}


/************************************************
 * SCROLLING 
 ************************************************/
 
var que = [];
var pending = false;
var lastScroll = Date.now();

/**
 * Pushes scroll actions to the scrolling queue.
 */
function scrollArray(elem, left, top) {
    
    directionCheck(left, top);

    if (options.accelerationMax != 1) {
        var now = Date.now();
        var elapsed = now - lastScroll;
        if (elapsed < options.accelerationDelta) {
            var factor = (1 + (50 / elapsed)) / 2;
            if (factor > 1) {
                factor = Math.min(factor, options.accelerationMax);
                left *= factor;
                top  *= factor;
            }
        }
        lastScroll = Date.now();
    }          
    
    // push a scroll command
    que.push({
        x: left, 
        y: top, 
        lastX: (left < 0) ? 0.99 : -0.99,
        lastY: (top  < 0) ? 0.99 : -0.99, 
        start: Date.now()
    });
        
    // don't act if there's a pending queue
    if (pending) {
        return;
    }  

    var scrollWindow = (elem === document.body);
    
    var step = function (time) {
        
        var now = Date.now();
        var scrollX = 0;
        var scrollY = 0; 
    
        for (var i = 0; i < que.length; i++) {
            
            var item = que[i];
            var elapsed  = now - item.start;
            var finished = (elapsed >= options.animationTime);
            
            // scroll position: [0, 1]
            var position = (finished) ? 1 : elapsed / options.animationTime;
            
            // easing [optional]
            if (options.pulseAlgorithm) {
                position = pulse(position);
            }
            
            // only need the difference
            var x = (item.x * position - item.lastX) >> 0;
            var y = (item.y * position - item.lastY) >> 0;
            
            // add this to the total scrolling
            scrollX += x;
            scrollY += y;            
            
            // update last values
            item.lastX += x;
            item.lastY += y;
        
            // delete and step back if it's over
            if (finished) {
                que.splice(i, 1); i--;
            }           
        }

        // scroll left and top
        if (scrollWindow) {
            window.scrollBy(scrollX, scrollY);
        } 
        else {
            if (scrollX) elem.scrollLeft += scrollX;
            if (scrollY) elem.scrollTop  += scrollY;                    
        }
        
        // clean up if there's nothing left to do
        if (!left && !top) {
            que = [];
        }
        
        if (que.length) { 
            requestFrame(step, elem, (1000 / options.frameRate + 1)); 
        } else { 
            pending = false;
        }
    };
    
    // start a new queue of actions
    requestFrame(step, elem, 0);
    pending = true;
}


/***********************************************
 * EVENTS
 ***********************************************/

/**
 * Mouse wheel handler.
 * @param {Object} event
 */
function wheel(event) {

    if (!initDone) {
        init();
    }
    
    var target = event.target;

    // leave early if default action is prevented   
    // or it's a zooming event with CTRL 
    if (event.defaultPrevented || event.ctrlKey) {
        return true;
    }
    
    // leave embedded content alone (flash & pdf)
    if (isNodeName(activeElement, 'embed') || 
       (isNodeName(target, 'embed') && /\.pdf/i.test(target.src)) ||
        isNodeName(activeElement, 'object') ||
        target.shadowRoot) {
        return true;
    }

    var deltaX = -event.wheelDeltaX || event.deltaX || 0;
    var deltaY = -event.wheelDeltaY || event.deltaY || 0;
    
    if (isMac) {
        if (event.wheelDeltaX && isDivisible(event.wheelDeltaX, 120)) {
            deltaX = -120 * (event.wheelDeltaX / Math.abs(event.wheelDeltaX));
        }
        if (event.wheelDeltaY && isDivisible(event.wheelDeltaY, 120)) {
            deltaY = -120 * (event.wheelDeltaY / Math.abs(event.wheelDeltaY));
        }
    }
    
    // use wheelDelta if deltaX/Y is not available
    if (!deltaX && !deltaY) {
        deltaY = -event.wheelDelta || 0;
    }

    // line based scrolling (Firefox mostly)
    if (event.deltaMode === 1) {
        deltaX *= 40;
        deltaY *= 40;
    }

    var overflowing = overflowingAncestor(target);

    // nothing to do if there's no element that's scrollable
    if (!overflowing) {
        // except Chrome iframes seem to eat wheel events, which we need to 
        // propagate up, if the iframe has nothing overflowing to scroll
        if (isFrame && isChrome)  {
            // change target to iframe element itself for the parent frame
            Object.defineProperty(event, "target", {value: window.frameElement});
            return parent.wheel(event);
        }
        return true;
    }
    
    // check if it's a touchpad scroll that should be ignored
    if (isTouchpad(deltaY)) {
        return true;
    }

    // scale by step size
    // delta is 120 most of the time
    // synaptics seems to send 1 sometimes
    if (Math.abs(deltaX) > 1.2) {
        deltaX *= options.stepSize / 120;
    }
    if (Math.abs(deltaY) > 1.2) {
        deltaY *= options.stepSize / 120;
    }
    
    scrollArray(overflowing, deltaX, deltaY);
    event.preventDefault();
    scheduleClearCache();
}

/**
 * Keydown event handler.
 * @param {Object} event
 */
function keydown(event) {

    var target   = event.target;
    var modifier = event.ctrlKey || event.altKey || event.metaKey || 
                  (event.shiftKey && event.keyCode !== key.spacebar);
    
    // our own tracked active element could've been removed from the DOM
    if (!document.body.contains(activeElement)) {
        activeElement = document.activeElement;
    }

    // do nothing if user is editing text
    // or using a modifier key (except shift)
    // or in a dropdown
    // or inside interactive elements
    var inputNodeNames = /^(textarea|select|embed|object)$/i;
    var buttonTypes = /^(button|submit|radio|checkbox|file|color|image)$/i;
    if ( event.defaultPrevented ||
         inputNodeNames.test(target.nodeName) ||
         isNodeName(target, 'input') && !buttonTypes.test(target.type) ||
         isNodeName(activeElement, 'video') ||
         isInsideYoutubeVideo(event) ||
         target.isContentEditable || 
         modifier ) {
      return true;
    }

    // [spacebar] should trigger button press, leave it alone
    if ((isNodeName(target, 'button') ||
         isNodeName(target, 'input') && buttonTypes.test(target.type)) &&
        event.keyCode === key.spacebar) {
      return true;
    }

    // [arrwow keys] on radio buttons should be left alone
    if (isNodeName(target, 'input') && target.type == 'radio' &&
        arrowKeys[event.keyCode])  {
      return true;
    }
    
    var shift, x = 0, y = 0;
    var overflowing = overflowingAncestor(activeElement);

    if (!overflowing) {
        // Chrome iframes seem to eat key events, which we need to 
        // propagate up, if the iframe has nothing overflowing to scroll
        return (isFrame && isChrome) ? parent.keydown(event) : true;
    }

    var clientHeight = overflowing.clientHeight; 

    if (overflowing == document.body) {
        clientHeight = window.innerHeight;
    }

    switch (event.keyCode) {
        case key.up:
            y = -options.arrowScroll;
            break;
        case key.down:
            y = options.arrowScroll;
            break;         
        case key.spacebar: // (+ shift)
            shift = event.shiftKey ? 1 : -1;
            y = -shift * clientHeight * 0.9;
            break;
        case key.pageup:
            y = -clientHeight * 0.9;
            break;
        case key.pagedown:
            y = clientHeight * 0.9;
            break;
        case key.home:
            y = -overflowing.scrollTop;
            break;
        case key.end:
            var scroll = overflowing.scrollHeight - overflowing.scrollTop;
            var scrollRemaining = scroll - clientHeight;
            y = (scrollRemaining > 0) ? scrollRemaining + 10 : 0;
            break;
        case key.left:
            x = -options.arrowScroll;
            break;
        case key.right:
            x = options.arrowScroll;
            break;            
        default:
            return true; // a key we don't care about
    }

    scrollArray(overflowing, x, y);
    event.preventDefault();
    scheduleClearCache();
}

/**
 * Mousedown event only for updating activeElement
 */
function mousedown(event) {
    activeElement = event.target;
}


/***********************************************
 * OVERFLOW
 ***********************************************/

var uniqueID = (function () {
    var i = 0;
    return function (el) {
        return el.uniqueID || (el.uniqueID = i++);
    };
})();

var cache = {}; // cleared out after a scrolling session
var clearCacheTimer;

//setInterval(function () { cache = {}; }, 10 * 1000);

function scheduleClearCache() {
    clearTimeout(clearCacheTimer);
    clearCacheTimer = setInterval(function () { cache = {}; }, 1*1000);
}

function setCache(elems, overflowing) {
    for (var i = elems.length; i--;)
        cache[uniqueID(elems[i])] = overflowing;
    return overflowing;
}

//  (body)                (root)
//         | hidden | visible | scroll |  auto  |
// hidden  |   no   |    no   |   YES  |   YES  |
// visible |   no   |   YES   |   YES  |   YES  |
// scroll  |   no   |   YES   |   YES  |   YES  |
// auto    |   no   |   YES   |   YES  |   YES  |

function overflowingAncestor(el) {
    var elems = [];
    var body = document.body;
    var rootScrollHeight = root.scrollHeight;
    do {
        var cached = cache[uniqueID(el)];
        if (cached) {
            return setCache(elems, cached);
        }
        elems.push(el);
        if (rootScrollHeight === el.scrollHeight) {
            var topOverflowsNotHidden = overflowNotHidden(root) && overflowNotHidden(body);
            var isOverflowCSS = topOverflowsNotHidden || overflowAutoOrScroll(root);
            if (isFrame && isContentOverflowing(root) || 
               !isFrame && isOverflowCSS) {
                return setCache(elems, getScrollRoot()); 
            }
        } else if (isContentOverflowing(el) && overflowAutoOrScroll(el)) {
            return setCache(elems, el);
        }
    } while (el = el.parentElement);
}

function isContentOverflowing(el) {
    return (el.clientHeight + 10 < el.scrollHeight);
}

// typically for <body> and <html>
function overflowNotHidden(el) {
    var overflow = getComputedStyle(el, '').getPropertyValue('overflow-y');
    return (overflow !== 'hidden');
}

// for all other elements
function overflowAutoOrScroll(el) {
    var overflow = getComputedStyle(el, '').getPropertyValue('overflow-y');
    return (overflow === 'scroll' || overflow === 'auto');
}


/***********************************************
 * HELPERS
 ***********************************************/

function addEvent(type, fn) {
    window.addEventListener(type, fn, false);
}

function removeEvent(type, fn) {
    window.removeEventListener(type, fn, false);  
}

function isNodeName(el, tag) {
    return (el.nodeName||'').toLowerCase() === tag.toLowerCase();
}

function directionCheck(x, y) {
    x = (x > 0) ? 1 : -1;
    y = (y > 0) ? 1 : -1;
    if (direction.x !== x || direction.y !== y) {
        direction.x = x;
        direction.y = y;
        que = [];
        lastScroll = 0;
    }
}

var deltaBufferTimer;

if (window.localStorage && localStorage.SS_deltaBuffer) {
    try { // #46 Safari throws in private browsing for localStorage 
        deltaBuffer = localStorage.SS_deltaBuffer.split(',');
    } catch (e) { } 
}

function isTouchpad(deltaY) {
    if (!deltaY) return;
    if (!deltaBuffer.length) {
        deltaBuffer = [deltaY, deltaY, deltaY];
    }
    deltaY = Math.abs(deltaY);
    deltaBuffer.push(deltaY);
    deltaBuffer.shift();
    clearTimeout(deltaBufferTimer);
    deltaBufferTimer = setTimeout(function () {
        try { // #46 Safari throws in private browsing for localStorage
            localStorage.SS_deltaBuffer = deltaBuffer.join(',');
        } catch (e) { }  
    }, 1000);
    return !allDeltasDivisableBy(120) && !allDeltasDivisableBy(100);
} 

function isDivisible(n, divisor) {
    return (Math.floor(n / divisor) == n / divisor);
}

function allDeltasDivisableBy(divisor) {
    return (isDivisible(deltaBuffer[0], divisor) &&
            isDivisible(deltaBuffer[1], divisor) &&
            isDivisible(deltaBuffer[2], divisor));
}

function isInsideYoutubeVideo(event) {
    var elem = event.target;
    var isControl = false;
    if (document.URL.indexOf ('www.youtube.com/watch') != -1) {
        do {
            isControl = (elem.classList && 
                         elem.classList.contains('html5-video-controls'));
            if (isControl) break;
        } while (elem = elem.parentNode);
    }
    return isControl;
}

var requestFrame = (function () {
      return (window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    ||
              function (callback, element, delay) {
                 window.setTimeout(callback, delay || (1000/60));
             });
})();

var MutationObserver = (window.MutationObserver || 
                        window.WebKitMutationObserver ||
                        window.MozMutationObserver);  

var getScrollRoot = (function() {
  var SCROLL_ROOT;
  return function() {
    if (!SCROLL_ROOT) {
      var dummy = document.createElement('div');
      dummy.style.cssText = 'height:10000px;width:1px;';
      document.body.appendChild(dummy);
      var bodyScrollTop  = document.body.scrollTop;
      var docElScrollTop = document.documentElement.scrollTop;
      window.scrollBy(0, 3);
      if (document.body.scrollTop != bodyScrollTop)
        (SCROLL_ROOT = document.body);
      else 
        (SCROLL_ROOT = document.documentElement);
      window.scrollBy(0, -3);
      document.body.removeChild(dummy);
    }
    return SCROLL_ROOT;
  };
})();


/***********************************************
 * PULSE (by Michael Herf)
 ***********************************************/
 
/**
 * Viscous fluid with a pulse for part and decay for the rest.
 * - Applies a fixed force over an interval (a damped acceleration), and
 * - Lets the exponential bleed away the velocity over a longer interval
 * - Michael Herf, http://stereopsis.com/stopping/
 */
function pulse_(x) {
    var val, start, expx;
    // test
    x = x * options.pulseScale;
    if (x < 1) { // acceleartion
        val = x - (1 - Math.exp(-x));
    } else {     // tail
        // the previous animation ended here:
        start = Math.exp(-1);
        // simple viscous drag
        x -= 1;
        expx = 1 - Math.exp(-x);
        val = start + (expx * (1 - start));
    }
    return val * options.pulseNormalize;
}

function pulse(x) {
    if (x >= 1) return 1;
    if (x <= 0) return 0;

    if (options.pulseNormalize == 1) {
        options.pulseNormalize /= pulse_(1);
    }
    return pulse_(x);
}


/***********************************************
 * FIRST RUN
 ***********************************************/

var userAgent = window.navigator.userAgent;
var isEdge    = /Edge/.test(userAgent); // thank you MS
var isChrome  = /chrome/i.test(userAgent) && !isEdge; 
var isSafari  = /safari/i.test(userAgent) && !isEdge; 
var isMobile  = /mobile/i.test(userAgent);
var isIEWin7  = /Windows NT 6.1/i.test(userAgent) && /rv:11/i.test(userAgent);
var isOldSafari = isSafari && (/Version\/8/i.test(userAgent) || /Version\/9/i.test(userAgent));
var isEnabledForBrowser = (isChrome || isSafari || isIEWin7) && !isMobile;

var wheelEvent;
if ('onwheel' in document.createElement('div'))
    wheelEvent = 'wheel';
else if ('onmousewheel' in document.createElement('div'))
    wheelEvent = 'mousewheel';

if (wheelEvent && isEnabledForBrowser) {
    addEvent(wheelEvent, wheel);
    addEvent('mousedown', mousedown);
    addEvent('load', init);
}


/***********************************************
 * PUBLIC INTERFACE
 ***********************************************/

function SmoothScroll(optionsToSet) {
    for (var key in optionsToSet)
        if (defaultOptions.hasOwnProperty(key)) 
            options[key] = optionsToSet[key];
}
SmoothScroll.destroy = cleanup;

if (window.SmoothScrollOptions) // async API
    SmoothScroll(window.SmoothScrollOptions);

if (typeof define === 'function' && define.amd)
    define(function() {
        return SmoothScroll;
    });
else if ('object' == typeof exports)
    module.exports = SmoothScroll;
else
    window.SmoothScroll = SmoothScroll;

})();

/*! jQuery v3.2.1 | (c) JS Foundation and other contributors | jquery.org/license */
!function(a,b){"use strict";"object"==typeof module&&"object"==typeof module.exports?module.exports=a.document?b(a,!0):function(a){if(!a.document)throw new Error("jQuery requires a window with a document");return b(a)}:b(a)}("undefined"!=typeof window?window:this,function(a,b){"use strict";var c=[],d=a.document,e=Object.getPrototypeOf,f=c.slice,g=c.concat,h=c.push,i=c.indexOf,j={},k=j.toString,l=j.hasOwnProperty,m=l.toString,n=m.call(Object),o={};function p(a,b){b=b||d;var c=b.createElement("script");c.text=a,b.head.appendChild(c).parentNode.removeChild(c)}var q="3.2.1",r=function(a,b){return new r.fn.init(a,b)},s=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,t=/^-ms-/,u=/-([a-z])/g,v=function(a,b){return b.toUpperCase()};r.fn=r.prototype={jquery:q,constructor:r,length:0,toArray:function(){return f.call(this)},get:function(a){return null==a?f.call(this):a<0?this[a+this.length]:this[a]},pushStack:function(a){var b=r.merge(this.constructor(),a);return b.prevObject=this,b},each:function(a){return r.each(this,a)},map:function(a){return this.pushStack(r.map(this,function(b,c){return a.call(b,c,b)}))},slice:function(){return this.pushStack(f.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(a){var b=this.length,c=+a+(a<0?b:0);return this.pushStack(c>=0&&c<b?[this[c]]:[])},end:function(){return this.prevObject||this.constructor()},push:h,sort:c.sort,splice:c.splice},r.extend=r.fn.extend=function(){var a,b,c,d,e,f,g=arguments[0]||{},h=1,i=arguments.length,j=!1;for("boolean"==typeof g&&(j=g,g=arguments[h]||{},h++),"object"==typeof g||r.isFunction(g)||(g={}),h===i&&(g=this,h--);h<i;h++)if(null!=(a=arguments[h]))for(b in a)c=g[b],d=a[b],g!==d&&(j&&d&&(r.isPlainObject(d)||(e=Array.isArray(d)))?(e?(e=!1,f=c&&Array.isArray(c)?c:[]):f=c&&r.isPlainObject(c)?c:{},g[b]=r.extend(j,f,d)):void 0!==d&&(g[b]=d));return g},r.extend({expando:"jQuery"+(q+Math.random()).replace(/\D/g,""),isReady:!0,error:function(a){throw new Error(a)},noop:function(){},isFunction:function(a){return"function"===r.type(a)},isWindow:function(a){return null!=a&&a===a.window},isNumeric:function(a){var b=r.type(a);return("number"===b||"string"===b)&&!isNaN(a-parseFloat(a))},isPlainObject:function(a){var b,c;return!(!a||"[object Object]"!==k.call(a))&&(!(b=e(a))||(c=l.call(b,"constructor")&&b.constructor,"function"==typeof c&&m.call(c)===n))},isEmptyObject:function(a){var b;for(b in a)return!1;return!0},type:function(a){return null==a?a+"":"object"==typeof a||"function"==typeof a?j[k.call(a)]||"object":typeof a},globalEval:function(a){p(a)},camelCase:function(a){return a.replace(t,"ms-").replace(u,v)},each:function(a,b){var c,d=0;if(w(a)){for(c=a.length;d<c;d++)if(b.call(a[d],d,a[d])===!1)break}else for(d in a)if(b.call(a[d],d,a[d])===!1)break;return a},trim:function(a){return null==a?"":(a+"").replace(s,"")},makeArray:function(a,b){var c=b||[];return null!=a&&(w(Object(a))?r.merge(c,"string"==typeof a?[a]:a):h.call(c,a)),c},inArray:function(a,b,c){return null==b?-1:i.call(b,a,c)},merge:function(a,b){for(var c=+b.length,d=0,e=a.length;d<c;d++)a[e++]=b[d];return a.length=e,a},grep:function(a,b,c){for(var d,e=[],f=0,g=a.length,h=!c;f<g;f++)d=!b(a[f],f),d!==h&&e.push(a[f]);return e},map:function(a,b,c){var d,e,f=0,h=[];if(w(a))for(d=a.length;f<d;f++)e=b(a[f],f,c),null!=e&&h.push(e);else for(f in a)e=b(a[f],f,c),null!=e&&h.push(e);return g.apply([],h)},guid:1,proxy:function(a,b){var c,d,e;if("string"==typeof b&&(c=a[b],b=a,a=c),r.isFunction(a))return d=f.call(arguments,2),e=function(){return a.apply(b||this,d.concat(f.call(arguments)))},e.guid=a.guid=a.guid||r.guid++,e},now:Date.now,support:o}),"function"==typeof Symbol&&(r.fn[Symbol.iterator]=c[Symbol.iterator]),r.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),function(a,b){j["[object "+b+"]"]=b.toLowerCase()});function w(a){var b=!!a&&"length"in a&&a.length,c=r.type(a);return"function"!==c&&!r.isWindow(a)&&("array"===c||0===b||"number"==typeof b&&b>0&&b-1 in a)}var x=function(a){var b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u="sizzle"+1*new Date,v=a.document,w=0,x=0,y=ha(),z=ha(),A=ha(),B=function(a,b){return a===b&&(l=!0),0},C={}.hasOwnProperty,D=[],E=D.pop,F=D.push,G=D.push,H=D.slice,I=function(a,b){for(var c=0,d=a.length;c<d;c++)if(a[c]===b)return c;return-1},J="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",K="[\\x20\\t\\r\\n\\f]",L="(?:\\\\.|[\\w-]|[^\0-\\xa0])+",M="\\["+K+"*("+L+")(?:"+K+"*([*^$|!~]?=)"+K+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+L+"))|)"+K+"*\\]",N=":("+L+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+M+")*)|.*)\\)|)",O=new RegExp(K+"+","g"),P=new RegExp("^"+K+"+|((?:^|[^\\\\])(?:\\\\.)*)"+K+"+$","g"),Q=new RegExp("^"+K+"*,"+K+"*"),R=new RegExp("^"+K+"*([>+~]|"+K+")"+K+"*"),S=new RegExp("="+K+"*([^\\]'\"]*?)"+K+"*\\]","g"),T=new RegExp(N),U=new RegExp("^"+L+"$"),V={ID:new RegExp("^#("+L+")"),CLASS:new RegExp("^\\.("+L+")"),TAG:new RegExp("^("+L+"|[*])"),ATTR:new RegExp("^"+M),PSEUDO:new RegExp("^"+N),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+K+"*(even|odd|(([+-]|)(\\d*)n|)"+K+"*(?:([+-]|)"+K+"*(\\d+)|))"+K+"*\\)|)","i"),bool:new RegExp("^(?:"+J+")$","i"),needsContext:new RegExp("^"+K+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+K+"*((?:-\\d)?\\d*)"+K+"*\\)|)(?=[^-]|$)","i")},W=/^(?:input|select|textarea|button)$/i,X=/^h\d$/i,Y=/^[^{]+\{\s*\[native \w/,Z=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,$=/[+~]/,_=new RegExp("\\\\([\\da-f]{1,6}"+K+"?|("+K+")|.)","ig"),aa=function(a,b,c){var d="0x"+b-65536;return d!==d||c?b:d<0?String.fromCharCode(d+65536):String.fromCharCode(d>>10|55296,1023&d|56320)},ba=/([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,ca=function(a,b){return b?"\0"===a?"\ufffd":a.slice(0,-1)+"\\"+a.charCodeAt(a.length-1).toString(16)+" ":"\\"+a},da=function(){m()},ea=ta(function(a){return a.disabled===!0&&("form"in a||"label"in a)},{dir:"parentNode",next:"legend"});try{G.apply(D=H.call(v.childNodes),v.childNodes),D[v.childNodes.length].nodeType}catch(fa){G={apply:D.length?function(a,b){F.apply(a,H.call(b))}:function(a,b){var c=a.length,d=0;while(a[c++]=b[d++]);a.length=c-1}}}function ga(a,b,d,e){var f,h,j,k,l,o,r,s=b&&b.ownerDocument,w=b?b.nodeType:9;if(d=d||[],"string"!=typeof a||!a||1!==w&&9!==w&&11!==w)return d;if(!e&&((b?b.ownerDocument||b:v)!==n&&m(b),b=b||n,p)){if(11!==w&&(l=Z.exec(a)))if(f=l[1]){if(9===w){if(!(j=b.getElementById(f)))return d;if(j.id===f)return d.push(j),d}else if(s&&(j=s.getElementById(f))&&t(b,j)&&j.id===f)return d.push(j),d}else{if(l[2])return G.apply(d,b.getElementsByTagName(a)),d;if((f=l[3])&&c.getElementsByClassName&&b.getElementsByClassName)return G.apply(d,b.getElementsByClassName(f)),d}if(c.qsa&&!A[a+" "]&&(!q||!q.test(a))){if(1!==w)s=b,r=a;else if("object"!==b.nodeName.toLowerCase()){(k=b.getAttribute("id"))?k=k.replace(ba,ca):b.setAttribute("id",k=u),o=g(a),h=o.length;while(h--)o[h]="#"+k+" "+sa(o[h]);r=o.join(","),s=$.test(a)&&qa(b.parentNode)||b}if(r)try{return G.apply(d,s.querySelectorAll(r)),d}catch(x){}finally{k===u&&b.removeAttribute("id")}}}return i(a.replace(P,"$1"),b,d,e)}function ha(){var a=[];function b(c,e){return a.push(c+" ")>d.cacheLength&&delete b[a.shift()],b[c+" "]=e}return b}function ia(a){return a[u]=!0,a}function ja(a){var b=n.createElement("fieldset");try{return!!a(b)}catch(c){return!1}finally{b.parentNode&&b.parentNode.removeChild(b),b=null}}function ka(a,b){var c=a.split("|"),e=c.length;while(e--)d.attrHandle[c[e]]=b}function la(a,b){var c=b&&a,d=c&&1===a.nodeType&&1===b.nodeType&&a.sourceIndex-b.sourceIndex;if(d)return d;if(c)while(c=c.nextSibling)if(c===b)return-1;return a?1:-1}function ma(a){return function(b){var c=b.nodeName.toLowerCase();return"input"===c&&b.type===a}}function na(a){return function(b){var c=b.nodeName.toLowerCase();return("input"===c||"button"===c)&&b.type===a}}function oa(a){return function(b){return"form"in b?b.parentNode&&b.disabled===!1?"label"in b?"label"in b.parentNode?b.parentNode.disabled===a:b.disabled===a:b.isDisabled===a||b.isDisabled!==!a&&ea(b)===a:b.disabled===a:"label"in b&&b.disabled===a}}function pa(a){return ia(function(b){return b=+b,ia(function(c,d){var e,f=a([],c.length,b),g=f.length;while(g--)c[e=f[g]]&&(c[e]=!(d[e]=c[e]))})})}function qa(a){return a&&"undefined"!=typeof a.getElementsByTagName&&a}c=ga.support={},f=ga.isXML=function(a){var b=a&&(a.ownerDocument||a).documentElement;return!!b&&"HTML"!==b.nodeName},m=ga.setDocument=function(a){var b,e,g=a?a.ownerDocument||a:v;return g!==n&&9===g.nodeType&&g.documentElement?(n=g,o=n.documentElement,p=!f(n),v!==n&&(e=n.defaultView)&&e.top!==e&&(e.addEventListener?e.addEventListener("unload",da,!1):e.attachEvent&&e.attachEvent("onunload",da)),c.attributes=ja(function(a){return a.className="i",!a.getAttribute("className")}),c.getElementsByTagName=ja(function(a){return a.appendChild(n.createComment("")),!a.getElementsByTagName("*").length}),c.getElementsByClassName=Y.test(n.getElementsByClassName),c.getById=ja(function(a){return o.appendChild(a).id=u,!n.getElementsByName||!n.getElementsByName(u).length}),c.getById?(d.filter.ID=function(a){var b=a.replace(_,aa);return function(a){return a.getAttribute("id")===b}},d.find.ID=function(a,b){if("undefined"!=typeof b.getElementById&&p){var c=b.getElementById(a);return c?[c]:[]}}):(d.filter.ID=function(a){var b=a.replace(_,aa);return function(a){var c="undefined"!=typeof a.getAttributeNode&&a.getAttributeNode("id");return c&&c.value===b}},d.find.ID=function(a,b){if("undefined"!=typeof b.getElementById&&p){var c,d,e,f=b.getElementById(a);if(f){if(c=f.getAttributeNode("id"),c&&c.value===a)return[f];e=b.getElementsByName(a),d=0;while(f=e[d++])if(c=f.getAttributeNode("id"),c&&c.value===a)return[f]}return[]}}),d.find.TAG=c.getElementsByTagName?function(a,b){return"undefined"!=typeof b.getElementsByTagName?b.getElementsByTagName(a):c.qsa?b.querySelectorAll(a):void 0}:function(a,b){var c,d=[],e=0,f=b.getElementsByTagName(a);if("*"===a){while(c=f[e++])1===c.nodeType&&d.push(c);return d}return f},d.find.CLASS=c.getElementsByClassName&&function(a,b){if("undefined"!=typeof b.getElementsByClassName&&p)return b.getElementsByClassName(a)},r=[],q=[],(c.qsa=Y.test(n.querySelectorAll))&&(ja(function(a){o.appendChild(a).innerHTML="<a id='"+u+"'></a><select id='"+u+"-\r\\' msallowcapture=''><option selected=''></option></select>",a.querySelectorAll("[msallowcapture^='']").length&&q.push("[*^$]="+K+"*(?:''|\"\")"),a.querySelectorAll("[selected]").length||q.push("\\["+K+"*(?:value|"+J+")"),a.querySelectorAll("[id~="+u+"-]").length||q.push("~="),a.querySelectorAll(":checked").length||q.push(":checked"),a.querySelectorAll("a#"+u+"+*").length||q.push(".#.+[+~]")}),ja(function(a){a.innerHTML="<a href='' disabled='disabled'></a><select disabled='disabled'><option/></select>";var b=n.createElement("input");b.setAttribute("type","hidden"),a.appendChild(b).setAttribute("name","D"),a.querySelectorAll("[name=d]").length&&q.push("name"+K+"*[*^$|!~]?="),2!==a.querySelectorAll(":enabled").length&&q.push(":enabled",":disabled"),o.appendChild(a).disabled=!0,2!==a.querySelectorAll(":disabled").length&&q.push(":enabled",":disabled"),a.querySelectorAll("*,:x"),q.push(",.*:")})),(c.matchesSelector=Y.test(s=o.matches||o.webkitMatchesSelector||o.mozMatchesSelector||o.oMatchesSelector||o.msMatchesSelector))&&ja(function(a){c.disconnectedMatch=s.call(a,"*"),s.call(a,"[s!='']:x"),r.push("!=",N)}),q=q.length&&new RegExp(q.join("|")),r=r.length&&new RegExp(r.join("|")),b=Y.test(o.compareDocumentPosition),t=b||Y.test(o.contains)?function(a,b){var c=9===a.nodeType?a.documentElement:a,d=b&&b.parentNode;return a===d||!(!d||1!==d.nodeType||!(c.contains?c.contains(d):a.compareDocumentPosition&&16&a.compareDocumentPosition(d)))}:function(a,b){if(b)while(b=b.parentNode)if(b===a)return!0;return!1},B=b?function(a,b){if(a===b)return l=!0,0;var d=!a.compareDocumentPosition-!b.compareDocumentPosition;return d?d:(d=(a.ownerDocument||a)===(b.ownerDocument||b)?a.compareDocumentPosition(b):1,1&d||!c.sortDetached&&b.compareDocumentPosition(a)===d?a===n||a.ownerDocument===v&&t(v,a)?-1:b===n||b.ownerDocument===v&&t(v,b)?1:k?I(k,a)-I(k,b):0:4&d?-1:1)}:function(a,b){if(a===b)return l=!0,0;var c,d=0,e=a.parentNode,f=b.parentNode,g=[a],h=[b];if(!e||!f)return a===n?-1:b===n?1:e?-1:f?1:k?I(k,a)-I(k,b):0;if(e===f)return la(a,b);c=a;while(c=c.parentNode)g.unshift(c);c=b;while(c=c.parentNode)h.unshift(c);while(g[d]===h[d])d++;return d?la(g[d],h[d]):g[d]===v?-1:h[d]===v?1:0},n):n},ga.matches=function(a,b){return ga(a,null,null,b)},ga.matchesSelector=function(a,b){if((a.ownerDocument||a)!==n&&m(a),b=b.replace(S,"='$1']"),c.matchesSelector&&p&&!A[b+" "]&&(!r||!r.test(b))&&(!q||!q.test(b)))try{var d=s.call(a,b);if(d||c.disconnectedMatch||a.document&&11!==a.document.nodeType)return d}catch(e){}return ga(b,n,null,[a]).length>0},ga.contains=function(a,b){return(a.ownerDocument||a)!==n&&m(a),t(a,b)},ga.attr=function(a,b){(a.ownerDocument||a)!==n&&m(a);var e=d.attrHandle[b.toLowerCase()],f=e&&C.call(d.attrHandle,b.toLowerCase())?e(a,b,!p):void 0;return void 0!==f?f:c.attributes||!p?a.getAttribute(b):(f=a.getAttributeNode(b))&&f.specified?f.value:null},ga.escape=function(a){return(a+"").replace(ba,ca)},ga.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)},ga.uniqueSort=function(a){var b,d=[],e=0,f=0;if(l=!c.detectDuplicates,k=!c.sortStable&&a.slice(0),a.sort(B),l){while(b=a[f++])b===a[f]&&(e=d.push(f));while(e--)a.splice(d[e],1)}return k=null,a},e=ga.getText=function(a){var b,c="",d=0,f=a.nodeType;if(f){if(1===f||9===f||11===f){if("string"==typeof a.textContent)return a.textContent;for(a=a.firstChild;a;a=a.nextSibling)c+=e(a)}else if(3===f||4===f)return a.nodeValue}else while(b=a[d++])c+=e(b);return c},d=ga.selectors={cacheLength:50,createPseudo:ia,match:V,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(a){return a[1]=a[1].replace(_,aa),a[3]=(a[3]||a[4]||a[5]||"").replace(_,aa),"~="===a[2]&&(a[3]=" "+a[3]+" "),a.slice(0,4)},CHILD:function(a){return a[1]=a[1].toLowerCase(),"nth"===a[1].slice(0,3)?(a[3]||ga.error(a[0]),a[4]=+(a[4]?a[5]+(a[6]||1):2*("even"===a[3]||"odd"===a[3])),a[5]=+(a[7]+a[8]||"odd"===a[3])):a[3]&&ga.error(a[0]),a},PSEUDO:function(a){var b,c=!a[6]&&a[2];return V.CHILD.test(a[0])?null:(a[3]?a[2]=a[4]||a[5]||"":c&&T.test(c)&&(b=g(c,!0))&&(b=c.indexOf(")",c.length-b)-c.length)&&(a[0]=a[0].slice(0,b),a[2]=c.slice(0,b)),a.slice(0,3))}},filter:{TAG:function(a){var b=a.replace(_,aa).toLowerCase();return"*"===a?function(){return!0}:function(a){return a.nodeName&&a.nodeName.toLowerCase()===b}},CLASS:function(a){var b=y[a+" "];return b||(b=new RegExp("(^|"+K+")"+a+"("+K+"|$)"))&&y(a,function(a){return b.test("string"==typeof a.className&&a.className||"undefined"!=typeof a.getAttribute&&a.getAttribute("class")||"")})},ATTR:function(a,b,c){return function(d){var e=ga.attr(d,a);return null==e?"!="===b:!b||(e+="","="===b?e===c:"!="===b?e!==c:"^="===b?c&&0===e.indexOf(c):"*="===b?c&&e.indexOf(c)>-1:"$="===b?c&&e.slice(-c.length)===c:"~="===b?(" "+e.replace(O," ")+" ").indexOf(c)>-1:"|="===b&&(e===c||e.slice(0,c.length+1)===c+"-"))}},CHILD:function(a,b,c,d,e){var f="nth"!==a.slice(0,3),g="last"!==a.slice(-4),h="of-type"===b;return 1===d&&0===e?function(a){return!!a.parentNode}:function(b,c,i){var j,k,l,m,n,o,p=f!==g?"nextSibling":"previousSibling",q=b.parentNode,r=h&&b.nodeName.toLowerCase(),s=!i&&!h,t=!1;if(q){if(f){while(p){m=b;while(m=m[p])if(h?m.nodeName.toLowerCase()===r:1===m.nodeType)return!1;o=p="only"===a&&!o&&"nextSibling"}return!0}if(o=[g?q.firstChild:q.lastChild],g&&s){m=q,l=m[u]||(m[u]={}),k=l[m.uniqueID]||(l[m.uniqueID]={}),j=k[a]||[],n=j[0]===w&&j[1],t=n&&j[2],m=n&&q.childNodes[n];while(m=++n&&m&&m[p]||(t=n=0)||o.pop())if(1===m.nodeType&&++t&&m===b){k[a]=[w,n,t];break}}else if(s&&(m=b,l=m[u]||(m[u]={}),k=l[m.uniqueID]||(l[m.uniqueID]={}),j=k[a]||[],n=j[0]===w&&j[1],t=n),t===!1)while(m=++n&&m&&m[p]||(t=n=0)||o.pop())if((h?m.nodeName.toLowerCase()===r:1===m.nodeType)&&++t&&(s&&(l=m[u]||(m[u]={}),k=l[m.uniqueID]||(l[m.uniqueID]={}),k[a]=[w,t]),m===b))break;return t-=e,t===d||t%d===0&&t/d>=0}}},PSEUDO:function(a,b){var c,e=d.pseudos[a]||d.setFilters[a.toLowerCase()]||ga.error("unsupported pseudo: "+a);return e[u]?e(b):e.length>1?(c=[a,a,"",b],d.setFilters.hasOwnProperty(a.toLowerCase())?ia(function(a,c){var d,f=e(a,b),g=f.length;while(g--)d=I(a,f[g]),a[d]=!(c[d]=f[g])}):function(a){return e(a,0,c)}):e}},pseudos:{not:ia(function(a){var b=[],c=[],d=h(a.replace(P,"$1"));return d[u]?ia(function(a,b,c,e){var f,g=d(a,null,e,[]),h=a.length;while(h--)(f=g[h])&&(a[h]=!(b[h]=f))}):function(a,e,f){return b[0]=a,d(b,null,f,c),b[0]=null,!c.pop()}}),has:ia(function(a){return function(b){return ga(a,b).length>0}}),contains:ia(function(a){return a=a.replace(_,aa),function(b){return(b.textContent||b.innerText||e(b)).indexOf(a)>-1}}),lang:ia(function(a){return U.test(a||"")||ga.error("unsupported lang: "+a),a=a.replace(_,aa).toLowerCase(),function(b){var c;do if(c=p?b.lang:b.getAttribute("xml:lang")||b.getAttribute("lang"))return c=c.toLowerCase(),c===a||0===c.indexOf(a+"-");while((b=b.parentNode)&&1===b.nodeType);return!1}}),target:function(b){var c=a.location&&a.location.hash;return c&&c.slice(1)===b.id},root:function(a){return a===o},focus:function(a){return a===n.activeElement&&(!n.hasFocus||n.hasFocus())&&!!(a.type||a.href||~a.tabIndex)},enabled:oa(!1),disabled:oa(!0),checked:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&!!a.checked||"option"===b&&!!a.selected},selected:function(a){return a.parentNode&&a.parentNode.selectedIndex,a.selected===!0},empty:function(a){for(a=a.firstChild;a;a=a.nextSibling)if(a.nodeType<6)return!1;return!0},parent:function(a){return!d.pseudos.empty(a)},header:function(a){return X.test(a.nodeName)},input:function(a){return W.test(a.nodeName)},button:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&"button"===a.type||"button"===b},text:function(a){var b;return"input"===a.nodeName.toLowerCase()&&"text"===a.type&&(null==(b=a.getAttribute("type"))||"text"===b.toLowerCase())},first:pa(function(){return[0]}),last:pa(function(a,b){return[b-1]}),eq:pa(function(a,b,c){return[c<0?c+b:c]}),even:pa(function(a,b){for(var c=0;c<b;c+=2)a.push(c);return a}),odd:pa(function(a,b){for(var c=1;c<b;c+=2)a.push(c);return a}),lt:pa(function(a,b,c){for(var d=c<0?c+b:c;--d>=0;)a.push(d);return a}),gt:pa(function(a,b,c){for(var d=c<0?c+b:c;++d<b;)a.push(d);return a})}},d.pseudos.nth=d.pseudos.eq;for(b in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})d.pseudos[b]=ma(b);for(b in{submit:!0,reset:!0})d.pseudos[b]=na(b);function ra(){}ra.prototype=d.filters=d.pseudos,d.setFilters=new ra,g=ga.tokenize=function(a,b){var c,e,f,g,h,i,j,k=z[a+" "];if(k)return b?0:k.slice(0);h=a,i=[],j=d.preFilter;while(h){c&&!(e=Q.exec(h))||(e&&(h=h.slice(e[0].length)||h),i.push(f=[])),c=!1,(e=R.exec(h))&&(c=e.shift(),f.push({value:c,type:e[0].replace(P," ")}),h=h.slice(c.length));for(g in d.filter)!(e=V[g].exec(h))||j[g]&&!(e=j[g](e))||(c=e.shift(),f.push({value:c,type:g,matches:e}),h=h.slice(c.length));if(!c)break}return b?h.length:h?ga.error(a):z(a,i).slice(0)};function sa(a){for(var b=0,c=a.length,d="";b<c;b++)d+=a[b].value;return d}function ta(a,b,c){var d=b.dir,e=b.next,f=e||d,g=c&&"parentNode"===f,h=x++;return b.first?function(b,c,e){while(b=b[d])if(1===b.nodeType||g)return a(b,c,e);return!1}:function(b,c,i){var j,k,l,m=[w,h];if(i){while(b=b[d])if((1===b.nodeType||g)&&a(b,c,i))return!0}else while(b=b[d])if(1===b.nodeType||g)if(l=b[u]||(b[u]={}),k=l[b.uniqueID]||(l[b.uniqueID]={}),e&&e===b.nodeName.toLowerCase())b=b[d]||b;else{if((j=k[f])&&j[0]===w&&j[1]===h)return m[2]=j[2];if(k[f]=m,m[2]=a(b,c,i))return!0}return!1}}function ua(a){return a.length>1?function(b,c,d){var e=a.length;while(e--)if(!a[e](b,c,d))return!1;return!0}:a[0]}function va(a,b,c){for(var d=0,e=b.length;d<e;d++)ga(a,b[d],c);return c}function wa(a,b,c,d,e){for(var f,g=[],h=0,i=a.length,j=null!=b;h<i;h++)(f=a[h])&&(c&&!c(f,d,e)||(g.push(f),j&&b.push(h)));return g}function xa(a,b,c,d,e,f){return d&&!d[u]&&(d=xa(d)),e&&!e[u]&&(e=xa(e,f)),ia(function(f,g,h,i){var j,k,l,m=[],n=[],o=g.length,p=f||va(b||"*",h.nodeType?[h]:h,[]),q=!a||!f&&b?p:wa(p,m,a,h,i),r=c?e||(f?a:o||d)?[]:g:q;if(c&&c(q,r,h,i),d){j=wa(r,n),d(j,[],h,i),k=j.length;while(k--)(l=j[k])&&(r[n[k]]=!(q[n[k]]=l))}if(f){if(e||a){if(e){j=[],k=r.length;while(k--)(l=r[k])&&j.push(q[k]=l);e(null,r=[],j,i)}k=r.length;while(k--)(l=r[k])&&(j=e?I(f,l):m[k])>-1&&(f[j]=!(g[j]=l))}}else r=wa(r===g?r.splice(o,r.length):r),e?e(null,g,r,i):G.apply(g,r)})}function ya(a){for(var b,c,e,f=a.length,g=d.relative[a[0].type],h=g||d.relative[" "],i=g?1:0,k=ta(function(a){return a===b},h,!0),l=ta(function(a){return I(b,a)>-1},h,!0),m=[function(a,c,d){var e=!g&&(d||c!==j)||((b=c).nodeType?k(a,c,d):l(a,c,d));return b=null,e}];i<f;i++)if(c=d.relative[a[i].type])m=[ta(ua(m),c)];else{if(c=d.filter[a[i].type].apply(null,a[i].matches),c[u]){for(e=++i;e<f;e++)if(d.relative[a[e].type])break;return xa(i>1&&ua(m),i>1&&sa(a.slice(0,i-1).concat({value:" "===a[i-2].type?"*":""})).replace(P,"$1"),c,i<e&&ya(a.slice(i,e)),e<f&&ya(a=a.slice(e)),e<f&&sa(a))}m.push(c)}return ua(m)}function za(a,b){var c=b.length>0,e=a.length>0,f=function(f,g,h,i,k){var l,o,q,r=0,s="0",t=f&&[],u=[],v=j,x=f||e&&d.find.TAG("*",k),y=w+=null==v?1:Math.random()||.1,z=x.length;for(k&&(j=g===n||g||k);s!==z&&null!=(l=x[s]);s++){if(e&&l){o=0,g||l.ownerDocument===n||(m(l),h=!p);while(q=a[o++])if(q(l,g||n,h)){i.push(l);break}k&&(w=y)}c&&((l=!q&&l)&&r--,f&&t.push(l))}if(r+=s,c&&s!==r){o=0;while(q=b[o++])q(t,u,g,h);if(f){if(r>0)while(s--)t[s]||u[s]||(u[s]=E.call(i));u=wa(u)}G.apply(i,u),k&&!f&&u.length>0&&r+b.length>1&&ga.uniqueSort(i)}return k&&(w=y,j=v),t};return c?ia(f):f}return h=ga.compile=function(a,b){var c,d=[],e=[],f=A[a+" "];if(!f){b||(b=g(a)),c=b.length;while(c--)f=ya(b[c]),f[u]?d.push(f):e.push(f);f=A(a,za(e,d)),f.selector=a}return f},i=ga.select=function(a,b,c,e){var f,i,j,k,l,m="function"==typeof a&&a,n=!e&&g(a=m.selector||a);if(c=c||[],1===n.length){if(i=n[0]=n[0].slice(0),i.length>2&&"ID"===(j=i[0]).type&&9===b.nodeType&&p&&d.relative[i[1].type]){if(b=(d.find.ID(j.matches[0].replace(_,aa),b)||[])[0],!b)return c;m&&(b=b.parentNode),a=a.slice(i.shift().value.length)}f=V.needsContext.test(a)?0:i.length;while(f--){if(j=i[f],d.relative[k=j.type])break;if((l=d.find[k])&&(e=l(j.matches[0].replace(_,aa),$.test(i[0].type)&&qa(b.parentNode)||b))){if(i.splice(f,1),a=e.length&&sa(i),!a)return G.apply(c,e),c;break}}}return(m||h(a,n))(e,b,!p,c,!b||$.test(a)&&qa(b.parentNode)||b),c},c.sortStable=u.split("").sort(B).join("")===u,c.detectDuplicates=!!l,m(),c.sortDetached=ja(function(a){return 1&a.compareDocumentPosition(n.createElement("fieldset"))}),ja(function(a){return a.innerHTML="<a href='#'></a>","#"===a.firstChild.getAttribute("href")})||ka("type|href|height|width",function(a,b,c){if(!c)return a.getAttribute(b,"type"===b.toLowerCase()?1:2)}),c.attributes&&ja(function(a){return a.innerHTML="<input/>",a.firstChild.setAttribute("value",""),""===a.firstChild.getAttribute("value")})||ka("value",function(a,b,c){if(!c&&"input"===a.nodeName.toLowerCase())return a.defaultValue}),ja(function(a){return null==a.getAttribute("disabled")})||ka(J,function(a,b,c){var d;if(!c)return a[b]===!0?b.toLowerCase():(d=a.getAttributeNode(b))&&d.specified?d.value:null}),ga}(a);r.find=x,r.expr=x.selectors,r.expr[":"]=r.expr.pseudos,r.uniqueSort=r.unique=x.uniqueSort,r.text=x.getText,r.isXMLDoc=x.isXML,r.contains=x.contains,r.escapeSelector=x.escape;var y=function(a,b,c){var d=[],e=void 0!==c;while((a=a[b])&&9!==a.nodeType)if(1===a.nodeType){if(e&&r(a).is(c))break;d.push(a)}return d},z=function(a,b){for(var c=[];a;a=a.nextSibling)1===a.nodeType&&a!==b&&c.push(a);return c},A=r.expr.match.needsContext;function B(a,b){return a.nodeName&&a.nodeName.toLowerCase()===b.toLowerCase()}var C=/^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i,D=/^.[^:#\[\.,]*$/;function E(a,b,c){return r.isFunction(b)?r.grep(a,function(a,d){return!!b.call(a,d,a)!==c}):b.nodeType?r.grep(a,function(a){return a===b!==c}):"string"!=typeof b?r.grep(a,function(a){return i.call(b,a)>-1!==c}):D.test(b)?r.filter(b,a,c):(b=r.filter(b,a),r.grep(a,function(a){return i.call(b,a)>-1!==c&&1===a.nodeType}))}r.filter=function(a,b,c){var d=b[0];return c&&(a=":not("+a+")"),1===b.length&&1===d.nodeType?r.find.matchesSelector(d,a)?[d]:[]:r.find.matches(a,r.grep(b,function(a){return 1===a.nodeType}))},r.fn.extend({find:function(a){var b,c,d=this.length,e=this;if("string"!=typeof a)return this.pushStack(r(a).filter(function(){for(b=0;b<d;b++)if(r.contains(e[b],this))return!0}));for(c=this.pushStack([]),b=0;b<d;b++)r.find(a,e[b],c);return d>1?r.uniqueSort(c):c},filter:function(a){return this.pushStack(E(this,a||[],!1))},not:function(a){return this.pushStack(E(this,a||[],!0))},is:function(a){return!!E(this,"string"==typeof a&&A.test(a)?r(a):a||[],!1).length}});var F,G=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,H=r.fn.init=function(a,b,c){var e,f;if(!a)return this;if(c=c||F,"string"==typeof a){if(e="<"===a[0]&&">"===a[a.length-1]&&a.length>=3?[null,a,null]:G.exec(a),!e||!e[1]&&b)return!b||b.jquery?(b||c).find(a):this.constructor(b).find(a);if(e[1]){if(b=b instanceof r?b[0]:b,r.merge(this,r.parseHTML(e[1],b&&b.nodeType?b.ownerDocument||b:d,!0)),C.test(e[1])&&r.isPlainObject(b))for(e in b)r.isFunction(this[e])?this[e](b[e]):this.attr(e,b[e]);return this}return f=d.getElementById(e[2]),f&&(this[0]=f,this.length=1),this}return a.nodeType?(this[0]=a,this.length=1,this):r.isFunction(a)?void 0!==c.ready?c.ready(a):a(r):r.makeArray(a,this)};H.prototype=r.fn,F=r(d);var I=/^(?:parents|prev(?:Until|All))/,J={children:!0,contents:!0,next:!0,prev:!0};r.fn.extend({has:function(a){var b=r(a,this),c=b.length;return this.filter(function(){for(var a=0;a<c;a++)if(r.contains(this,b[a]))return!0})},closest:function(a,b){var c,d=0,e=this.length,f=[],g="string"!=typeof a&&r(a);if(!A.test(a))for(;d<e;d++)for(c=this[d];c&&c!==b;c=c.parentNode)if(c.nodeType<11&&(g?g.index(c)>-1:1===c.nodeType&&r.find.matchesSelector(c,a))){f.push(c);break}return this.pushStack(f.length>1?r.uniqueSort(f):f)},index:function(a){return a?"string"==typeof a?i.call(r(a),this[0]):i.call(this,a.jquery?a[0]:a):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(a,b){return this.pushStack(r.uniqueSort(r.merge(this.get(),r(a,b))))},addBack:function(a){return this.add(null==a?this.prevObject:this.prevObject.filter(a))}});function K(a,b){while((a=a[b])&&1!==a.nodeType);return a}r.each({parent:function(a){var b=a.parentNode;return b&&11!==b.nodeType?b:null},parents:function(a){return y(a,"parentNode")},parentsUntil:function(a,b,c){return y(a,"parentNode",c)},next:function(a){return K(a,"nextSibling")},prev:function(a){return K(a,"previousSibling")},nextAll:function(a){return y(a,"nextSibling")},prevAll:function(a){return y(a,"previousSibling")},nextUntil:function(a,b,c){return y(a,"nextSibling",c)},prevUntil:function(a,b,c){return y(a,"previousSibling",c)},siblings:function(a){return z((a.parentNode||{}).firstChild,a)},children:function(a){return z(a.firstChild)},contents:function(a){return B(a,"iframe")?a.contentDocument:(B(a,"template")&&(a=a.content||a),r.merge([],a.childNodes))}},function(a,b){r.fn[a]=function(c,d){var e=r.map(this,b,c);return"Until"!==a.slice(-5)&&(d=c),d&&"string"==typeof d&&(e=r.filter(d,e)),this.length>1&&(J[a]||r.uniqueSort(e),I.test(a)&&e.reverse()),this.pushStack(e)}});var L=/[^\x20\t\r\n\f]+/g;function M(a){var b={};return r.each(a.match(L)||[],function(a,c){b[c]=!0}),b}r.Callbacks=function(a){a="string"==typeof a?M(a):r.extend({},a);var b,c,d,e,f=[],g=[],h=-1,i=function(){for(e=e||a.once,d=b=!0;g.length;h=-1){c=g.shift();while(++h<f.length)f[h].apply(c[0],c[1])===!1&&a.stopOnFalse&&(h=f.length,c=!1)}a.memory||(c=!1),b=!1,e&&(f=c?[]:"")},j={add:function(){return f&&(c&&!b&&(h=f.length-1,g.push(c)),function d(b){r.each(b,function(b,c){r.isFunction(c)?a.unique&&j.has(c)||f.push(c):c&&c.length&&"string"!==r.type(c)&&d(c)})}(arguments),c&&!b&&i()),this},remove:function(){return r.each(arguments,function(a,b){var c;while((c=r.inArray(b,f,c))>-1)f.splice(c,1),c<=h&&h--}),this},has:function(a){return a?r.inArray(a,f)>-1:f.length>0},empty:function(){return f&&(f=[]),this},disable:function(){return e=g=[],f=c="",this},disabled:function(){return!f},lock:function(){return e=g=[],c||b||(f=c=""),this},locked:function(){return!!e},fireWith:function(a,c){return e||(c=c||[],c=[a,c.slice?c.slice():c],g.push(c),b||i()),this},fire:function(){return j.fireWith(this,arguments),this},fired:function(){return!!d}};return j};function N(a){return a}function O(a){throw a}function P(a,b,c,d){var e;try{a&&r.isFunction(e=a.promise)?e.call(a).done(b).fail(c):a&&r.isFunction(e=a.then)?e.call(a,b,c):b.apply(void 0,[a].slice(d))}catch(a){c.apply(void 0,[a])}}r.extend({Deferred:function(b){var c=[["notify","progress",r.Callbacks("memory"),r.Callbacks("memory"),2],["resolve","done",r.Callbacks("once memory"),r.Callbacks("once memory"),0,"resolved"],["reject","fail",r.Callbacks("once memory"),r.Callbacks("once memory"),1,"rejected"]],d="pending",e={state:function(){return d},always:function(){return f.done(arguments).fail(arguments),this},"catch":function(a){return e.then(null,a)},pipe:function(){var a=arguments;return r.Deferred(function(b){r.each(c,function(c,d){var e=r.isFunction(a[d[4]])&&a[d[4]];f[d[1]](function(){var a=e&&e.apply(this,arguments);a&&r.isFunction(a.promise)?a.promise().progress(b.notify).done(b.resolve).fail(b.reject):b[d[0]+"With"](this,e?[a]:arguments)})}),a=null}).promise()},then:function(b,d,e){var f=0;function g(b,c,d,e){return function(){var h=this,i=arguments,j=function(){var a,j;if(!(b<f)){if(a=d.apply(h,i),a===c.promise())throw new TypeError("Thenable self-resolution");j=a&&("object"==typeof a||"function"==typeof a)&&a.then,r.isFunction(j)?e?j.call(a,g(f,c,N,e),g(f,c,O,e)):(f++,j.call(a,g(f,c,N,e),g(f,c,O,e),g(f,c,N,c.notifyWith))):(d!==N&&(h=void 0,i=[a]),(e||c.resolveWith)(h,i))}},k=e?j:function(){try{j()}catch(a){r.Deferred.exceptionHook&&r.Deferred.exceptionHook(a,k.stackTrace),b+1>=f&&(d!==O&&(h=void 0,i=[a]),c.rejectWith(h,i))}};b?k():(r.Deferred.getStackHook&&(k.stackTrace=r.Deferred.getStackHook()),a.setTimeout(k))}}return r.Deferred(function(a){c[0][3].add(g(0,a,r.isFunction(e)?e:N,a.notifyWith)),c[1][3].add(g(0,a,r.isFunction(b)?b:N)),c[2][3].add(g(0,a,r.isFunction(d)?d:O))}).promise()},promise:function(a){return null!=a?r.extend(a,e):e}},f={};return r.each(c,function(a,b){var g=b[2],h=b[5];e[b[1]]=g.add,h&&g.add(function(){d=h},c[3-a][2].disable,c[0][2].lock),g.add(b[3].fire),f[b[0]]=function(){return f[b[0]+"With"](this===f?void 0:this,arguments),this},f[b[0]+"With"]=g.fireWith}),e.promise(f),b&&b.call(f,f),f},when:function(a){var b=arguments.length,c=b,d=Array(c),e=f.call(arguments),g=r.Deferred(),h=function(a){return function(c){d[a]=this,e[a]=arguments.length>1?f.call(arguments):c,--b||g.resolveWith(d,e)}};if(b<=1&&(P(a,g.done(h(c)).resolve,g.reject,!b),"pending"===g.state()||r.isFunction(e[c]&&e[c].then)))return g.then();while(c--)P(e[c],h(c),g.reject);return g.promise()}});var Q=/^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;r.Deferred.exceptionHook=function(b,c){a.console&&a.console.warn&&b&&Q.test(b.name)&&a.console.warn("jQuery.Deferred exception: "+b.message,b.stack,c)},r.readyException=function(b){a.setTimeout(function(){throw b})};var R=r.Deferred();r.fn.ready=function(a){return R.then(a)["catch"](function(a){r.readyException(a)}),this},r.extend({isReady:!1,readyWait:1,ready:function(a){(a===!0?--r.readyWait:r.isReady)||(r.isReady=!0,a!==!0&&--r.readyWait>0||R.resolveWith(d,[r]))}}),r.ready.then=R.then;function S(){d.removeEventListener("DOMContentLoaded",S),
a.removeEventListener("load",S),r.ready()}"complete"===d.readyState||"loading"!==d.readyState&&!d.documentElement.doScroll?a.setTimeout(r.ready):(d.addEventListener("DOMContentLoaded",S),a.addEventListener("load",S));var T=function(a,b,c,d,e,f,g){var h=0,i=a.length,j=null==c;if("object"===r.type(c)){e=!0;for(h in c)T(a,b,h,c[h],!0,f,g)}else if(void 0!==d&&(e=!0,r.isFunction(d)||(g=!0),j&&(g?(b.call(a,d),b=null):(j=b,b=function(a,b,c){return j.call(r(a),c)})),b))for(;h<i;h++)b(a[h],c,g?d:d.call(a[h],h,b(a[h],c)));return e?a:j?b.call(a):i?b(a[0],c):f},U=function(a){return 1===a.nodeType||9===a.nodeType||!+a.nodeType};function V(){this.expando=r.expando+V.uid++}V.uid=1,V.prototype={cache:function(a){var b=a[this.expando];return b||(b={},U(a)&&(a.nodeType?a[this.expando]=b:Object.defineProperty(a,this.expando,{value:b,configurable:!0}))),b},set:function(a,b,c){var d,e=this.cache(a);if("string"==typeof b)e[r.camelCase(b)]=c;else for(d in b)e[r.camelCase(d)]=b[d];return e},get:function(a,b){return void 0===b?this.cache(a):a[this.expando]&&a[this.expando][r.camelCase(b)]},access:function(a,b,c){return void 0===b||b&&"string"==typeof b&&void 0===c?this.get(a,b):(this.set(a,b,c),void 0!==c?c:b)},remove:function(a,b){var c,d=a[this.expando];if(void 0!==d){if(void 0!==b){Array.isArray(b)?b=b.map(r.camelCase):(b=r.camelCase(b),b=b in d?[b]:b.match(L)||[]),c=b.length;while(c--)delete d[b[c]]}(void 0===b||r.isEmptyObject(d))&&(a.nodeType?a[this.expando]=void 0:delete a[this.expando])}},hasData:function(a){var b=a[this.expando];return void 0!==b&&!r.isEmptyObject(b)}};var W=new V,X=new V,Y=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,Z=/[A-Z]/g;function $(a){return"true"===a||"false"!==a&&("null"===a?null:a===+a+""?+a:Y.test(a)?JSON.parse(a):a)}function _(a,b,c){var d;if(void 0===c&&1===a.nodeType)if(d="data-"+b.replace(Z,"-$&").toLowerCase(),c=a.getAttribute(d),"string"==typeof c){try{c=$(c)}catch(e){}X.set(a,b,c)}else c=void 0;return c}r.extend({hasData:function(a){return X.hasData(a)||W.hasData(a)},data:function(a,b,c){return X.access(a,b,c)},removeData:function(a,b){X.remove(a,b)},_data:function(a,b,c){return W.access(a,b,c)},_removeData:function(a,b){W.remove(a,b)}}),r.fn.extend({data:function(a,b){var c,d,e,f=this[0],g=f&&f.attributes;if(void 0===a){if(this.length&&(e=X.get(f),1===f.nodeType&&!W.get(f,"hasDataAttrs"))){c=g.length;while(c--)g[c]&&(d=g[c].name,0===d.indexOf("data-")&&(d=r.camelCase(d.slice(5)),_(f,d,e[d])));W.set(f,"hasDataAttrs",!0)}return e}return"object"==typeof a?this.each(function(){X.set(this,a)}):T(this,function(b){var c;if(f&&void 0===b){if(c=X.get(f,a),void 0!==c)return c;if(c=_(f,a),void 0!==c)return c}else this.each(function(){X.set(this,a,b)})},null,b,arguments.length>1,null,!0)},removeData:function(a){return this.each(function(){X.remove(this,a)})}}),r.extend({queue:function(a,b,c){var d;if(a)return b=(b||"fx")+"queue",d=W.get(a,b),c&&(!d||Array.isArray(c)?d=W.access(a,b,r.makeArray(c)):d.push(c)),d||[]},dequeue:function(a,b){b=b||"fx";var c=r.queue(a,b),d=c.length,e=c.shift(),f=r._queueHooks(a,b),g=function(){r.dequeue(a,b)};"inprogress"===e&&(e=c.shift(),d--),e&&("fx"===b&&c.unshift("inprogress"),delete f.stop,e.call(a,g,f)),!d&&f&&f.empty.fire()},_queueHooks:function(a,b){var c=b+"queueHooks";return W.get(a,c)||W.access(a,c,{empty:r.Callbacks("once memory").add(function(){W.remove(a,[b+"queue",c])})})}}),r.fn.extend({queue:function(a,b){var c=2;return"string"!=typeof a&&(b=a,a="fx",c--),arguments.length<c?r.queue(this[0],a):void 0===b?this:this.each(function(){var c=r.queue(this,a,b);r._queueHooks(this,a),"fx"===a&&"inprogress"!==c[0]&&r.dequeue(this,a)})},dequeue:function(a){return this.each(function(){r.dequeue(this,a)})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,b){var c,d=1,e=r.Deferred(),f=this,g=this.length,h=function(){--d||e.resolveWith(f,[f])};"string"!=typeof a&&(b=a,a=void 0),a=a||"fx";while(g--)c=W.get(f[g],a+"queueHooks"),c&&c.empty&&(d++,c.empty.add(h));return h(),e.promise(b)}});var aa=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,ba=new RegExp("^(?:([+-])=|)("+aa+")([a-z%]*)$","i"),ca=["Top","Right","Bottom","Left"],da=function(a,b){return a=b||a,"none"===a.style.display||""===a.style.display&&r.contains(a.ownerDocument,a)&&"none"===r.css(a,"display")},ea=function(a,b,c,d){var e,f,g={};for(f in b)g[f]=a.style[f],a.style[f]=b[f];e=c.apply(a,d||[]);for(f in b)a.style[f]=g[f];return e};function fa(a,b,c,d){var e,f=1,g=20,h=d?function(){return d.cur()}:function(){return r.css(a,b,"")},i=h(),j=c&&c[3]||(r.cssNumber[b]?"":"px"),k=(r.cssNumber[b]||"px"!==j&&+i)&&ba.exec(r.css(a,b));if(k&&k[3]!==j){j=j||k[3],c=c||[],k=+i||1;do f=f||".5",k/=f,r.style(a,b,k+j);while(f!==(f=h()/i)&&1!==f&&--g)}return c&&(k=+k||+i||0,e=c[1]?k+(c[1]+1)*c[2]:+c[2],d&&(d.unit=j,d.start=k,d.end=e)),e}var ga={};function ha(a){var b,c=a.ownerDocument,d=a.nodeName,e=ga[d];return e?e:(b=c.body.appendChild(c.createElement(d)),e=r.css(b,"display"),b.parentNode.removeChild(b),"none"===e&&(e="block"),ga[d]=e,e)}function ia(a,b){for(var c,d,e=[],f=0,g=a.length;f<g;f++)d=a[f],d.style&&(c=d.style.display,b?("none"===c&&(e[f]=W.get(d,"display")||null,e[f]||(d.style.display="")),""===d.style.display&&da(d)&&(e[f]=ha(d))):"none"!==c&&(e[f]="none",W.set(d,"display",c)));for(f=0;f<g;f++)null!=e[f]&&(a[f].style.display=e[f]);return a}r.fn.extend({show:function(){return ia(this,!0)},hide:function(){return ia(this)},toggle:function(a){return"boolean"==typeof a?a?this.show():this.hide():this.each(function(){da(this)?r(this).show():r(this).hide()})}});var ja=/^(?:checkbox|radio)$/i,ka=/<([a-z][^\/\0>\x20\t\r\n\f]+)/i,la=/^$|\/(?:java|ecma)script/i,ma={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};ma.optgroup=ma.option,ma.tbody=ma.tfoot=ma.colgroup=ma.caption=ma.thead,ma.th=ma.td;function na(a,b){var c;return c="undefined"!=typeof a.getElementsByTagName?a.getElementsByTagName(b||"*"):"undefined"!=typeof a.querySelectorAll?a.querySelectorAll(b||"*"):[],void 0===b||b&&B(a,b)?r.merge([a],c):c}function oa(a,b){for(var c=0,d=a.length;c<d;c++)W.set(a[c],"globalEval",!b||W.get(b[c],"globalEval"))}var pa=/<|&#?\w+;/;function qa(a,b,c,d,e){for(var f,g,h,i,j,k,l=b.createDocumentFragment(),m=[],n=0,o=a.length;n<o;n++)if(f=a[n],f||0===f)if("object"===r.type(f))r.merge(m,f.nodeType?[f]:f);else if(pa.test(f)){g=g||l.appendChild(b.createElement("div")),h=(ka.exec(f)||["",""])[1].toLowerCase(),i=ma[h]||ma._default,g.innerHTML=i[1]+r.htmlPrefilter(f)+i[2],k=i[0];while(k--)g=g.lastChild;r.merge(m,g.childNodes),g=l.firstChild,g.textContent=""}else m.push(b.createTextNode(f));l.textContent="",n=0;while(f=m[n++])if(d&&r.inArray(f,d)>-1)e&&e.push(f);else if(j=r.contains(f.ownerDocument,f),g=na(l.appendChild(f),"script"),j&&oa(g),c){k=0;while(f=g[k++])la.test(f.type||"")&&c.push(f)}return l}!function(){var a=d.createDocumentFragment(),b=a.appendChild(d.createElement("div")),c=d.createElement("input");c.setAttribute("type","radio"),c.setAttribute("checked","checked"),c.setAttribute("name","t"),b.appendChild(c),o.checkClone=b.cloneNode(!0).cloneNode(!0).lastChild.checked,b.innerHTML="<textarea>x</textarea>",o.noCloneChecked=!!b.cloneNode(!0).lastChild.defaultValue}();var ra=d.documentElement,sa=/^key/,ta=/^(?:mouse|pointer|contextmenu|drag|drop)|click/,ua=/^([^.]*)(?:\.(.+)|)/;function va(){return!0}function wa(){return!1}function xa(){try{return d.activeElement}catch(a){}}function ya(a,b,c,d,e,f){var g,h;if("object"==typeof b){"string"!=typeof c&&(d=d||c,c=void 0);for(h in b)ya(a,h,c,d,b[h],f);return a}if(null==d&&null==e?(e=c,d=c=void 0):null==e&&("string"==typeof c?(e=d,d=void 0):(e=d,d=c,c=void 0)),e===!1)e=wa;else if(!e)return a;return 1===f&&(g=e,e=function(a){return r().off(a),g.apply(this,arguments)},e.guid=g.guid||(g.guid=r.guid++)),a.each(function(){r.event.add(this,b,e,d,c)})}r.event={global:{},add:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,n,o,p,q=W.get(a);if(q){c.handler&&(f=c,c=f.handler,e=f.selector),e&&r.find.matchesSelector(ra,e),c.guid||(c.guid=r.guid++),(i=q.events)||(i=q.events={}),(g=q.handle)||(g=q.handle=function(b){return"undefined"!=typeof r&&r.event.triggered!==b.type?r.event.dispatch.apply(a,arguments):void 0}),b=(b||"").match(L)||[""],j=b.length;while(j--)h=ua.exec(b[j])||[],n=p=h[1],o=(h[2]||"").split(".").sort(),n&&(l=r.event.special[n]||{},n=(e?l.delegateType:l.bindType)||n,l=r.event.special[n]||{},k=r.extend({type:n,origType:p,data:d,handler:c,guid:c.guid,selector:e,needsContext:e&&r.expr.match.needsContext.test(e),namespace:o.join(".")},f),(m=i[n])||(m=i[n]=[],m.delegateCount=0,l.setup&&l.setup.call(a,d,o,g)!==!1||a.addEventListener&&a.addEventListener(n,g)),l.add&&(l.add.call(a,k),k.handler.guid||(k.handler.guid=c.guid)),e?m.splice(m.delegateCount++,0,k):m.push(k),r.event.global[n]=!0)}},remove:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,n,o,p,q=W.hasData(a)&&W.get(a);if(q&&(i=q.events)){b=(b||"").match(L)||[""],j=b.length;while(j--)if(h=ua.exec(b[j])||[],n=p=h[1],o=(h[2]||"").split(".").sort(),n){l=r.event.special[n]||{},n=(d?l.delegateType:l.bindType)||n,m=i[n]||[],h=h[2]&&new RegExp("(^|\\.)"+o.join("\\.(?:.*\\.|)")+"(\\.|$)"),g=f=m.length;while(f--)k=m[f],!e&&p!==k.origType||c&&c.guid!==k.guid||h&&!h.test(k.namespace)||d&&d!==k.selector&&("**"!==d||!k.selector)||(m.splice(f,1),k.selector&&m.delegateCount--,l.remove&&l.remove.call(a,k));g&&!m.length&&(l.teardown&&l.teardown.call(a,o,q.handle)!==!1||r.removeEvent(a,n,q.handle),delete i[n])}else for(n in i)r.event.remove(a,n+b[j],c,d,!0);r.isEmptyObject(i)&&W.remove(a,"handle events")}},dispatch:function(a){var b=r.event.fix(a),c,d,e,f,g,h,i=new Array(arguments.length),j=(W.get(this,"events")||{})[b.type]||[],k=r.event.special[b.type]||{};for(i[0]=b,c=1;c<arguments.length;c++)i[c]=arguments[c];if(b.delegateTarget=this,!k.preDispatch||k.preDispatch.call(this,b)!==!1){h=r.event.handlers.call(this,b,j),c=0;while((f=h[c++])&&!b.isPropagationStopped()){b.currentTarget=f.elem,d=0;while((g=f.handlers[d++])&&!b.isImmediatePropagationStopped())b.rnamespace&&!b.rnamespace.test(g.namespace)||(b.handleObj=g,b.data=g.data,e=((r.event.special[g.origType]||{}).handle||g.handler).apply(f.elem,i),void 0!==e&&(b.result=e)===!1&&(b.preventDefault(),b.stopPropagation()))}return k.postDispatch&&k.postDispatch.call(this,b),b.result}},handlers:function(a,b){var c,d,e,f,g,h=[],i=b.delegateCount,j=a.target;if(i&&j.nodeType&&!("click"===a.type&&a.button>=1))for(;j!==this;j=j.parentNode||this)if(1===j.nodeType&&("click"!==a.type||j.disabled!==!0)){for(f=[],g={},c=0;c<i;c++)d=b[c],e=d.selector+" ",void 0===g[e]&&(g[e]=d.needsContext?r(e,this).index(j)>-1:r.find(e,this,null,[j]).length),g[e]&&f.push(d);f.length&&h.push({elem:j,handlers:f})}return j=this,i<b.length&&h.push({elem:j,handlers:b.slice(i)}),h},addProp:function(a,b){Object.defineProperty(r.Event.prototype,a,{enumerable:!0,configurable:!0,get:r.isFunction(b)?function(){if(this.originalEvent)return b(this.originalEvent)}:function(){if(this.originalEvent)return this.originalEvent[a]},set:function(b){Object.defineProperty(this,a,{enumerable:!0,configurable:!0,writable:!0,value:b})}})},fix:function(a){return a[r.expando]?a:new r.Event(a)},special:{load:{noBubble:!0},focus:{trigger:function(){if(this!==xa()&&this.focus)return this.focus(),!1},delegateType:"focusin"},blur:{trigger:function(){if(this===xa()&&this.blur)return this.blur(),!1},delegateType:"focusout"},click:{trigger:function(){if("checkbox"===this.type&&this.click&&B(this,"input"))return this.click(),!1},_default:function(a){return B(a.target,"a")}},beforeunload:{postDispatch:function(a){void 0!==a.result&&a.originalEvent&&(a.originalEvent.returnValue=a.result)}}}},r.removeEvent=function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c)},r.Event=function(a,b){return this instanceof r.Event?(a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||void 0===a.defaultPrevented&&a.returnValue===!1?va:wa,this.target=a.target&&3===a.target.nodeType?a.target.parentNode:a.target,this.currentTarget=a.currentTarget,this.relatedTarget=a.relatedTarget):this.type=a,b&&r.extend(this,b),this.timeStamp=a&&a.timeStamp||r.now(),void(this[r.expando]=!0)):new r.Event(a,b)},r.Event.prototype={constructor:r.Event,isDefaultPrevented:wa,isPropagationStopped:wa,isImmediatePropagationStopped:wa,isSimulated:!1,preventDefault:function(){var a=this.originalEvent;this.isDefaultPrevented=va,a&&!this.isSimulated&&a.preventDefault()},stopPropagation:function(){var a=this.originalEvent;this.isPropagationStopped=va,a&&!this.isSimulated&&a.stopPropagation()},stopImmediatePropagation:function(){var a=this.originalEvent;this.isImmediatePropagationStopped=va,a&&!this.isSimulated&&a.stopImmediatePropagation(),this.stopPropagation()}},r.each({altKey:!0,bubbles:!0,cancelable:!0,changedTouches:!0,ctrlKey:!0,detail:!0,eventPhase:!0,metaKey:!0,pageX:!0,pageY:!0,shiftKey:!0,view:!0,"char":!0,charCode:!0,key:!0,keyCode:!0,button:!0,buttons:!0,clientX:!0,clientY:!0,offsetX:!0,offsetY:!0,pointerId:!0,pointerType:!0,screenX:!0,screenY:!0,targetTouches:!0,toElement:!0,touches:!0,which:function(a){var b=a.button;return null==a.which&&sa.test(a.type)?null!=a.charCode?a.charCode:a.keyCode:!a.which&&void 0!==b&&ta.test(a.type)?1&b?1:2&b?3:4&b?2:0:a.which}},r.event.addProp),r.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(a,b){r.event.special[a]={delegateType:b,bindType:b,handle:function(a){var c,d=this,e=a.relatedTarget,f=a.handleObj;return e&&(e===d||r.contains(d,e))||(a.type=f.origType,c=f.handler.apply(this,arguments),a.type=b),c}}}),r.fn.extend({on:function(a,b,c,d){return ya(this,a,b,c,d)},one:function(a,b,c,d){return ya(this,a,b,c,d,1)},off:function(a,b,c){var d,e;if(a&&a.preventDefault&&a.handleObj)return d=a.handleObj,r(a.delegateTarget).off(d.namespace?d.origType+"."+d.namespace:d.origType,d.selector,d.handler),this;if("object"==typeof a){for(e in a)this.off(e,b,a[e]);return this}return b!==!1&&"function"!=typeof b||(c=b,b=void 0),c===!1&&(c=wa),this.each(function(){r.event.remove(this,a,c,b)})}});var za=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,Aa=/<script|<style|<link/i,Ba=/checked\s*(?:[^=]|=\s*.checked.)/i,Ca=/^true\/(.*)/,Da=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;function Ea(a,b){return B(a,"table")&&B(11!==b.nodeType?b:b.firstChild,"tr")?r(">tbody",a)[0]||a:a}function Fa(a){return a.type=(null!==a.getAttribute("type"))+"/"+a.type,a}function Ga(a){var b=Ca.exec(a.type);return b?a.type=b[1]:a.removeAttribute("type"),a}function Ha(a,b){var c,d,e,f,g,h,i,j;if(1===b.nodeType){if(W.hasData(a)&&(f=W.access(a),g=W.set(b,f),j=f.events)){delete g.handle,g.events={};for(e in j)for(c=0,d=j[e].length;c<d;c++)r.event.add(b,e,j[e][c])}X.hasData(a)&&(h=X.access(a),i=r.extend({},h),X.set(b,i))}}function Ia(a,b){var c=b.nodeName.toLowerCase();"input"===c&&ja.test(a.type)?b.checked=a.checked:"input"!==c&&"textarea"!==c||(b.defaultValue=a.defaultValue)}function Ja(a,b,c,d){b=g.apply([],b);var e,f,h,i,j,k,l=0,m=a.length,n=m-1,q=b[0],s=r.isFunction(q);if(s||m>1&&"string"==typeof q&&!o.checkClone&&Ba.test(q))return a.each(function(e){var f=a.eq(e);s&&(b[0]=q.call(this,e,f.html())),Ja(f,b,c,d)});if(m&&(e=qa(b,a[0].ownerDocument,!1,a,d),f=e.firstChild,1===e.childNodes.length&&(e=f),f||d)){for(h=r.map(na(e,"script"),Fa),i=h.length;l<m;l++)j=e,l!==n&&(j=r.clone(j,!0,!0),i&&r.merge(h,na(j,"script"))),c.call(a[l],j,l);if(i)for(k=h[h.length-1].ownerDocument,r.map(h,Ga),l=0;l<i;l++)j=h[l],la.test(j.type||"")&&!W.access(j,"globalEval")&&r.contains(k,j)&&(j.src?r._evalUrl&&r._evalUrl(j.src):p(j.textContent.replace(Da,""),k))}return a}function Ka(a,b,c){for(var d,e=b?r.filter(b,a):a,f=0;null!=(d=e[f]);f++)c||1!==d.nodeType||r.cleanData(na(d)),d.parentNode&&(c&&r.contains(d.ownerDocument,d)&&oa(na(d,"script")),d.parentNode.removeChild(d));return a}r.extend({htmlPrefilter:function(a){return a.replace(za,"<$1></$2>")},clone:function(a,b,c){var d,e,f,g,h=a.cloneNode(!0),i=r.contains(a.ownerDocument,a);if(!(o.noCloneChecked||1!==a.nodeType&&11!==a.nodeType||r.isXMLDoc(a)))for(g=na(h),f=na(a),d=0,e=f.length;d<e;d++)Ia(f[d],g[d]);if(b)if(c)for(f=f||na(a),g=g||na(h),d=0,e=f.length;d<e;d++)Ha(f[d],g[d]);else Ha(a,h);return g=na(h,"script"),g.length>0&&oa(g,!i&&na(a,"script")),h},cleanData:function(a){for(var b,c,d,e=r.event.special,f=0;void 0!==(c=a[f]);f++)if(U(c)){if(b=c[W.expando]){if(b.events)for(d in b.events)e[d]?r.event.remove(c,d):r.removeEvent(c,d,b.handle);c[W.expando]=void 0}c[X.expando]&&(c[X.expando]=void 0)}}}),r.fn.extend({detach:function(a){return Ka(this,a,!0)},remove:function(a){return Ka(this,a)},text:function(a){return T(this,function(a){return void 0===a?r.text(this):this.empty().each(function(){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||(this.textContent=a)})},null,a,arguments.length)},append:function(){return Ja(this,arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=Ea(this,a);b.appendChild(a)}})},prepend:function(){return Ja(this,arguments,function(a){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var b=Ea(this,a);b.insertBefore(a,b.firstChild)}})},before:function(){return Ja(this,arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this)})},after:function(){return Ja(this,arguments,function(a){this.parentNode&&this.parentNode.insertBefore(a,this.nextSibling)})},empty:function(){for(var a,b=0;null!=(a=this[b]);b++)1===a.nodeType&&(r.cleanData(na(a,!1)),a.textContent="");return this},clone:function(a,b){return a=null!=a&&a,b=null==b?a:b,this.map(function(){return r.clone(this,a,b)})},html:function(a){return T(this,function(a){var b=this[0]||{},c=0,d=this.length;if(void 0===a&&1===b.nodeType)return b.innerHTML;if("string"==typeof a&&!Aa.test(a)&&!ma[(ka.exec(a)||["",""])[1].toLowerCase()]){a=r.htmlPrefilter(a);try{for(;c<d;c++)b=this[c]||{},1===b.nodeType&&(r.cleanData(na(b,!1)),b.innerHTML=a);b=0}catch(e){}}b&&this.empty().append(a)},null,a,arguments.length)},replaceWith:function(){var a=[];return Ja(this,arguments,function(b){var c=this.parentNode;r.inArray(this,a)<0&&(r.cleanData(na(this)),c&&c.replaceChild(b,this))},a)}}),r.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){r.fn[a]=function(a){for(var c,d=[],e=r(a),f=e.length-1,g=0;g<=f;g++)c=g===f?this:this.clone(!0),r(e[g])[b](c),h.apply(d,c.get());return this.pushStack(d)}});var La=/^margin/,Ma=new RegExp("^("+aa+")(?!px)[a-z%]+$","i"),Na=function(b){var c=b.ownerDocument.defaultView;return c&&c.opener||(c=a),c.getComputedStyle(b)};!function(){function b(){if(i){i.style.cssText="box-sizing:border-box;position:relative;display:block;margin:auto;border:1px;padding:1px;top:1%;width:50%",i.innerHTML="",ra.appendChild(h);var b=a.getComputedStyle(i);c="1%"!==b.top,g="2px"===b.marginLeft,e="4px"===b.width,i.style.marginRight="50%",f="4px"===b.marginRight,ra.removeChild(h),i=null}}var c,e,f,g,h=d.createElement("div"),i=d.createElement("div");i.style&&(i.style.backgroundClip="content-box",i.cloneNode(!0).style.backgroundClip="",o.clearCloneStyle="content-box"===i.style.backgroundClip,h.style.cssText="border:0;width:8px;height:0;top:0;left:-9999px;padding:0;margin-top:1px;position:absolute",h.appendChild(i),r.extend(o,{pixelPosition:function(){return b(),c},boxSizingReliable:function(){return b(),e},pixelMarginRight:function(){return b(),f},reliableMarginLeft:function(){return b(),g}}))}();function Oa(a,b,c){var d,e,f,g,h=a.style;return c=c||Na(a),c&&(g=c.getPropertyValue(b)||c[b],""!==g||r.contains(a.ownerDocument,a)||(g=r.style(a,b)),!o.pixelMarginRight()&&Ma.test(g)&&La.test(b)&&(d=h.width,e=h.minWidth,f=h.maxWidth,h.minWidth=h.maxWidth=h.width=g,g=c.width,h.width=d,h.minWidth=e,h.maxWidth=f)),void 0!==g?g+"":g}function Pa(a,b){return{get:function(){return a()?void delete this.get:(this.get=b).apply(this,arguments)}}}var Qa=/^(none|table(?!-c[ea]).+)/,Ra=/^--/,Sa={position:"absolute",visibility:"hidden",display:"block"},Ta={letterSpacing:"0",fontWeight:"400"},Ua=["Webkit","Moz","ms"],Va=d.createElement("div").style;function Wa(a){if(a in Va)return a;var b=a[0].toUpperCase()+a.slice(1),c=Ua.length;while(c--)if(a=Ua[c]+b,a in Va)return a}function Xa(a){var b=r.cssProps[a];return b||(b=r.cssProps[a]=Wa(a)||a),b}function Ya(a,b,c){var d=ba.exec(b);return d?Math.max(0,d[2]-(c||0))+(d[3]||"px"):b}function Za(a,b,c,d,e){var f,g=0;for(f=c===(d?"border":"content")?4:"width"===b?1:0;f<4;f+=2)"margin"===c&&(g+=r.css(a,c+ca[f],!0,e)),d?("content"===c&&(g-=r.css(a,"padding"+ca[f],!0,e)),"margin"!==c&&(g-=r.css(a,"border"+ca[f]+"Width",!0,e))):(g+=r.css(a,"padding"+ca[f],!0,e),"padding"!==c&&(g+=r.css(a,"border"+ca[f]+"Width",!0,e)));return g}function $a(a,b,c){var d,e=Na(a),f=Oa(a,b,e),g="border-box"===r.css(a,"boxSizing",!1,e);return Ma.test(f)?f:(d=g&&(o.boxSizingReliable()||f===a.style[b]),"auto"===f&&(f=a["offset"+b[0].toUpperCase()+b.slice(1)]),f=parseFloat(f)||0,f+Za(a,b,c||(g?"border":"content"),d,e)+"px")}r.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=Oa(a,"opacity");return""===c?"1":c}}}},cssNumber:{animationIterationCount:!0,columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":"cssFloat"},style:function(a,b,c,d){if(a&&3!==a.nodeType&&8!==a.nodeType&&a.style){var e,f,g,h=r.camelCase(b),i=Ra.test(b),j=a.style;return i||(b=Xa(h)),g=r.cssHooks[b]||r.cssHooks[h],void 0===c?g&&"get"in g&&void 0!==(e=g.get(a,!1,d))?e:j[b]:(f=typeof c,"string"===f&&(e=ba.exec(c))&&e[1]&&(c=fa(a,b,e),f="number"),null!=c&&c===c&&("number"===f&&(c+=e&&e[3]||(r.cssNumber[h]?"":"px")),o.clearCloneStyle||""!==c||0!==b.indexOf("background")||(j[b]="inherit"),g&&"set"in g&&void 0===(c=g.set(a,c,d))||(i?j.setProperty(b,c):j[b]=c)),void 0)}},css:function(a,b,c,d){var e,f,g,h=r.camelCase(b),i=Ra.test(b);return i||(b=Xa(h)),g=r.cssHooks[b]||r.cssHooks[h],g&&"get"in g&&(e=g.get(a,!0,c)),void 0===e&&(e=Oa(a,b,d)),"normal"===e&&b in Ta&&(e=Ta[b]),""===c||c?(f=parseFloat(e),c===!0||isFinite(f)?f||0:e):e}}),r.each(["height","width"],function(a,b){r.cssHooks[b]={get:function(a,c,d){if(c)return!Qa.test(r.css(a,"display"))||a.getClientRects().length&&a.getBoundingClientRect().width?$a(a,b,d):ea(a,Sa,function(){return $a(a,b,d)})},set:function(a,c,d){var e,f=d&&Na(a),g=d&&Za(a,b,d,"border-box"===r.css(a,"boxSizing",!1,f),f);return g&&(e=ba.exec(c))&&"px"!==(e[3]||"px")&&(a.style[b]=c,c=r.css(a,b)),Ya(a,c,g)}}}),r.cssHooks.marginLeft=Pa(o.reliableMarginLeft,function(a,b){if(b)return(parseFloat(Oa(a,"marginLeft"))||a.getBoundingClientRect().left-ea(a,{marginLeft:0},function(){return a.getBoundingClientRect().left}))+"px"}),r.each({margin:"",padding:"",border:"Width"},function(a,b){r.cssHooks[a+b]={expand:function(c){for(var d=0,e={},f="string"==typeof c?c.split(" "):[c];d<4;d++)e[a+ca[d]+b]=f[d]||f[d-2]||f[0];return e}},La.test(a)||(r.cssHooks[a+b].set=Ya)}),r.fn.extend({css:function(a,b){return T(this,function(a,b,c){var d,e,f={},g=0;if(Array.isArray(b)){for(d=Na(a),e=b.length;g<e;g++)f[b[g]]=r.css(a,b[g],!1,d);return f}return void 0!==c?r.style(a,b,c):r.css(a,b)},a,b,arguments.length>1)}});function _a(a,b,c,d,e){return new _a.prototype.init(a,b,c,d,e)}r.Tween=_a,_a.prototype={constructor:_a,init:function(a,b,c,d,e,f){this.elem=a,this.prop=c,this.easing=e||r.easing._default,this.options=b,this.start=this.now=this.cur(),this.end=d,this.unit=f||(r.cssNumber[c]?"":"px")},cur:function(){var a=_a.propHooks[this.prop];return a&&a.get?a.get(this):_a.propHooks._default.get(this)},run:function(a){var b,c=_a.propHooks[this.prop];return this.options.duration?this.pos=b=r.easing[this.easing](a,this.options.duration*a,0,1,this.options.duration):this.pos=b=a,this.now=(this.end-this.start)*b+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),c&&c.set?c.set(this):_a.propHooks._default.set(this),this}},_a.prototype.init.prototype=_a.prototype,_a.propHooks={_default:{get:function(a){var b;return 1!==a.elem.nodeType||null!=a.elem[a.prop]&&null==a.elem.style[a.prop]?a.elem[a.prop]:(b=r.css(a.elem,a.prop,""),b&&"auto"!==b?b:0)},set:function(a){r.fx.step[a.prop]?r.fx.step[a.prop](a):1!==a.elem.nodeType||null==a.elem.style[r.cssProps[a.prop]]&&!r.cssHooks[a.prop]?a.elem[a.prop]=a.now:r.style(a.elem,a.prop,a.now+a.unit)}}},_a.propHooks.scrollTop=_a.propHooks.scrollLeft={set:function(a){a.elem.nodeType&&a.elem.parentNode&&(a.elem[a.prop]=a.now)}},r.easing={linear:function(a){return a},swing:function(a){return.5-Math.cos(a*Math.PI)/2},_default:"swing"},r.fx=_a.prototype.init,r.fx.step={};var ab,bb,cb=/^(?:toggle|show|hide)$/,db=/queueHooks$/;function eb(){bb&&(d.hidden===!1&&a.requestAnimationFrame?a.requestAnimationFrame(eb):a.setTimeout(eb,r.fx.interval),r.fx.tick())}function fb(){return a.setTimeout(function(){ab=void 0}),ab=r.now()}function gb(a,b){var c,d=0,e={height:a};for(b=b?1:0;d<4;d+=2-b)c=ca[d],e["margin"+c]=e["padding"+c]=a;return b&&(e.opacity=e.width=a),e}function hb(a,b,c){for(var d,e=(kb.tweeners[b]||[]).concat(kb.tweeners["*"]),f=0,g=e.length;f<g;f++)if(d=e[f].call(c,b,a))return d}function ib(a,b,c){var d,e,f,g,h,i,j,k,l="width"in b||"height"in b,m=this,n={},o=a.style,p=a.nodeType&&da(a),q=W.get(a,"fxshow");c.queue||(g=r._queueHooks(a,"fx"),null==g.unqueued&&(g.unqueued=0,h=g.empty.fire,g.empty.fire=function(){g.unqueued||h()}),g.unqueued++,m.always(function(){m.always(function(){g.unqueued--,r.queue(a,"fx").length||g.empty.fire()})}));for(d in b)if(e=b[d],cb.test(e)){if(delete b[d],f=f||"toggle"===e,e===(p?"hide":"show")){if("show"!==e||!q||void 0===q[d])continue;p=!0}n[d]=q&&q[d]||r.style(a,d)}if(i=!r.isEmptyObject(b),i||!r.isEmptyObject(n)){l&&1===a.nodeType&&(c.overflow=[o.overflow,o.overflowX,o.overflowY],j=q&&q.display,null==j&&(j=W.get(a,"display")),k=r.css(a,"display"),"none"===k&&(j?k=j:(ia([a],!0),j=a.style.display||j,k=r.css(a,"display"),ia([a]))),("inline"===k||"inline-block"===k&&null!=j)&&"none"===r.css(a,"float")&&(i||(m.done(function(){o.display=j}),null==j&&(k=o.display,j="none"===k?"":k)),o.display="inline-block")),c.overflow&&(o.overflow="hidden",m.always(function(){o.overflow=c.overflow[0],o.overflowX=c.overflow[1],o.overflowY=c.overflow[2]})),i=!1;for(d in n)i||(q?"hidden"in q&&(p=q.hidden):q=W.access(a,"fxshow",{display:j}),f&&(q.hidden=!p),p&&ia([a],!0),m.done(function(){p||ia([a]),W.remove(a,"fxshow");for(d in n)r.style(a,d,n[d])})),i=hb(p?q[d]:0,d,m),d in q||(q[d]=i.start,p&&(i.end=i.start,i.start=0))}}function jb(a,b){var c,d,e,f,g;for(c in a)if(d=r.camelCase(c),e=b[d],f=a[c],Array.isArray(f)&&(e=f[1],f=a[c]=f[0]),c!==d&&(a[d]=f,delete a[c]),g=r.cssHooks[d],g&&"expand"in g){f=g.expand(f),delete a[d];for(c in f)c in a||(a[c]=f[c],b[c]=e)}else b[d]=e}function kb(a,b,c){var d,e,f=0,g=kb.prefilters.length,h=r.Deferred().always(function(){delete i.elem}),i=function(){if(e)return!1;for(var b=ab||fb(),c=Math.max(0,j.startTime+j.duration-b),d=c/j.duration||0,f=1-d,g=0,i=j.tweens.length;g<i;g++)j.tweens[g].run(f);return h.notifyWith(a,[j,f,c]),f<1&&i?c:(i||h.notifyWith(a,[j,1,0]),h.resolveWith(a,[j]),!1)},j=h.promise({elem:a,props:r.extend({},b),opts:r.extend(!0,{specialEasing:{},easing:r.easing._default},c),originalProperties:b,originalOptions:c,startTime:ab||fb(),duration:c.duration,tweens:[],createTween:function(b,c){var d=r.Tween(a,j.opts,b,c,j.opts.specialEasing[b]||j.opts.easing);return j.tweens.push(d),d},stop:function(b){var c=0,d=b?j.tweens.length:0;if(e)return this;for(e=!0;c<d;c++)j.tweens[c].run(1);return b?(h.notifyWith(a,[j,1,0]),h.resolveWith(a,[j,b])):h.rejectWith(a,[j,b]),this}}),k=j.props;for(jb(k,j.opts.specialEasing);f<g;f++)if(d=kb.prefilters[f].call(j,a,k,j.opts))return r.isFunction(d.stop)&&(r._queueHooks(j.elem,j.opts.queue).stop=r.proxy(d.stop,d)),d;return r.map(k,hb,j),r.isFunction(j.opts.start)&&j.opts.start.call(a,j),j.progress(j.opts.progress).done(j.opts.done,j.opts.complete).fail(j.opts.fail).always(j.opts.always),r.fx.timer(r.extend(i,{elem:a,anim:j,queue:j.opts.queue})),j}r.Animation=r.extend(kb,{tweeners:{"*":[function(a,b){var c=this.createTween(a,b);return fa(c.elem,a,ba.exec(b),c),c}]},tweener:function(a,b){r.isFunction(a)?(b=a,a=["*"]):a=a.match(L);for(var c,d=0,e=a.length;d<e;d++)c=a[d],kb.tweeners[c]=kb.tweeners[c]||[],kb.tweeners[c].unshift(b)},prefilters:[ib],prefilter:function(a,b){b?kb.prefilters.unshift(a):kb.prefilters.push(a)}}),r.speed=function(a,b,c){var d=a&&"object"==typeof a?r.extend({},a):{complete:c||!c&&b||r.isFunction(a)&&a,duration:a,easing:c&&b||b&&!r.isFunction(b)&&b};return r.fx.off?d.duration=0:"number"!=typeof d.duration&&(d.duration in r.fx.speeds?d.duration=r.fx.speeds[d.duration]:d.duration=r.fx.speeds._default),null!=d.queue&&d.queue!==!0||(d.queue="fx"),d.old=d.complete,d.complete=function(){r.isFunction(d.old)&&d.old.call(this),d.queue&&r.dequeue(this,d.queue)},d},r.fn.extend({fadeTo:function(a,b,c,d){return this.filter(da).css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){var e=r.isEmptyObject(a),f=r.speed(b,c,d),g=function(){var b=kb(this,r.extend({},a),f);(e||W.get(this,"finish"))&&b.stop(!0)};return g.finish=g,e||f.queue===!1?this.each(g):this.queue(f.queue,g)},stop:function(a,b,c){var d=function(a){var b=a.stop;delete a.stop,b(c)};return"string"!=typeof a&&(c=b,b=a,a=void 0),b&&a!==!1&&this.queue(a||"fx",[]),this.each(function(){var b=!0,e=null!=a&&a+"queueHooks",f=r.timers,g=W.get(this);if(e)g[e]&&g[e].stop&&d(g[e]);else for(e in g)g[e]&&g[e].stop&&db.test(e)&&d(g[e]);for(e=f.length;e--;)f[e].elem!==this||null!=a&&f[e].queue!==a||(f[e].anim.stop(c),b=!1,f.splice(e,1));!b&&c||r.dequeue(this,a)})},finish:function(a){return a!==!1&&(a=a||"fx"),this.each(function(){var b,c=W.get(this),d=c[a+"queue"],e=c[a+"queueHooks"],f=r.timers,g=d?d.length:0;for(c.finish=!0,r.queue(this,a,[]),e&&e.stop&&e.stop.call(this,!0),b=f.length;b--;)f[b].elem===this&&f[b].queue===a&&(f[b].anim.stop(!0),f.splice(b,1));for(b=0;b<g;b++)d[b]&&d[b].finish&&d[b].finish.call(this);delete c.finish})}}),r.each(["toggle","show","hide"],function(a,b){var c=r.fn[b];r.fn[b]=function(a,d,e){return null==a||"boolean"==typeof a?c.apply(this,arguments):this.animate(gb(b,!0),a,d,e)}}),r.each({slideDown:gb("show"),slideUp:gb("hide"),slideToggle:gb("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){r.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),r.timers=[],r.fx.tick=function(){var a,b=0,c=r.timers;for(ab=r.now();b<c.length;b++)a=c[b],a()||c[b]!==a||c.splice(b--,1);c.length||r.fx.stop(),ab=void 0},r.fx.timer=function(a){r.timers.push(a),r.fx.start()},r.fx.interval=13,r.fx.start=function(){bb||(bb=!0,eb())},r.fx.stop=function(){bb=null},r.fx.speeds={slow:600,fast:200,_default:400},r.fn.delay=function(b,c){return b=r.fx?r.fx.speeds[b]||b:b,c=c||"fx",this.queue(c,function(c,d){var e=a.setTimeout(c,b);d.stop=function(){a.clearTimeout(e)}})},function(){var a=d.createElement("input"),b=d.createElement("select"),c=b.appendChild(d.createElement("option"));a.type="checkbox",o.checkOn=""!==a.value,o.optSelected=c.selected,a=d.createElement("input"),a.value="t",a.type="radio",o.radioValue="t"===a.value}();var lb,mb=r.expr.attrHandle;r.fn.extend({attr:function(a,b){return T(this,r.attr,a,b,arguments.length>1)},removeAttr:function(a){return this.each(function(){r.removeAttr(this,a)})}}),r.extend({attr:function(a,b,c){var d,e,f=a.nodeType;if(3!==f&&8!==f&&2!==f)return"undefined"==typeof a.getAttribute?r.prop(a,b,c):(1===f&&r.isXMLDoc(a)||(e=r.attrHooks[b.toLowerCase()]||(r.expr.match.bool.test(b)?lb:void 0)),void 0!==c?null===c?void r.removeAttr(a,b):e&&"set"in e&&void 0!==(d=e.set(a,c,b))?d:(a.setAttribute(b,c+""),c):e&&"get"in e&&null!==(d=e.get(a,b))?d:(d=r.find.attr(a,b),
null==d?void 0:d))},attrHooks:{type:{set:function(a,b){if(!o.radioValue&&"radio"===b&&B(a,"input")){var c=a.value;return a.setAttribute("type",b),c&&(a.value=c),b}}}},removeAttr:function(a,b){var c,d=0,e=b&&b.match(L);if(e&&1===a.nodeType)while(c=e[d++])a.removeAttribute(c)}}),lb={set:function(a,b,c){return b===!1?r.removeAttr(a,c):a.setAttribute(c,c),c}},r.each(r.expr.match.bool.source.match(/\w+/g),function(a,b){var c=mb[b]||r.find.attr;mb[b]=function(a,b,d){var e,f,g=b.toLowerCase();return d||(f=mb[g],mb[g]=e,e=null!=c(a,b,d)?g:null,mb[g]=f),e}});var nb=/^(?:input|select|textarea|button)$/i,ob=/^(?:a|area)$/i;r.fn.extend({prop:function(a,b){return T(this,r.prop,a,b,arguments.length>1)},removeProp:function(a){return this.each(function(){delete this[r.propFix[a]||a]})}}),r.extend({prop:function(a,b,c){var d,e,f=a.nodeType;if(3!==f&&8!==f&&2!==f)return 1===f&&r.isXMLDoc(a)||(b=r.propFix[b]||b,e=r.propHooks[b]),void 0!==c?e&&"set"in e&&void 0!==(d=e.set(a,c,b))?d:a[b]=c:e&&"get"in e&&null!==(d=e.get(a,b))?d:a[b]},propHooks:{tabIndex:{get:function(a){var b=r.find.attr(a,"tabindex");return b?parseInt(b,10):nb.test(a.nodeName)||ob.test(a.nodeName)&&a.href?0:-1}}},propFix:{"for":"htmlFor","class":"className"}}),o.optSelected||(r.propHooks.selected={get:function(a){var b=a.parentNode;return b&&b.parentNode&&b.parentNode.selectedIndex,null},set:function(a){var b=a.parentNode;b&&(b.selectedIndex,b.parentNode&&b.parentNode.selectedIndex)}}),r.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){r.propFix[this.toLowerCase()]=this});function pb(a){var b=a.match(L)||[];return b.join(" ")}function qb(a){return a.getAttribute&&a.getAttribute("class")||""}r.fn.extend({addClass:function(a){var b,c,d,e,f,g,h,i=0;if(r.isFunction(a))return this.each(function(b){r(this).addClass(a.call(this,b,qb(this)))});if("string"==typeof a&&a){b=a.match(L)||[];while(c=this[i++])if(e=qb(c),d=1===c.nodeType&&" "+pb(e)+" "){g=0;while(f=b[g++])d.indexOf(" "+f+" ")<0&&(d+=f+" ");h=pb(d),e!==h&&c.setAttribute("class",h)}}return this},removeClass:function(a){var b,c,d,e,f,g,h,i=0;if(r.isFunction(a))return this.each(function(b){r(this).removeClass(a.call(this,b,qb(this)))});if(!arguments.length)return this.attr("class","");if("string"==typeof a&&a){b=a.match(L)||[];while(c=this[i++])if(e=qb(c),d=1===c.nodeType&&" "+pb(e)+" "){g=0;while(f=b[g++])while(d.indexOf(" "+f+" ")>-1)d=d.replace(" "+f+" "," ");h=pb(d),e!==h&&c.setAttribute("class",h)}}return this},toggleClass:function(a,b){var c=typeof a;return"boolean"==typeof b&&"string"===c?b?this.addClass(a):this.removeClass(a):r.isFunction(a)?this.each(function(c){r(this).toggleClass(a.call(this,c,qb(this),b),b)}):this.each(function(){var b,d,e,f;if("string"===c){d=0,e=r(this),f=a.match(L)||[];while(b=f[d++])e.hasClass(b)?e.removeClass(b):e.addClass(b)}else void 0!==a&&"boolean"!==c||(b=qb(this),b&&W.set(this,"__className__",b),this.setAttribute&&this.setAttribute("class",b||a===!1?"":W.get(this,"__className__")||""))})},hasClass:function(a){var b,c,d=0;b=" "+a+" ";while(c=this[d++])if(1===c.nodeType&&(" "+pb(qb(c))+" ").indexOf(b)>-1)return!0;return!1}});var rb=/\r/g;r.fn.extend({val:function(a){var b,c,d,e=this[0];{if(arguments.length)return d=r.isFunction(a),this.each(function(c){var e;1===this.nodeType&&(e=d?a.call(this,c,r(this).val()):a,null==e?e="":"number"==typeof e?e+="":Array.isArray(e)&&(e=r.map(e,function(a){return null==a?"":a+""})),b=r.valHooks[this.type]||r.valHooks[this.nodeName.toLowerCase()],b&&"set"in b&&void 0!==b.set(this,e,"value")||(this.value=e))});if(e)return b=r.valHooks[e.type]||r.valHooks[e.nodeName.toLowerCase()],b&&"get"in b&&void 0!==(c=b.get(e,"value"))?c:(c=e.value,"string"==typeof c?c.replace(rb,""):null==c?"":c)}}}),r.extend({valHooks:{option:{get:function(a){var b=r.find.attr(a,"value");return null!=b?b:pb(r.text(a))}},select:{get:function(a){var b,c,d,e=a.options,f=a.selectedIndex,g="select-one"===a.type,h=g?null:[],i=g?f+1:e.length;for(d=f<0?i:g?f:0;d<i;d++)if(c=e[d],(c.selected||d===f)&&!c.disabled&&(!c.parentNode.disabled||!B(c.parentNode,"optgroup"))){if(b=r(c).val(),g)return b;h.push(b)}return h},set:function(a,b){var c,d,e=a.options,f=r.makeArray(b),g=e.length;while(g--)d=e[g],(d.selected=r.inArray(r.valHooks.option.get(d),f)>-1)&&(c=!0);return c||(a.selectedIndex=-1),f}}}}),r.each(["radio","checkbox"],function(){r.valHooks[this]={set:function(a,b){if(Array.isArray(b))return a.checked=r.inArray(r(a).val(),b)>-1}},o.checkOn||(r.valHooks[this].get=function(a){return null===a.getAttribute("value")?"on":a.value})});var sb=/^(?:focusinfocus|focusoutblur)$/;r.extend(r.event,{trigger:function(b,c,e,f){var g,h,i,j,k,m,n,o=[e||d],p=l.call(b,"type")?b.type:b,q=l.call(b,"namespace")?b.namespace.split("."):[];if(h=i=e=e||d,3!==e.nodeType&&8!==e.nodeType&&!sb.test(p+r.event.triggered)&&(p.indexOf(".")>-1&&(q=p.split("."),p=q.shift(),q.sort()),k=p.indexOf(":")<0&&"on"+p,b=b[r.expando]?b:new r.Event(p,"object"==typeof b&&b),b.isTrigger=f?2:3,b.namespace=q.join("."),b.rnamespace=b.namespace?new RegExp("(^|\\.)"+q.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,b.result=void 0,b.target||(b.target=e),c=null==c?[b]:r.makeArray(c,[b]),n=r.event.special[p]||{},f||!n.trigger||n.trigger.apply(e,c)!==!1)){if(!f&&!n.noBubble&&!r.isWindow(e)){for(j=n.delegateType||p,sb.test(j+p)||(h=h.parentNode);h;h=h.parentNode)o.push(h),i=h;i===(e.ownerDocument||d)&&o.push(i.defaultView||i.parentWindow||a)}g=0;while((h=o[g++])&&!b.isPropagationStopped())b.type=g>1?j:n.bindType||p,m=(W.get(h,"events")||{})[b.type]&&W.get(h,"handle"),m&&m.apply(h,c),m=k&&h[k],m&&m.apply&&U(h)&&(b.result=m.apply(h,c),b.result===!1&&b.preventDefault());return b.type=p,f||b.isDefaultPrevented()||n._default&&n._default.apply(o.pop(),c)!==!1||!U(e)||k&&r.isFunction(e[p])&&!r.isWindow(e)&&(i=e[k],i&&(e[k]=null),r.event.triggered=p,e[p](),r.event.triggered=void 0,i&&(e[k]=i)),b.result}},simulate:function(a,b,c){var d=r.extend(new r.Event,c,{type:a,isSimulated:!0});r.event.trigger(d,null,b)}}),r.fn.extend({trigger:function(a,b){return this.each(function(){r.event.trigger(a,b,this)})},triggerHandler:function(a,b){var c=this[0];if(c)return r.event.trigger(a,b,c,!0)}}),r.each("blur focus focusin focusout resize scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup contextmenu".split(" "),function(a,b){r.fn[b]=function(a,c){return arguments.length>0?this.on(b,null,a,c):this.trigger(b)}}),r.fn.extend({hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}}),o.focusin="onfocusin"in a,o.focusin||r.each({focus:"focusin",blur:"focusout"},function(a,b){var c=function(a){r.event.simulate(b,a.target,r.event.fix(a))};r.event.special[b]={setup:function(){var d=this.ownerDocument||this,e=W.access(d,b);e||d.addEventListener(a,c,!0),W.access(d,b,(e||0)+1)},teardown:function(){var d=this.ownerDocument||this,e=W.access(d,b)-1;e?W.access(d,b,e):(d.removeEventListener(a,c,!0),W.remove(d,b))}}});var tb=a.location,ub=r.now(),vb=/\?/;r.parseXML=function(b){var c;if(!b||"string"!=typeof b)return null;try{c=(new a.DOMParser).parseFromString(b,"text/xml")}catch(d){c=void 0}return c&&!c.getElementsByTagName("parsererror").length||r.error("Invalid XML: "+b),c};var wb=/\[\]$/,xb=/\r?\n/g,yb=/^(?:submit|button|image|reset|file)$/i,zb=/^(?:input|select|textarea|keygen)/i;function Ab(a,b,c,d){var e;if(Array.isArray(b))r.each(b,function(b,e){c||wb.test(a)?d(a,e):Ab(a+"["+("object"==typeof e&&null!=e?b:"")+"]",e,c,d)});else if(c||"object"!==r.type(b))d(a,b);else for(e in b)Ab(a+"["+e+"]",b[e],c,d)}r.param=function(a,b){var c,d=[],e=function(a,b){var c=r.isFunction(b)?b():b;d[d.length]=encodeURIComponent(a)+"="+encodeURIComponent(null==c?"":c)};if(Array.isArray(a)||a.jquery&&!r.isPlainObject(a))r.each(a,function(){e(this.name,this.value)});else for(c in a)Ab(c,a[c],b,e);return d.join("&")},r.fn.extend({serialize:function(){return r.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var a=r.prop(this,"elements");return a?r.makeArray(a):this}).filter(function(){var a=this.type;return this.name&&!r(this).is(":disabled")&&zb.test(this.nodeName)&&!yb.test(a)&&(this.checked||!ja.test(a))}).map(function(a,b){var c=r(this).val();return null==c?null:Array.isArray(c)?r.map(c,function(a){return{name:b.name,value:a.replace(xb,"\r\n")}}):{name:b.name,value:c.replace(xb,"\r\n")}}).get()}});var Bb=/%20/g,Cb=/#.*$/,Db=/([?&])_=[^&]*/,Eb=/^(.*?):[ \t]*([^\r\n]*)$/gm,Fb=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,Gb=/^(?:GET|HEAD)$/,Hb=/^\/\//,Ib={},Jb={},Kb="*/".concat("*"),Lb=d.createElement("a");Lb.href=tb.href;function Mb(a){return function(b,c){"string"!=typeof b&&(c=b,b="*");var d,e=0,f=b.toLowerCase().match(L)||[];if(r.isFunction(c))while(d=f[e++])"+"===d[0]?(d=d.slice(1)||"*",(a[d]=a[d]||[]).unshift(c)):(a[d]=a[d]||[]).push(c)}}function Nb(a,b,c,d){var e={},f=a===Jb;function g(h){var i;return e[h]=!0,r.each(a[h]||[],function(a,h){var j=h(b,c,d);return"string"!=typeof j||f||e[j]?f?!(i=j):void 0:(b.dataTypes.unshift(j),g(j),!1)}),i}return g(b.dataTypes[0])||!e["*"]&&g("*")}function Ob(a,b){var c,d,e=r.ajaxSettings.flatOptions||{};for(c in b)void 0!==b[c]&&((e[c]?a:d||(d={}))[c]=b[c]);return d&&r.extend(!0,a,d),a}function Pb(a,b,c){var d,e,f,g,h=a.contents,i=a.dataTypes;while("*"===i[0])i.shift(),void 0===d&&(d=a.mimeType||b.getResponseHeader("Content-Type"));if(d)for(e in h)if(h[e]&&h[e].test(d)){i.unshift(e);break}if(i[0]in c)f=i[0];else{for(e in c){if(!i[0]||a.converters[e+" "+i[0]]){f=e;break}g||(g=e)}f=f||g}if(f)return f!==i[0]&&i.unshift(f),c[f]}function Qb(a,b,c,d){var e,f,g,h,i,j={},k=a.dataTypes.slice();if(k[1])for(g in a.converters)j[g.toLowerCase()]=a.converters[g];f=k.shift();while(f)if(a.responseFields[f]&&(c[a.responseFields[f]]=b),!i&&d&&a.dataFilter&&(b=a.dataFilter(b,a.dataType)),i=f,f=k.shift())if("*"===f)f=i;else if("*"!==i&&i!==f){if(g=j[i+" "+f]||j["* "+f],!g)for(e in j)if(h=e.split(" "),h[1]===f&&(g=j[i+" "+h[0]]||j["* "+h[0]])){g===!0?g=j[e]:j[e]!==!0&&(f=h[0],k.unshift(h[1]));break}if(g!==!0)if(g&&a["throws"])b=g(b);else try{b=g(b)}catch(l){return{state:"parsererror",error:g?l:"No conversion from "+i+" to "+f}}}return{state:"success",data:b}}r.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:tb.href,type:"GET",isLocal:Fb.test(tb.protocol),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":Kb,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/\bxml\b/,html:/\bhtml/,json:/\bjson\b/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":JSON.parse,"text xml":r.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(a,b){return b?Ob(Ob(a,r.ajaxSettings),b):Ob(r.ajaxSettings,a)},ajaxPrefilter:Mb(Ib),ajaxTransport:Mb(Jb),ajax:function(b,c){"object"==typeof b&&(c=b,b=void 0),c=c||{};var e,f,g,h,i,j,k,l,m,n,o=r.ajaxSetup({},c),p=o.context||o,q=o.context&&(p.nodeType||p.jquery)?r(p):r.event,s=r.Deferred(),t=r.Callbacks("once memory"),u=o.statusCode||{},v={},w={},x="canceled",y={readyState:0,getResponseHeader:function(a){var b;if(k){if(!h){h={};while(b=Eb.exec(g))h[b[1].toLowerCase()]=b[2]}b=h[a.toLowerCase()]}return null==b?null:b},getAllResponseHeaders:function(){return k?g:null},setRequestHeader:function(a,b){return null==k&&(a=w[a.toLowerCase()]=w[a.toLowerCase()]||a,v[a]=b),this},overrideMimeType:function(a){return null==k&&(o.mimeType=a),this},statusCode:function(a){var b;if(a)if(k)y.always(a[y.status]);else for(b in a)u[b]=[u[b],a[b]];return this},abort:function(a){var b=a||x;return e&&e.abort(b),A(0,b),this}};if(s.promise(y),o.url=((b||o.url||tb.href)+"").replace(Hb,tb.protocol+"//"),o.type=c.method||c.type||o.method||o.type,o.dataTypes=(o.dataType||"*").toLowerCase().match(L)||[""],null==o.crossDomain){j=d.createElement("a");try{j.href=o.url,j.href=j.href,o.crossDomain=Lb.protocol+"//"+Lb.host!=j.protocol+"//"+j.host}catch(z){o.crossDomain=!0}}if(o.data&&o.processData&&"string"!=typeof o.data&&(o.data=r.param(o.data,o.traditional)),Nb(Ib,o,c,y),k)return y;l=r.event&&o.global,l&&0===r.active++&&r.event.trigger("ajaxStart"),o.type=o.type.toUpperCase(),o.hasContent=!Gb.test(o.type),f=o.url.replace(Cb,""),o.hasContent?o.data&&o.processData&&0===(o.contentType||"").indexOf("application/x-www-form-urlencoded")&&(o.data=o.data.replace(Bb,"+")):(n=o.url.slice(f.length),o.data&&(f+=(vb.test(f)?"&":"?")+o.data,delete o.data),o.cache===!1&&(f=f.replace(Db,"$1"),n=(vb.test(f)?"&":"?")+"_="+ub++ +n),o.url=f+n),o.ifModified&&(r.lastModified[f]&&y.setRequestHeader("If-Modified-Since",r.lastModified[f]),r.etag[f]&&y.setRequestHeader("If-None-Match",r.etag[f])),(o.data&&o.hasContent&&o.contentType!==!1||c.contentType)&&y.setRequestHeader("Content-Type",o.contentType),y.setRequestHeader("Accept",o.dataTypes[0]&&o.accepts[o.dataTypes[0]]?o.accepts[o.dataTypes[0]]+("*"!==o.dataTypes[0]?", "+Kb+"; q=0.01":""):o.accepts["*"]);for(m in o.headers)y.setRequestHeader(m,o.headers[m]);if(o.beforeSend&&(o.beforeSend.call(p,y,o)===!1||k))return y.abort();if(x="abort",t.add(o.complete),y.done(o.success),y.fail(o.error),e=Nb(Jb,o,c,y)){if(y.readyState=1,l&&q.trigger("ajaxSend",[y,o]),k)return y;o.async&&o.timeout>0&&(i=a.setTimeout(function(){y.abort("timeout")},o.timeout));try{k=!1,e.send(v,A)}catch(z){if(k)throw z;A(-1,z)}}else A(-1,"No Transport");function A(b,c,d,h){var j,m,n,v,w,x=c;k||(k=!0,i&&a.clearTimeout(i),e=void 0,g=h||"",y.readyState=b>0?4:0,j=b>=200&&b<300||304===b,d&&(v=Pb(o,y,d)),v=Qb(o,v,y,j),j?(o.ifModified&&(w=y.getResponseHeader("Last-Modified"),w&&(r.lastModified[f]=w),w=y.getResponseHeader("etag"),w&&(r.etag[f]=w)),204===b||"HEAD"===o.type?x="nocontent":304===b?x="notmodified":(x=v.state,m=v.data,n=v.error,j=!n)):(n=x,!b&&x||(x="error",b<0&&(b=0))),y.status=b,y.statusText=(c||x)+"",j?s.resolveWith(p,[m,x,y]):s.rejectWith(p,[y,x,n]),y.statusCode(u),u=void 0,l&&q.trigger(j?"ajaxSuccess":"ajaxError",[y,o,j?m:n]),t.fireWith(p,[y,x]),l&&(q.trigger("ajaxComplete",[y,o]),--r.active||r.event.trigger("ajaxStop")))}return y},getJSON:function(a,b,c){return r.get(a,b,c,"json")},getScript:function(a,b){return r.get(a,void 0,b,"script")}}),r.each(["get","post"],function(a,b){r[b]=function(a,c,d,e){return r.isFunction(c)&&(e=e||d,d=c,c=void 0),r.ajax(r.extend({url:a,type:b,dataType:e,data:c,success:d},r.isPlainObject(a)&&a))}}),r._evalUrl=function(a){return r.ajax({url:a,type:"GET",dataType:"script",cache:!0,async:!1,global:!1,"throws":!0})},r.fn.extend({wrapAll:function(a){var b;return this[0]&&(r.isFunction(a)&&(a=a.call(this[0])),b=r(a,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstElementChild)a=a.firstElementChild;return a}).append(this)),this},wrapInner:function(a){return r.isFunction(a)?this.each(function(b){r(this).wrapInner(a.call(this,b))}):this.each(function(){var b=r(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){var b=r.isFunction(a);return this.each(function(c){r(this).wrapAll(b?a.call(this,c):a)})},unwrap:function(a){return this.parent(a).not("body").each(function(){r(this).replaceWith(this.childNodes)}),this}}),r.expr.pseudos.hidden=function(a){return!r.expr.pseudos.visible(a)},r.expr.pseudos.visible=function(a){return!!(a.offsetWidth||a.offsetHeight||a.getClientRects().length)},r.ajaxSettings.xhr=function(){try{return new a.XMLHttpRequest}catch(b){}};var Rb={0:200,1223:204},Sb=r.ajaxSettings.xhr();o.cors=!!Sb&&"withCredentials"in Sb,o.ajax=Sb=!!Sb,r.ajaxTransport(function(b){var c,d;if(o.cors||Sb&&!b.crossDomain)return{send:function(e,f){var g,h=b.xhr();if(h.open(b.type,b.url,b.async,b.username,b.password),b.xhrFields)for(g in b.xhrFields)h[g]=b.xhrFields[g];b.mimeType&&h.overrideMimeType&&h.overrideMimeType(b.mimeType),b.crossDomain||e["X-Requested-With"]||(e["X-Requested-With"]="XMLHttpRequest");for(g in e)h.setRequestHeader(g,e[g]);c=function(a){return function(){c&&(c=d=h.onload=h.onerror=h.onabort=h.onreadystatechange=null,"abort"===a?h.abort():"error"===a?"number"!=typeof h.status?f(0,"error"):f(h.status,h.statusText):f(Rb[h.status]||h.status,h.statusText,"text"!==(h.responseType||"text")||"string"!=typeof h.responseText?{binary:h.response}:{text:h.responseText},h.getAllResponseHeaders()))}},h.onload=c(),d=h.onerror=c("error"),void 0!==h.onabort?h.onabort=d:h.onreadystatechange=function(){4===h.readyState&&a.setTimeout(function(){c&&d()})},c=c("abort");try{h.send(b.hasContent&&b.data||null)}catch(i){if(c)throw i}},abort:function(){c&&c()}}}),r.ajaxPrefilter(function(a){a.crossDomain&&(a.contents.script=!1)}),r.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/\b(?:java|ecma)script\b/},converters:{"text script":function(a){return r.globalEval(a),a}}}),r.ajaxPrefilter("script",function(a){void 0===a.cache&&(a.cache=!1),a.crossDomain&&(a.type="GET")}),r.ajaxTransport("script",function(a){if(a.crossDomain){var b,c;return{send:function(e,f){b=r("<script>").prop({charset:a.scriptCharset,src:a.url}).on("load error",c=function(a){b.remove(),c=null,a&&f("error"===a.type?404:200,a.type)}),d.head.appendChild(b[0])},abort:function(){c&&c()}}}});var Tb=[],Ub=/(=)\?(?=&|$)|\?\?/;r.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var a=Tb.pop()||r.expando+"_"+ub++;return this[a]=!0,a}}),r.ajaxPrefilter("json jsonp",function(b,c,d){var e,f,g,h=b.jsonp!==!1&&(Ub.test(b.url)?"url":"string"==typeof b.data&&0===(b.contentType||"").indexOf("application/x-www-form-urlencoded")&&Ub.test(b.data)&&"data");if(h||"jsonp"===b.dataTypes[0])return e=b.jsonpCallback=r.isFunction(b.jsonpCallback)?b.jsonpCallback():b.jsonpCallback,h?b[h]=b[h].replace(Ub,"$1"+e):b.jsonp!==!1&&(b.url+=(vb.test(b.url)?"&":"?")+b.jsonp+"="+e),b.converters["script json"]=function(){return g||r.error(e+" was not called"),g[0]},b.dataTypes[0]="json",f=a[e],a[e]=function(){g=arguments},d.always(function(){void 0===f?r(a).removeProp(e):a[e]=f,b[e]&&(b.jsonpCallback=c.jsonpCallback,Tb.push(e)),g&&r.isFunction(f)&&f(g[0]),g=f=void 0}),"script"}),o.createHTMLDocument=function(){var a=d.implementation.createHTMLDocument("").body;return a.innerHTML="<form></form><form></form>",2===a.childNodes.length}(),r.parseHTML=function(a,b,c){if("string"!=typeof a)return[];"boolean"==typeof b&&(c=b,b=!1);var e,f,g;return b||(o.createHTMLDocument?(b=d.implementation.createHTMLDocument(""),e=b.createElement("base"),e.href=d.location.href,b.head.appendChild(e)):b=d),f=C.exec(a),g=!c&&[],f?[b.createElement(f[1])]:(f=qa([a],b,g),g&&g.length&&r(g).remove(),r.merge([],f.childNodes))},r.fn.load=function(a,b,c){var d,e,f,g=this,h=a.indexOf(" ");return h>-1&&(d=pb(a.slice(h)),a=a.slice(0,h)),r.isFunction(b)?(c=b,b=void 0):b&&"object"==typeof b&&(e="POST"),g.length>0&&r.ajax({url:a,type:e||"GET",dataType:"html",data:b}).done(function(a){f=arguments,g.html(d?r("<div>").append(r.parseHTML(a)).find(d):a)}).always(c&&function(a,b){g.each(function(){c.apply(this,f||[a.responseText,b,a])})}),this},r.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(a,b){r.fn[b]=function(a){return this.on(b,a)}}),r.expr.pseudos.animated=function(a){return r.grep(r.timers,function(b){return a===b.elem}).length},r.offset={setOffset:function(a,b,c){var d,e,f,g,h,i,j,k=r.css(a,"position"),l=r(a),m={};"static"===k&&(a.style.position="relative"),h=l.offset(),f=r.css(a,"top"),i=r.css(a,"left"),j=("absolute"===k||"fixed"===k)&&(f+i).indexOf("auto")>-1,j?(d=l.position(),g=d.top,e=d.left):(g=parseFloat(f)||0,e=parseFloat(i)||0),r.isFunction(b)&&(b=b.call(a,c,r.extend({},h))),null!=b.top&&(m.top=b.top-h.top+g),null!=b.left&&(m.left=b.left-h.left+e),"using"in b?b.using.call(a,m):l.css(m)}},r.fn.extend({offset:function(a){if(arguments.length)return void 0===a?this:this.each(function(b){r.offset.setOffset(this,a,b)});var b,c,d,e,f=this[0];if(f)return f.getClientRects().length?(d=f.getBoundingClientRect(),b=f.ownerDocument,c=b.documentElement,e=b.defaultView,{top:d.top+e.pageYOffset-c.clientTop,left:d.left+e.pageXOffset-c.clientLeft}):{top:0,left:0}},position:function(){if(this[0]){var a,b,c=this[0],d={top:0,left:0};return"fixed"===r.css(c,"position")?b=c.getBoundingClientRect():(a=this.offsetParent(),b=this.offset(),B(a[0],"html")||(d=a.offset()),d={top:d.top+r.css(a[0],"borderTopWidth",!0),left:d.left+r.css(a[0],"borderLeftWidth",!0)}),{top:b.top-d.top-r.css(c,"marginTop",!0),left:b.left-d.left-r.css(c,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var a=this.offsetParent;while(a&&"static"===r.css(a,"position"))a=a.offsetParent;return a||ra})}}),r.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(a,b){var c="pageYOffset"===b;r.fn[a]=function(d){return T(this,function(a,d,e){var f;return r.isWindow(a)?f=a:9===a.nodeType&&(f=a.defaultView),void 0===e?f?f[b]:a[d]:void(f?f.scrollTo(c?f.pageXOffset:e,c?e:f.pageYOffset):a[d]=e)},a,d,arguments.length)}}),r.each(["top","left"],function(a,b){r.cssHooks[b]=Pa(o.pixelPosition,function(a,c){if(c)return c=Oa(a,b),Ma.test(c)?r(a).position()[b]+"px":c})}),r.each({Height:"height",Width:"width"},function(a,b){r.each({padding:"inner"+a,content:b,"":"outer"+a},function(c,d){r.fn[d]=function(e,f){var g=arguments.length&&(c||"boolean"!=typeof e),h=c||(e===!0||f===!0?"margin":"border");return T(this,function(b,c,e){var f;return r.isWindow(b)?0===d.indexOf("outer")?b["inner"+a]:b.document.documentElement["client"+a]:9===b.nodeType?(f=b.documentElement,Math.max(b.body["scroll"+a],f["scroll"+a],b.body["offset"+a],f["offset"+a],f["client"+a])):void 0===e?r.css(b,c,h):r.style(b,c,e,h)},b,g?e:void 0,g)}})}),r.fn.extend({bind:function(a,b,c){return this.on(a,null,b,c)},unbind:function(a,b){return this.off(a,null,b)},delegate:function(a,b,c,d){return this.on(b,a,c,d)},undelegate:function(a,b,c){return 1===arguments.length?this.off(a,"**"):this.off(b,a||"**",c)}}),r.holdReady=function(a){a?r.readyWait++:r.ready(!0)},r.isArray=Array.isArray,r.parseJSON=JSON.parse,r.nodeName=B,"function"==typeof define&&define.amd&&define("jquery",[],function(){return r});var Vb=a.jQuery,Wb=a.$;return r.noConflict=function(b){return a.$===r&&(a.$=Wb),b&&a.jQuery===r&&(a.jQuery=Vb),r},b||(a.jQuery=a.$=r),r});

//
!(function($) {

  var _scrollbars = null;
  var _body = null;
  var borderColor = '#fbf1ef';

  function getBody() {
    return _body ? _body : (_body = $(document.body));
  }

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
    return document.body.scrollHeight > $body.height();
  }

  window.fixBody = function() {
    var offset = getScrollbars() + 'px';

    getBody().css({
      borderRightColor: borderColor,
      borderRightStyle: 'solid',
      borderRightWidth: offset,
      overflow: 'hidden'
    });

    var event = new $.Event('fix');
    event.offset = offset;

    getBody().trigger(event);
  };

  window.unfixBody = function() {
    getBody().css({
      borderRightStyle: '',
      borderRightColor: '',
      borderRightWidth: '',
      overflow: ''
    });

    getBody().trigger('unfix');
  };

})(window.jQuery);
!(function($) {

  window.addEventListener('DOMContentLoaded', function() {
    var $header = $('.global__header');

    var isFixed = $header.css('position') == 'fixed';
    if (!isFixed) return;

    $(document.body)

      .on('fix', function(e) {
        $header.css({paddingRight: e.offset});
      })

      .on('unfix', function() {
        $header.css({paddingRight: ''});
      });
  });

})(window.jQuery);
!(function($) {

  function refresh() {
    var $nodes = $('[data-fix-height]');

    for (var i = 0; i < $nodes.length; i++) {
      var $node = $nodes.eq(i);
      var $parent = $node.parent();
      
      var width = $parent.width();
      var height = $parent.height();

      $node.css({
        width: width + 'px',
        height: height + 'px'
      });
    }
  }

  $(document).on('start', refresh);
  $(window).on('resize', refresh);
})(window.jQuery);
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
		unfixBody();
	}

	function fix() {
		fixBody();
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
!(function() {
  var duration = 1700;
  var minDelay = 1500;
  var startDelay = 1;

  var isTimeout = false;
  var isLoaded = false;

  function onTimeout() {
    isTimeout = true;
    hide();
  }

  function onLoaded() {
    isLoaded = true;
    hide();
  }

  function hide() {
    if (!isTimeout || !isLoaded) {
      return;
    }

    var loader = document.getElementById('loader');
    loader.classList.remove('active');
    loader.classList.add('leave');

    var remove = function() {
      unfixBody();
      loader.parentNode.removeChild(loader);
      $(document).trigger('start');
    };

    setTimeout(remove, duration);
  }

  window.addEventListener('DOMContentLoaded', fixBody);
  window.addEventListener('load', onLoaded);
  setTimeout(onTimeout, minDelay);
})();

SmoothScroll({
  stepSize: 50
});
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL2Jvd2VyX2NvbXBvbmVudHMvc21vb3Roc2Nyb2xsLWZvci13ZWJzaXRlcy9TbW9vdGhTY3JvbGwuanMiLCIuLi8uLi9ib3dlcl9jb21wb25lbnRzL2pxdWVyeS9kaXN0L2pxdWVyeS5taW4uanMiLCJpbmRleC5qcyIsImpzL2Rpc2FibGUtc2Nyb2xsLmpzIiwianMvaGVhZGVyLmpzIiwianMvZml4LWhlaWdodC5qcyIsImpzL2Nhcm91c2VsLmpzIiwianMvbW9kYWwuanMiLCJqcy9zY3JvbGwuanMiLCJqcy9jb3Vyc2UtbGVzc29uLmpzIiwianMvaG9tZS1zbGlkZXIuanMiLCJqcy9sb2FkZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzV1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ0ZBO0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBVDNCQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vXG4vLyBTbW9vdGhTY3JvbGwgZm9yIHdlYnNpdGVzIHYxLjQuNiAoQmFsYXpzIEdhbGFtYm9zaSlcbi8vIGh0dHA6Ly93d3cuc21vb3Roc2Nyb2xsLm5ldC9cbi8vXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIE1JVCBsaWNlbnNlLlxuLy9cbi8vIFlvdSBtYXkgdXNlIGl0IGluIHlvdXIgdGhlbWUgaWYgeW91IGNyZWRpdCBtZS4gXG4vLyBJdCBpcyBhbHNvIGZyZWUgdG8gdXNlIG9uIGFueSBpbmRpdmlkdWFsIHdlYnNpdGUuXG4vL1xuLy8gRXhjZXB0aW9uOlxuLy8gVGhlIG9ubHkgcmVzdHJpY3Rpb24gaXMgdG8gbm90IHB1Ymxpc2ggYW55ICBcbi8vIGV4dGVuc2lvbiBmb3IgYnJvd3NlcnMgb3IgbmF0aXZlIGFwcGxpY2F0aW9uXG4vLyB3aXRob3V0IGdldHRpbmcgYSB3cml0dGVuIHBlcm1pc3Npb24gZmlyc3QuXG4vL1xuXG4oZnVuY3Rpb24gKCkge1xuICBcbi8vIFNjcm9sbCBWYXJpYWJsZXMgKHR3ZWFrYWJsZSlcbnZhciBkZWZhdWx0T3B0aW9ucyA9IHtcblxuICAgIC8vIFNjcm9sbGluZyBDb3JlXG4gICAgZnJhbWVSYXRlICAgICAgICA6IDE1MCwgLy8gW0h6XVxuICAgIGFuaW1hdGlvblRpbWUgICAgOiA0MDAsIC8vIFttc11cbiAgICBzdGVwU2l6ZSAgICAgICAgIDogMTAwLCAvLyBbcHhdXG5cbiAgICAvLyBQdWxzZSAobGVzcyB0d2Vha2FibGUpXG4gICAgLy8gcmF0aW8gb2YgXCJ0YWlsXCIgdG8gXCJhY2NlbGVyYXRpb25cIlxuICAgIHB1bHNlQWxnb3JpdGhtICAgOiB0cnVlLFxuICAgIHB1bHNlU2NhbGUgICAgICAgOiA0LFxuICAgIHB1bHNlTm9ybWFsaXplICAgOiAxLFxuXG4gICAgLy8gQWNjZWxlcmF0aW9uXG4gICAgYWNjZWxlcmF0aW9uRGVsdGEgOiA1MCwgIC8vIDUwXG4gICAgYWNjZWxlcmF0aW9uTWF4ICAgOiAzLCAgIC8vIDNcblxuICAgIC8vIEtleWJvYXJkIFNldHRpbmdzXG4gICAga2V5Ym9hcmRTdXBwb3J0ICAgOiB0cnVlLCAgLy8gb3B0aW9uXG4gICAgYXJyb3dTY3JvbGwgICAgICAgOiA1MCwgICAgLy8gW3B4XVxuXG4gICAgLy8gT3RoZXJcbiAgICBmaXhlZEJhY2tncm91bmQgICA6IHRydWUsIFxuICAgIGV4Y2x1ZGVkICAgICAgICAgIDogJycgICAgXG59O1xuXG52YXIgb3B0aW9ucyA9IGRlZmF1bHRPcHRpb25zO1xuXG5cbi8vIE90aGVyIFZhcmlhYmxlc1xudmFyIGlzRXhjbHVkZWQgPSBmYWxzZTtcbnZhciBpc0ZyYW1lID0gZmFsc2U7XG52YXIgZGlyZWN0aW9uID0geyB4OiAwLCB5OiAwIH07XG52YXIgaW5pdERvbmUgID0gZmFsc2U7XG52YXIgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbnZhciBhY3RpdmVFbGVtZW50O1xudmFyIG9ic2VydmVyO1xudmFyIHJlZnJlc2hTaXplO1xudmFyIGRlbHRhQnVmZmVyID0gW107XG52YXIgaXNNYWMgPSAvXk1hYy8udGVzdChuYXZpZ2F0b3IucGxhdGZvcm0pO1xuXG52YXIga2V5ID0geyBsZWZ0OiAzNywgdXA6IDM4LCByaWdodDogMzksIGRvd246IDQwLCBzcGFjZWJhcjogMzIsIFxuICAgICAgICAgICAgcGFnZXVwOiAzMywgcGFnZWRvd246IDM0LCBlbmQ6IDM1LCBob21lOiAzNiB9O1xudmFyIGFycm93S2V5cyA9IHsgMzc6IDEsIDM4OiAxLCAzOTogMSwgNDA6IDEgfTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBJTklUSUFMSVpFXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogVGVzdHMgaWYgc21vb3RoIHNjcm9sbGluZyBpcyBhbGxvd2VkLiBTaHV0cyBkb3duIGV2ZXJ5dGhpbmcgaWYgbm90LlxuICovXG5mdW5jdGlvbiBpbml0VGVzdCgpIHtcbiAgICBpZiAob3B0aW9ucy5rZXlib2FyZFN1cHBvcnQpIHtcbiAgICAgICAgYWRkRXZlbnQoJ2tleWRvd24nLCBrZXlkb3duKTtcbiAgICB9XG59XG5cbi8qKlxuICogU2V0cyB1cCBzY3JvbGxzIGFycmF5LCBkZXRlcm1pbmVzIGlmIGZyYW1lcyBhcmUgaW52b2x2ZWQuXG4gKi9cbmZ1bmN0aW9uIGluaXQoKSB7XG4gIFxuICAgIGlmIChpbml0RG9uZSB8fCAhZG9jdW1lbnQuYm9keSkgcmV0dXJuO1xuXG4gICAgaW5pdERvbmUgPSB0cnVlO1xuXG4gICAgdmFyIGJvZHkgPSBkb2N1bWVudC5ib2R5O1xuICAgIHZhciBodG1sID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIHZhciB3aW5kb3dIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7IFxuICAgIHZhciBzY3JvbGxIZWlnaHQgPSBib2R5LnNjcm9sbEhlaWdodDtcbiAgICBcbiAgICAvLyBjaGVjayBjb21wYXQgbW9kZSBmb3Igcm9vdCBlbGVtZW50XG4gICAgcm9vdCA9IChkb2N1bWVudC5jb21wYXRNb2RlLmluZGV4T2YoJ0NTUycpID49IDApID8gaHRtbCA6IGJvZHk7XG4gICAgYWN0aXZlRWxlbWVudCA9IGJvZHk7XG4gICAgXG4gICAgaW5pdFRlc3QoKTtcblxuICAgIC8vIENoZWNrcyBpZiB0aGlzIHNjcmlwdCBpcyBydW5uaW5nIGluIGEgZnJhbWVcbiAgICBpZiAodG9wICE9IHNlbGYpIHtcbiAgICAgICAgaXNGcmFtZSA9IHRydWU7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU2FmYXJpIDEwIGZpeGVkIGl0LCBDaHJvbWUgZml4ZWQgaXQgaW4gdjQ1OlxuICAgICAqIFRoaXMgZml4ZXMgYSBidWcgd2hlcmUgdGhlIGFyZWFzIGxlZnQgYW5kIHJpZ2h0IHRvIFxuICAgICAqIHRoZSBjb250ZW50IGRvZXMgbm90IHRyaWdnZXIgdGhlIG9ubW91c2V3aGVlbCBldmVudFxuICAgICAqIG9uIHNvbWUgcGFnZXMuIGUuZy46IGh0bWwsIGJvZHkgeyBoZWlnaHQ6IDEwMCUgfVxuICAgICAqL1xuICAgIGVsc2UgaWYgKGlzT2xkU2FmYXJpICYmXG4gICAgICAgICAgICAgc2Nyb2xsSGVpZ2h0ID4gd2luZG93SGVpZ2h0ICYmXG4gICAgICAgICAgICAoYm9keS5vZmZzZXRIZWlnaHQgPD0gd2luZG93SGVpZ2h0IHx8IFxuICAgICAgICAgICAgIGh0bWwub2Zmc2V0SGVpZ2h0IDw9IHdpbmRvd0hlaWdodCkpIHtcblxuICAgICAgICB2YXIgZnVsbFBhZ2VFbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGZ1bGxQYWdlRWxlbS5zdHlsZS5jc3NUZXh0ID0gJ3Bvc2l0aW9uOmFic29sdXRlOyB6LWluZGV4Oi0xMDAwMDsgJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3RvcDowOyBsZWZ0OjA7IHJpZ2h0OjA7IGhlaWdodDonICsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvb3Quc2Nyb2xsSGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChmdWxsUGFnZUVsZW0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRE9NIGNoYW5nZWQgKHRocm90dGxlZCkgdG8gZml4IGhlaWdodFxuICAgICAgICB2YXIgcGVuZGluZ1JlZnJlc2g7XG4gICAgICAgIHJlZnJlc2hTaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHBlbmRpbmdSZWZyZXNoKSByZXR1cm47IC8vIGNvdWxkIGFsc28gYmU6IGNsZWFyVGltZW91dChwZW5kaW5nUmVmcmVzaCk7XG4gICAgICAgICAgICBwZW5kaW5nUmVmcmVzaCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChpc0V4Y2x1ZGVkKSByZXR1cm47IC8vIGNvdWxkIGJlIHJ1bm5pbmcgYWZ0ZXIgY2xlYW51cFxuICAgICAgICAgICAgICAgIGZ1bGxQYWdlRWxlbS5zdHlsZS5oZWlnaHQgPSAnMCc7XG4gICAgICAgICAgICAgICAgZnVsbFBhZ2VFbGVtLnN0eWxlLmhlaWdodCA9IHJvb3Quc2Nyb2xsSGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgICAgICAgICBwZW5kaW5nUmVmcmVzaCA9IG51bGw7XG4gICAgICAgICAgICB9LCA1MDApOyAvLyBhY3QgcmFyZWx5IHRvIHN0YXkgZmFzdFxuICAgICAgICB9O1xuICBcbiAgICAgICAgc2V0VGltZW91dChyZWZyZXNoU2l6ZSwgMTApO1xuXG4gICAgICAgIGFkZEV2ZW50KCdyZXNpemUnLCByZWZyZXNoU2l6ZSk7XG5cbiAgICAgICAgLy8gVE9ETzogYXR0cmlidXRlRmlsdGVyP1xuICAgICAgICB2YXIgY29uZmlnID0ge1xuICAgICAgICAgICAgYXR0cmlidXRlczogdHJ1ZSwgXG4gICAgICAgICAgICBjaGlsZExpc3Q6IHRydWUsIFxuICAgICAgICAgICAgY2hhcmFjdGVyRGF0YTogZmFsc2UgXG4gICAgICAgICAgICAvLyBzdWJ0cmVlOiB0cnVlXG4gICAgICAgIH07XG5cbiAgICAgICAgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihyZWZyZXNoU2l6ZSk7XG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoYm9keSwgY29uZmlnKTtcblxuICAgICAgICBpZiAocm9vdC5vZmZzZXRIZWlnaHQgPD0gd2luZG93SGVpZ2h0KSB7XG4gICAgICAgICAgICB2YXIgY2xlYXJmaXggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTsgICBcbiAgICAgICAgICAgIGNsZWFyZml4LnN0eWxlLmNsZWFyID0gJ2JvdGgnO1xuICAgICAgICAgICAgYm9keS5hcHBlbmRDaGlsZChjbGVhcmZpeCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkaXNhYmxlIGZpeGVkIGJhY2tncm91bmRcbiAgICBpZiAoIW9wdGlvbnMuZml4ZWRCYWNrZ3JvdW5kICYmICFpc0V4Y2x1ZGVkKSB7XG4gICAgICAgIGJvZHkuc3R5bGUuYmFja2dyb3VuZEF0dGFjaG1lbnQgPSAnc2Nyb2xsJztcbiAgICAgICAgaHRtbC5zdHlsZS5iYWNrZ3JvdW5kQXR0YWNobWVudCA9ICdzY3JvbGwnO1xuICAgIH1cbn1cblxuLyoqXG4gKiBSZW1vdmVzIGV2ZW50IGxpc3RlbmVycyBhbmQgb3RoZXIgdHJhY2VzIGxlZnQgb24gdGhlIHBhZ2UuXG4gKi9cbmZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgb2JzZXJ2ZXIgJiYgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgIHJlbW92ZUV2ZW50KHdoZWVsRXZlbnQsIHdoZWVsKTtcbiAgICByZW1vdmVFdmVudCgnbW91c2Vkb3duJywgbW91c2Vkb3duKTtcbiAgICByZW1vdmVFdmVudCgna2V5ZG93bicsIGtleWRvd24pO1xuICAgIHJlbW92ZUV2ZW50KCdyZXNpemUnLCByZWZyZXNoU2l6ZSk7XG4gICAgcmVtb3ZlRXZlbnQoJ2xvYWQnLCBpbml0KTtcbn1cblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBTQ1JPTExJTkcgXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuIFxudmFyIHF1ZSA9IFtdO1xudmFyIHBlbmRpbmcgPSBmYWxzZTtcbnZhciBsYXN0U2Nyb2xsID0gRGF0ZS5ub3coKTtcblxuLyoqXG4gKiBQdXNoZXMgc2Nyb2xsIGFjdGlvbnMgdG8gdGhlIHNjcm9sbGluZyBxdWV1ZS5cbiAqL1xuZnVuY3Rpb24gc2Nyb2xsQXJyYXkoZWxlbSwgbGVmdCwgdG9wKSB7XG4gICAgXG4gICAgZGlyZWN0aW9uQ2hlY2sobGVmdCwgdG9wKTtcblxuICAgIGlmIChvcHRpb25zLmFjY2VsZXJhdGlvbk1heCAhPSAxKSB7XG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgZWxhcHNlZCA9IG5vdyAtIGxhc3RTY3JvbGw7XG4gICAgICAgIGlmIChlbGFwc2VkIDwgb3B0aW9ucy5hY2NlbGVyYXRpb25EZWx0YSkge1xuICAgICAgICAgICAgdmFyIGZhY3RvciA9ICgxICsgKDUwIC8gZWxhcHNlZCkpIC8gMjtcbiAgICAgICAgICAgIGlmIChmYWN0b3IgPiAxKSB7XG4gICAgICAgICAgICAgICAgZmFjdG9yID0gTWF0aC5taW4oZmFjdG9yLCBvcHRpb25zLmFjY2VsZXJhdGlvbk1heCk7XG4gICAgICAgICAgICAgICAgbGVmdCAqPSBmYWN0b3I7XG4gICAgICAgICAgICAgICAgdG9wICAqPSBmYWN0b3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGFzdFNjcm9sbCA9IERhdGUubm93KCk7XG4gICAgfSAgICAgICAgICBcbiAgICBcbiAgICAvLyBwdXNoIGEgc2Nyb2xsIGNvbW1hbmRcbiAgICBxdWUucHVzaCh7XG4gICAgICAgIHg6IGxlZnQsIFxuICAgICAgICB5OiB0b3AsIFxuICAgICAgICBsYXN0WDogKGxlZnQgPCAwKSA/IDAuOTkgOiAtMC45OSxcbiAgICAgICAgbGFzdFk6ICh0b3AgIDwgMCkgPyAwLjk5IDogLTAuOTksIFxuICAgICAgICBzdGFydDogRGF0ZS5ub3coKVxuICAgIH0pO1xuICAgICAgICBcbiAgICAvLyBkb24ndCBhY3QgaWYgdGhlcmUncyBhIHBlbmRpbmcgcXVldWVcbiAgICBpZiAocGVuZGluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfSAgXG5cbiAgICB2YXIgc2Nyb2xsV2luZG93ID0gKGVsZW0gPT09IGRvY3VtZW50LmJvZHkpO1xuICAgIFxuICAgIHZhciBzdGVwID0gZnVuY3Rpb24gKHRpbWUpIHtcbiAgICAgICAgXG4gICAgICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgICAgICB2YXIgc2Nyb2xsWCA9IDA7XG4gICAgICAgIHZhciBzY3JvbGxZID0gMDsgXG4gICAgXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBpdGVtID0gcXVlW2ldO1xuICAgICAgICAgICAgdmFyIGVsYXBzZWQgID0gbm93IC0gaXRlbS5zdGFydDtcbiAgICAgICAgICAgIHZhciBmaW5pc2hlZCA9IChlbGFwc2VkID49IG9wdGlvbnMuYW5pbWF0aW9uVGltZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIHNjcm9sbCBwb3NpdGlvbjogWzAsIDFdXG4gICAgICAgICAgICB2YXIgcG9zaXRpb24gPSAoZmluaXNoZWQpID8gMSA6IGVsYXBzZWQgLyBvcHRpb25zLmFuaW1hdGlvblRpbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIGVhc2luZyBbb3B0aW9uYWxdXG4gICAgICAgICAgICBpZiAob3B0aW9ucy5wdWxzZUFsZ29yaXRobSkge1xuICAgICAgICAgICAgICAgIHBvc2l0aW9uID0gcHVsc2UocG9zaXRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBvbmx5IG5lZWQgdGhlIGRpZmZlcmVuY2VcbiAgICAgICAgICAgIHZhciB4ID0gKGl0ZW0ueCAqIHBvc2l0aW9uIC0gaXRlbS5sYXN0WCkgPj4gMDtcbiAgICAgICAgICAgIHZhciB5ID0gKGl0ZW0ueSAqIHBvc2l0aW9uIC0gaXRlbS5sYXN0WSkgPj4gMDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gYWRkIHRoaXMgdG8gdGhlIHRvdGFsIHNjcm9sbGluZ1xuICAgICAgICAgICAgc2Nyb2xsWCArPSB4O1xuICAgICAgICAgICAgc2Nyb2xsWSArPSB5OyAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyB1cGRhdGUgbGFzdCB2YWx1ZXNcbiAgICAgICAgICAgIGl0ZW0ubGFzdFggKz0geDtcbiAgICAgICAgICAgIGl0ZW0ubGFzdFkgKz0geTtcbiAgICAgICAgXG4gICAgICAgICAgICAvLyBkZWxldGUgYW5kIHN0ZXAgYmFjayBpZiBpdCdzIG92ZXJcbiAgICAgICAgICAgIGlmIChmaW5pc2hlZCkge1xuICAgICAgICAgICAgICAgIHF1ZS5zcGxpY2UoaSwgMSk7IGktLTtcbiAgICAgICAgICAgIH0gICAgICAgICAgIFxuICAgICAgICB9XG5cbiAgICAgICAgLy8gc2Nyb2xsIGxlZnQgYW5kIHRvcFxuICAgICAgICBpZiAoc2Nyb2xsV2luZG93KSB7XG4gICAgICAgICAgICB3aW5kb3cuc2Nyb2xsQnkoc2Nyb2xsWCwgc2Nyb2xsWSk7XG4gICAgICAgIH0gXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYgKHNjcm9sbFgpIGVsZW0uc2Nyb2xsTGVmdCArPSBzY3JvbGxYO1xuICAgICAgICAgICAgaWYgKHNjcm9sbFkpIGVsZW0uc2Nyb2xsVG9wICArPSBzY3JvbGxZOyAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGNsZWFuIHVwIGlmIHRoZXJlJ3Mgbm90aGluZyBsZWZ0IHRvIGRvXG4gICAgICAgIGlmICghbGVmdCAmJiAhdG9wKSB7XG4gICAgICAgICAgICBxdWUgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKHF1ZS5sZW5ndGgpIHsgXG4gICAgICAgICAgICByZXF1ZXN0RnJhbWUoc3RlcCwgZWxlbSwgKDEwMDAgLyBvcHRpb25zLmZyYW1lUmF0ZSArIDEpKTsgXG4gICAgICAgIH0gZWxzZSB7IFxuICAgICAgICAgICAgcGVuZGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICAvLyBzdGFydCBhIG5ldyBxdWV1ZSBvZiBhY3Rpb25zXG4gICAgcmVxdWVzdEZyYW1lKHN0ZXAsIGVsZW0sIDApO1xuICAgIHBlbmRpbmcgPSB0cnVlO1xufVxuXG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogRVZFTlRTXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8qKlxuICogTW91c2Ugd2hlZWwgaGFuZGxlci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBldmVudFxuICovXG5mdW5jdGlvbiB3aGVlbChldmVudCkge1xuXG4gICAgaWYgKCFpbml0RG9uZSkge1xuICAgICAgICBpbml0KCk7XG4gICAgfVxuICAgIFxuICAgIHZhciB0YXJnZXQgPSBldmVudC50YXJnZXQ7XG5cbiAgICAvLyBsZWF2ZSBlYXJseSBpZiBkZWZhdWx0IGFjdGlvbiBpcyBwcmV2ZW50ZWQgICBcbiAgICAvLyBvciBpdCdzIGEgem9vbWluZyBldmVudCB3aXRoIENUUkwgXG4gICAgaWYgKGV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQgfHwgZXZlbnQuY3RybEtleSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLy8gbGVhdmUgZW1iZWRkZWQgY29udGVudCBhbG9uZSAoZmxhc2ggJiBwZGYpXG4gICAgaWYgKGlzTm9kZU5hbWUoYWN0aXZlRWxlbWVudCwgJ2VtYmVkJykgfHwgXG4gICAgICAgKGlzTm9kZU5hbWUodGFyZ2V0LCAnZW1iZWQnKSAmJiAvXFwucGRmL2kudGVzdCh0YXJnZXQuc3JjKSkgfHxcbiAgICAgICAgaXNOb2RlTmFtZShhY3RpdmVFbGVtZW50LCAnb2JqZWN0JykgfHxcbiAgICAgICAgdGFyZ2V0LnNoYWRvd1Jvb3QpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgdmFyIGRlbHRhWCA9IC1ldmVudC53aGVlbERlbHRhWCB8fCBldmVudC5kZWx0YVggfHwgMDtcbiAgICB2YXIgZGVsdGFZID0gLWV2ZW50LndoZWVsRGVsdGFZIHx8IGV2ZW50LmRlbHRhWSB8fCAwO1xuICAgIFxuICAgIGlmIChpc01hYykge1xuICAgICAgICBpZiAoZXZlbnQud2hlZWxEZWx0YVggJiYgaXNEaXZpc2libGUoZXZlbnQud2hlZWxEZWx0YVgsIDEyMCkpIHtcbiAgICAgICAgICAgIGRlbHRhWCA9IC0xMjAgKiAoZXZlbnQud2hlZWxEZWx0YVggLyBNYXRoLmFicyhldmVudC53aGVlbERlbHRhWCkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChldmVudC53aGVlbERlbHRhWSAmJiBpc0RpdmlzaWJsZShldmVudC53aGVlbERlbHRhWSwgMTIwKSkge1xuICAgICAgICAgICAgZGVsdGFZID0gLTEyMCAqIChldmVudC53aGVlbERlbHRhWSAvIE1hdGguYWJzKGV2ZW50LndoZWVsRGVsdGFZKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLy8gdXNlIHdoZWVsRGVsdGEgaWYgZGVsdGFYL1kgaXMgbm90IGF2YWlsYWJsZVxuICAgIGlmICghZGVsdGFYICYmICFkZWx0YVkpIHtcbiAgICAgICAgZGVsdGFZID0gLWV2ZW50LndoZWVsRGVsdGEgfHwgMDtcbiAgICB9XG5cbiAgICAvLyBsaW5lIGJhc2VkIHNjcm9sbGluZyAoRmlyZWZveCBtb3N0bHkpXG4gICAgaWYgKGV2ZW50LmRlbHRhTW9kZSA9PT0gMSkge1xuICAgICAgICBkZWx0YVggKj0gNDA7XG4gICAgICAgIGRlbHRhWSAqPSA0MDtcbiAgICB9XG5cbiAgICB2YXIgb3ZlcmZsb3dpbmcgPSBvdmVyZmxvd2luZ0FuY2VzdG9yKHRhcmdldCk7XG5cbiAgICAvLyBub3RoaW5nIHRvIGRvIGlmIHRoZXJlJ3Mgbm8gZWxlbWVudCB0aGF0J3Mgc2Nyb2xsYWJsZVxuICAgIGlmICghb3ZlcmZsb3dpbmcpIHtcbiAgICAgICAgLy8gZXhjZXB0IENocm9tZSBpZnJhbWVzIHNlZW0gdG8gZWF0IHdoZWVsIGV2ZW50cywgd2hpY2ggd2UgbmVlZCB0byBcbiAgICAgICAgLy8gcHJvcGFnYXRlIHVwLCBpZiB0aGUgaWZyYW1lIGhhcyBub3RoaW5nIG92ZXJmbG93aW5nIHRvIHNjcm9sbFxuICAgICAgICBpZiAoaXNGcmFtZSAmJiBpc0Nocm9tZSkgIHtcbiAgICAgICAgICAgIC8vIGNoYW5nZSB0YXJnZXQgdG8gaWZyYW1lIGVsZW1lbnQgaXRzZWxmIGZvciB0aGUgcGFyZW50IGZyYW1lXG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXZlbnQsIFwidGFyZ2V0XCIsIHt2YWx1ZTogd2luZG93LmZyYW1lRWxlbWVudH0pO1xuICAgICAgICAgICAgcmV0dXJuIHBhcmVudC53aGVlbChldmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIFxuICAgIC8vIGNoZWNrIGlmIGl0J3MgYSB0b3VjaHBhZCBzY3JvbGwgdGhhdCBzaG91bGQgYmUgaWdub3JlZFxuICAgIGlmIChpc1RvdWNocGFkKGRlbHRhWSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gc2NhbGUgYnkgc3RlcCBzaXplXG4gICAgLy8gZGVsdGEgaXMgMTIwIG1vc3Qgb2YgdGhlIHRpbWVcbiAgICAvLyBzeW5hcHRpY3Mgc2VlbXMgdG8gc2VuZCAxIHNvbWV0aW1lc1xuICAgIGlmIChNYXRoLmFicyhkZWx0YVgpID4gMS4yKSB7XG4gICAgICAgIGRlbHRhWCAqPSBvcHRpb25zLnN0ZXBTaXplIC8gMTIwO1xuICAgIH1cbiAgICBpZiAoTWF0aC5hYnMoZGVsdGFZKSA+IDEuMikge1xuICAgICAgICBkZWx0YVkgKj0gb3B0aW9ucy5zdGVwU2l6ZSAvIDEyMDtcbiAgICB9XG4gICAgXG4gICAgc2Nyb2xsQXJyYXkob3ZlcmZsb3dpbmcsIGRlbHRhWCwgZGVsdGFZKTtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHNjaGVkdWxlQ2xlYXJDYWNoZSgpO1xufVxuXG4vKipcbiAqIEtleWRvd24gZXZlbnQgaGFuZGxlci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBldmVudFxuICovXG5mdW5jdGlvbiBrZXlkb3duKGV2ZW50KSB7XG5cbiAgICB2YXIgdGFyZ2V0ICAgPSBldmVudC50YXJnZXQ7XG4gICAgdmFyIG1vZGlmaWVyID0gZXZlbnQuY3RybEtleSB8fCBldmVudC5hbHRLZXkgfHwgZXZlbnQubWV0YUtleSB8fCBcbiAgICAgICAgICAgICAgICAgIChldmVudC5zaGlmdEtleSAmJiBldmVudC5rZXlDb2RlICE9PSBrZXkuc3BhY2ViYXIpO1xuICAgIFxuICAgIC8vIG91ciBvd24gdHJhY2tlZCBhY3RpdmUgZWxlbWVudCBjb3VsZCd2ZSBiZWVuIHJlbW92ZWQgZnJvbSB0aGUgRE9NXG4gICAgaWYgKCFkb2N1bWVudC5ib2R5LmNvbnRhaW5zKGFjdGl2ZUVsZW1lbnQpKSB7XG4gICAgICAgIGFjdGl2ZUVsZW1lbnQgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50O1xuICAgIH1cblxuICAgIC8vIGRvIG5vdGhpbmcgaWYgdXNlciBpcyBlZGl0aW5nIHRleHRcbiAgICAvLyBvciB1c2luZyBhIG1vZGlmaWVyIGtleSAoZXhjZXB0IHNoaWZ0KVxuICAgIC8vIG9yIGluIGEgZHJvcGRvd25cbiAgICAvLyBvciBpbnNpZGUgaW50ZXJhY3RpdmUgZWxlbWVudHNcbiAgICB2YXIgaW5wdXROb2RlTmFtZXMgPSAvXih0ZXh0YXJlYXxzZWxlY3R8ZW1iZWR8b2JqZWN0KSQvaTtcbiAgICB2YXIgYnV0dG9uVHlwZXMgPSAvXihidXR0b258c3VibWl0fHJhZGlvfGNoZWNrYm94fGZpbGV8Y29sb3J8aW1hZ2UpJC9pO1xuICAgIGlmICggZXZlbnQuZGVmYXVsdFByZXZlbnRlZCB8fFxuICAgICAgICAgaW5wdXROb2RlTmFtZXMudGVzdCh0YXJnZXQubm9kZU5hbWUpIHx8XG4gICAgICAgICBpc05vZGVOYW1lKHRhcmdldCwgJ2lucHV0JykgJiYgIWJ1dHRvblR5cGVzLnRlc3QodGFyZ2V0LnR5cGUpIHx8XG4gICAgICAgICBpc05vZGVOYW1lKGFjdGl2ZUVsZW1lbnQsICd2aWRlbycpIHx8XG4gICAgICAgICBpc0luc2lkZVlvdXR1YmVWaWRlbyhldmVudCkgfHxcbiAgICAgICAgIHRhcmdldC5pc0NvbnRlbnRFZGl0YWJsZSB8fCBcbiAgICAgICAgIG1vZGlmaWVyICkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gW3NwYWNlYmFyXSBzaG91bGQgdHJpZ2dlciBidXR0b24gcHJlc3MsIGxlYXZlIGl0IGFsb25lXG4gICAgaWYgKChpc05vZGVOYW1lKHRhcmdldCwgJ2J1dHRvbicpIHx8XG4gICAgICAgICBpc05vZGVOYW1lKHRhcmdldCwgJ2lucHV0JykgJiYgYnV0dG9uVHlwZXMudGVzdCh0YXJnZXQudHlwZSkpICYmXG4gICAgICAgIGV2ZW50LmtleUNvZGUgPT09IGtleS5zcGFjZWJhcikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gW2FycndvdyBrZXlzXSBvbiByYWRpbyBidXR0b25zIHNob3VsZCBiZSBsZWZ0IGFsb25lXG4gICAgaWYgKGlzTm9kZU5hbWUodGFyZ2V0LCAnaW5wdXQnKSAmJiB0YXJnZXQudHlwZSA9PSAncmFkaW8nICYmXG4gICAgICAgIGFycm93S2V5c1tldmVudC5rZXlDb2RlXSkgIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBcbiAgICB2YXIgc2hpZnQsIHggPSAwLCB5ID0gMDtcbiAgICB2YXIgb3ZlcmZsb3dpbmcgPSBvdmVyZmxvd2luZ0FuY2VzdG9yKGFjdGl2ZUVsZW1lbnQpO1xuXG4gICAgaWYgKCFvdmVyZmxvd2luZykge1xuICAgICAgICAvLyBDaHJvbWUgaWZyYW1lcyBzZWVtIHRvIGVhdCBrZXkgZXZlbnRzLCB3aGljaCB3ZSBuZWVkIHRvIFxuICAgICAgICAvLyBwcm9wYWdhdGUgdXAsIGlmIHRoZSBpZnJhbWUgaGFzIG5vdGhpbmcgb3ZlcmZsb3dpbmcgdG8gc2Nyb2xsXG4gICAgICAgIHJldHVybiAoaXNGcmFtZSAmJiBpc0Nocm9tZSkgPyBwYXJlbnQua2V5ZG93bihldmVudCkgOiB0cnVlO1xuICAgIH1cblxuICAgIHZhciBjbGllbnRIZWlnaHQgPSBvdmVyZmxvd2luZy5jbGllbnRIZWlnaHQ7IFxuXG4gICAgaWYgKG92ZXJmbG93aW5nID09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgY2xpZW50SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICAgIH1cblxuICAgIHN3aXRjaCAoZXZlbnQua2V5Q29kZSkge1xuICAgICAgICBjYXNlIGtleS51cDpcbiAgICAgICAgICAgIHkgPSAtb3B0aW9ucy5hcnJvd1Njcm9sbDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIGtleS5kb3duOlxuICAgICAgICAgICAgeSA9IG9wdGlvbnMuYXJyb3dTY3JvbGw7XG4gICAgICAgICAgICBicmVhazsgICAgICAgICBcbiAgICAgICAgY2FzZSBrZXkuc3BhY2ViYXI6IC8vICgrIHNoaWZ0KVxuICAgICAgICAgICAgc2hpZnQgPSBldmVudC5zaGlmdEtleSA/IDEgOiAtMTtcbiAgICAgICAgICAgIHkgPSAtc2hpZnQgKiBjbGllbnRIZWlnaHQgKiAwLjk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBrZXkucGFnZXVwOlxuICAgICAgICAgICAgeSA9IC1jbGllbnRIZWlnaHQgKiAwLjk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBrZXkucGFnZWRvd246XG4gICAgICAgICAgICB5ID0gY2xpZW50SGVpZ2h0ICogMC45O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2Uga2V5LmhvbWU6XG4gICAgICAgICAgICB5ID0gLW92ZXJmbG93aW5nLnNjcm9sbFRvcDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIGtleS5lbmQ6XG4gICAgICAgICAgICB2YXIgc2Nyb2xsID0gb3ZlcmZsb3dpbmcuc2Nyb2xsSGVpZ2h0IC0gb3ZlcmZsb3dpbmcuc2Nyb2xsVG9wO1xuICAgICAgICAgICAgdmFyIHNjcm9sbFJlbWFpbmluZyA9IHNjcm9sbCAtIGNsaWVudEhlaWdodDtcbiAgICAgICAgICAgIHkgPSAoc2Nyb2xsUmVtYWluaW5nID4gMCkgPyBzY3JvbGxSZW1haW5pbmcgKyAxMCA6IDA7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBrZXkubGVmdDpcbiAgICAgICAgICAgIHggPSAtb3B0aW9ucy5hcnJvd1Njcm9sbDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIGtleS5yaWdodDpcbiAgICAgICAgICAgIHggPSBvcHRpb25zLmFycm93U2Nyb2xsO1xuICAgICAgICAgICAgYnJlYWs7ICAgICAgICAgICAgXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gYSBrZXkgd2UgZG9uJ3QgY2FyZSBhYm91dFxuICAgIH1cblxuICAgIHNjcm9sbEFycmF5KG92ZXJmbG93aW5nLCB4LCB5KTtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHNjaGVkdWxlQ2xlYXJDYWNoZSgpO1xufVxuXG4vKipcbiAqIE1vdXNlZG93biBldmVudCBvbmx5IGZvciB1cGRhdGluZyBhY3RpdmVFbGVtZW50XG4gKi9cbmZ1bmN0aW9uIG1vdXNlZG93bihldmVudCkge1xuICAgIGFjdGl2ZUVsZW1lbnQgPSBldmVudC50YXJnZXQ7XG59XG5cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBPVkVSRkxPV1xuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG52YXIgdW5pcXVlSUQgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBpID0gMDtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIHJldHVybiBlbC51bmlxdWVJRCB8fCAoZWwudW5pcXVlSUQgPSBpKyspO1xuICAgIH07XG59KSgpO1xuXG52YXIgY2FjaGUgPSB7fTsgLy8gY2xlYXJlZCBvdXQgYWZ0ZXIgYSBzY3JvbGxpbmcgc2Vzc2lvblxudmFyIGNsZWFyQ2FjaGVUaW1lcjtcblxuLy9zZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7IGNhY2hlID0ge307IH0sIDEwICogMTAwMCk7XG5cbmZ1bmN0aW9uIHNjaGVkdWxlQ2xlYXJDYWNoZSgpIHtcbiAgICBjbGVhclRpbWVvdXQoY2xlYXJDYWNoZVRpbWVyKTtcbiAgICBjbGVhckNhY2hlVGltZXIgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7IGNhY2hlID0ge307IH0sIDEqMTAwMCk7XG59XG5cbmZ1bmN0aW9uIHNldENhY2hlKGVsZW1zLCBvdmVyZmxvd2luZykge1xuICAgIGZvciAodmFyIGkgPSBlbGVtcy5sZW5ndGg7IGktLTspXG4gICAgICAgIGNhY2hlW3VuaXF1ZUlEKGVsZW1zW2ldKV0gPSBvdmVyZmxvd2luZztcbiAgICByZXR1cm4gb3ZlcmZsb3dpbmc7XG59XG5cbi8vICAoYm9keSkgICAgICAgICAgICAgICAgKHJvb3QpXG4vLyAgICAgICAgIHwgaGlkZGVuIHwgdmlzaWJsZSB8IHNjcm9sbCB8ICBhdXRvICB8XG4vLyBoaWRkZW4gIHwgICBubyAgIHwgICAgbm8gICB8ICAgWUVTICB8ICAgWUVTICB8XG4vLyB2aXNpYmxlIHwgICBubyAgIHwgICBZRVMgICB8ICAgWUVTICB8ICAgWUVTICB8XG4vLyBzY3JvbGwgIHwgICBubyAgIHwgICBZRVMgICB8ICAgWUVTICB8ICAgWUVTICB8XG4vLyBhdXRvICAgIHwgICBubyAgIHwgICBZRVMgICB8ICAgWUVTICB8ICAgWUVTICB8XG5cbmZ1bmN0aW9uIG92ZXJmbG93aW5nQW5jZXN0b3IoZWwpIHtcbiAgICB2YXIgZWxlbXMgPSBbXTtcbiAgICB2YXIgYm9keSA9IGRvY3VtZW50LmJvZHk7XG4gICAgdmFyIHJvb3RTY3JvbGxIZWlnaHQgPSByb290LnNjcm9sbEhlaWdodDtcbiAgICBkbyB7XG4gICAgICAgIHZhciBjYWNoZWQgPSBjYWNoZVt1bmlxdWVJRChlbCldO1xuICAgICAgICBpZiAoY2FjaGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gc2V0Q2FjaGUoZWxlbXMsIGNhY2hlZCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxlbXMucHVzaChlbCk7XG4gICAgICAgIGlmIChyb290U2Nyb2xsSGVpZ2h0ID09PSBlbC5zY3JvbGxIZWlnaHQpIHtcbiAgICAgICAgICAgIHZhciB0b3BPdmVyZmxvd3NOb3RIaWRkZW4gPSBvdmVyZmxvd05vdEhpZGRlbihyb290KSAmJiBvdmVyZmxvd05vdEhpZGRlbihib2R5KTtcbiAgICAgICAgICAgIHZhciBpc092ZXJmbG93Q1NTID0gdG9wT3ZlcmZsb3dzTm90SGlkZGVuIHx8IG92ZXJmbG93QXV0b09yU2Nyb2xsKHJvb3QpO1xuICAgICAgICAgICAgaWYgKGlzRnJhbWUgJiYgaXNDb250ZW50T3ZlcmZsb3dpbmcocm9vdCkgfHwgXG4gICAgICAgICAgICAgICAhaXNGcmFtZSAmJiBpc092ZXJmbG93Q1NTKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNldENhY2hlKGVsZW1zLCBnZXRTY3JvbGxSb290KCkpOyBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChpc0NvbnRlbnRPdmVyZmxvd2luZyhlbCkgJiYgb3ZlcmZsb3dBdXRvT3JTY3JvbGwoZWwpKSB7XG4gICAgICAgICAgICByZXR1cm4gc2V0Q2FjaGUoZWxlbXMsIGVsKTtcbiAgICAgICAgfVxuICAgIH0gd2hpbGUgKGVsID0gZWwucGFyZW50RWxlbWVudCk7XG59XG5cbmZ1bmN0aW9uIGlzQ29udGVudE92ZXJmbG93aW5nKGVsKSB7XG4gICAgcmV0dXJuIChlbC5jbGllbnRIZWlnaHQgKyAxMCA8IGVsLnNjcm9sbEhlaWdodCk7XG59XG5cbi8vIHR5cGljYWxseSBmb3IgPGJvZHk+IGFuZCA8aHRtbD5cbmZ1bmN0aW9uIG92ZXJmbG93Tm90SGlkZGVuKGVsKSB7XG4gICAgdmFyIG92ZXJmbG93ID0gZ2V0Q29tcHV0ZWRTdHlsZShlbCwgJycpLmdldFByb3BlcnR5VmFsdWUoJ292ZXJmbG93LXknKTtcbiAgICByZXR1cm4gKG92ZXJmbG93ICE9PSAnaGlkZGVuJyk7XG59XG5cbi8vIGZvciBhbGwgb3RoZXIgZWxlbWVudHNcbmZ1bmN0aW9uIG92ZXJmbG93QXV0b09yU2Nyb2xsKGVsKSB7XG4gICAgdmFyIG92ZXJmbG93ID0gZ2V0Q29tcHV0ZWRTdHlsZShlbCwgJycpLmdldFByb3BlcnR5VmFsdWUoJ292ZXJmbG93LXknKTtcbiAgICByZXR1cm4gKG92ZXJmbG93ID09PSAnc2Nyb2xsJyB8fCBvdmVyZmxvdyA9PT0gJ2F1dG8nKTtcbn1cblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIEhFTFBFUlNcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuZnVuY3Rpb24gYWRkRXZlbnQodHlwZSwgZm4pIHtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmbiwgZmFsc2UpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVFdmVudCh0eXBlLCBmbikge1xuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGZuLCBmYWxzZSk7ICBcbn1cblxuZnVuY3Rpb24gaXNOb2RlTmFtZShlbCwgdGFnKSB7XG4gICAgcmV0dXJuIChlbC5ub2RlTmFtZXx8JycpLnRvTG93ZXJDYXNlKCkgPT09IHRhZy50b0xvd2VyQ2FzZSgpO1xufVxuXG5mdW5jdGlvbiBkaXJlY3Rpb25DaGVjayh4LCB5KSB7XG4gICAgeCA9ICh4ID4gMCkgPyAxIDogLTE7XG4gICAgeSA9ICh5ID4gMCkgPyAxIDogLTE7XG4gICAgaWYgKGRpcmVjdGlvbi54ICE9PSB4IHx8IGRpcmVjdGlvbi55ICE9PSB5KSB7XG4gICAgICAgIGRpcmVjdGlvbi54ID0geDtcbiAgICAgICAgZGlyZWN0aW9uLnkgPSB5O1xuICAgICAgICBxdWUgPSBbXTtcbiAgICAgICAgbGFzdFNjcm9sbCA9IDA7XG4gICAgfVxufVxuXG52YXIgZGVsdGFCdWZmZXJUaW1lcjtcblxuaWYgKHdpbmRvdy5sb2NhbFN0b3JhZ2UgJiYgbG9jYWxTdG9yYWdlLlNTX2RlbHRhQnVmZmVyKSB7XG4gICAgdHJ5IHsgLy8gIzQ2IFNhZmFyaSB0aHJvd3MgaW4gcHJpdmF0ZSBicm93c2luZyBmb3IgbG9jYWxTdG9yYWdlIFxuICAgICAgICBkZWx0YUJ1ZmZlciA9IGxvY2FsU3RvcmFnZS5TU19kZWx0YUJ1ZmZlci5zcGxpdCgnLCcpO1xuICAgIH0gY2F0Y2ggKGUpIHsgfSBcbn1cblxuZnVuY3Rpb24gaXNUb3VjaHBhZChkZWx0YVkpIHtcbiAgICBpZiAoIWRlbHRhWSkgcmV0dXJuO1xuICAgIGlmICghZGVsdGFCdWZmZXIubGVuZ3RoKSB7XG4gICAgICAgIGRlbHRhQnVmZmVyID0gW2RlbHRhWSwgZGVsdGFZLCBkZWx0YVldO1xuICAgIH1cbiAgICBkZWx0YVkgPSBNYXRoLmFicyhkZWx0YVkpO1xuICAgIGRlbHRhQnVmZmVyLnB1c2goZGVsdGFZKTtcbiAgICBkZWx0YUJ1ZmZlci5zaGlmdCgpO1xuICAgIGNsZWFyVGltZW91dChkZWx0YUJ1ZmZlclRpbWVyKTtcbiAgICBkZWx0YUJ1ZmZlclRpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7IC8vICM0NiBTYWZhcmkgdGhyb3dzIGluIHByaXZhdGUgYnJvd3NpbmcgZm9yIGxvY2FsU3RvcmFnZVxuICAgICAgICAgICAgbG9jYWxTdG9yYWdlLlNTX2RlbHRhQnVmZmVyID0gZGVsdGFCdWZmZXIuam9pbignLCcpO1xuICAgICAgICB9IGNhdGNoIChlKSB7IH0gIFxuICAgIH0sIDEwMDApO1xuICAgIHJldHVybiAhYWxsRGVsdGFzRGl2aXNhYmxlQnkoMTIwKSAmJiAhYWxsRGVsdGFzRGl2aXNhYmxlQnkoMTAwKTtcbn0gXG5cbmZ1bmN0aW9uIGlzRGl2aXNpYmxlKG4sIGRpdmlzb3IpIHtcbiAgICByZXR1cm4gKE1hdGguZmxvb3IobiAvIGRpdmlzb3IpID09IG4gLyBkaXZpc29yKTtcbn1cblxuZnVuY3Rpb24gYWxsRGVsdGFzRGl2aXNhYmxlQnkoZGl2aXNvcikge1xuICAgIHJldHVybiAoaXNEaXZpc2libGUoZGVsdGFCdWZmZXJbMF0sIGRpdmlzb3IpICYmXG4gICAgICAgICAgICBpc0RpdmlzaWJsZShkZWx0YUJ1ZmZlclsxXSwgZGl2aXNvcikgJiZcbiAgICAgICAgICAgIGlzRGl2aXNpYmxlKGRlbHRhQnVmZmVyWzJdLCBkaXZpc29yKSk7XG59XG5cbmZ1bmN0aW9uIGlzSW5zaWRlWW91dHViZVZpZGVvKGV2ZW50KSB7XG4gICAgdmFyIGVsZW0gPSBldmVudC50YXJnZXQ7XG4gICAgdmFyIGlzQ29udHJvbCA9IGZhbHNlO1xuICAgIGlmIChkb2N1bWVudC5VUkwuaW5kZXhPZiAoJ3d3dy55b3V0dWJlLmNvbS93YXRjaCcpICE9IC0xKSB7XG4gICAgICAgIGRvIHtcbiAgICAgICAgICAgIGlzQ29udHJvbCA9IChlbGVtLmNsYXNzTGlzdCAmJiBcbiAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmNsYXNzTGlzdC5jb250YWlucygnaHRtbDUtdmlkZW8tY29udHJvbHMnKSk7XG4gICAgICAgICAgICBpZiAoaXNDb250cm9sKSBicmVhaztcbiAgICAgICAgfSB3aGlsZSAoZWxlbSA9IGVsZW0ucGFyZW50Tm9kZSk7XG4gICAgfVxuICAgIHJldHVybiBpc0NvbnRyb2w7XG59XG5cbnZhciByZXF1ZXN0RnJhbWUgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuICh3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lICAgICAgIHx8IFxuICAgICAgICAgICAgICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IFxuICAgICAgICAgICAgICB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lICAgIHx8XG4gICAgICAgICAgICAgIGZ1bmN0aW9uIChjYWxsYmFjaywgZWxlbWVudCwgZGVsYXkpIHtcbiAgICAgICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoY2FsbGJhY2ssIGRlbGF5IHx8ICgxMDAwLzYwKSk7XG4gICAgICAgICAgICAgfSk7XG59KSgpO1xuXG52YXIgTXV0YXRpb25PYnNlcnZlciA9ICh3aW5kb3cuTXV0YXRpb25PYnNlcnZlciB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5XZWJLaXRNdXRhdGlvbk9ic2VydmVyIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuTW96TXV0YXRpb25PYnNlcnZlcik7ICBcblxudmFyIGdldFNjcm9sbFJvb3QgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBTQ1JPTExfUk9PVDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGlmICghU0NST0xMX1JPT1QpIHtcbiAgICAgIHZhciBkdW1teSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgZHVtbXkuc3R5bGUuY3NzVGV4dCA9ICdoZWlnaHQ6MTAwMDBweDt3aWR0aDoxcHg7JztcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZHVtbXkpO1xuICAgICAgdmFyIGJvZHlTY3JvbGxUb3AgID0gZG9jdW1lbnQuYm9keS5zY3JvbGxUb3A7XG4gICAgICB2YXIgZG9jRWxTY3JvbGxUb3AgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wO1xuICAgICAgd2luZG93LnNjcm9sbEJ5KDAsIDMpO1xuICAgICAgaWYgKGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wICE9IGJvZHlTY3JvbGxUb3ApXG4gICAgICAgIChTQ1JPTExfUk9PVCA9IGRvY3VtZW50LmJvZHkpO1xuICAgICAgZWxzZSBcbiAgICAgICAgKFNDUk9MTF9ST09UID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KTtcbiAgICAgIHdpbmRvdy5zY3JvbGxCeSgwLCAtMyk7XG4gICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGR1bW15KTtcbiAgICB9XG4gICAgcmV0dXJuIFNDUk9MTF9ST09UO1xuICB9O1xufSkoKTtcblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIFBVTFNFIChieSBNaWNoYWVsIEhlcmYpXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG4gXG4vKipcbiAqIFZpc2NvdXMgZmx1aWQgd2l0aCBhIHB1bHNlIGZvciBwYXJ0IGFuZCBkZWNheSBmb3IgdGhlIHJlc3QuXG4gKiAtIEFwcGxpZXMgYSBmaXhlZCBmb3JjZSBvdmVyIGFuIGludGVydmFsIChhIGRhbXBlZCBhY2NlbGVyYXRpb24pLCBhbmRcbiAqIC0gTGV0cyB0aGUgZXhwb25lbnRpYWwgYmxlZWQgYXdheSB0aGUgdmVsb2NpdHkgb3ZlciBhIGxvbmdlciBpbnRlcnZhbFxuICogLSBNaWNoYWVsIEhlcmYsIGh0dHA6Ly9zdGVyZW9wc2lzLmNvbS9zdG9wcGluZy9cbiAqL1xuZnVuY3Rpb24gcHVsc2VfKHgpIHtcbiAgICB2YXIgdmFsLCBzdGFydCwgZXhweDtcbiAgICAvLyB0ZXN0XG4gICAgeCA9IHggKiBvcHRpb25zLnB1bHNlU2NhbGU7XG4gICAgaWYgKHggPCAxKSB7IC8vIGFjY2VsZWFydGlvblxuICAgICAgICB2YWwgPSB4IC0gKDEgLSBNYXRoLmV4cCgteCkpO1xuICAgIH0gZWxzZSB7ICAgICAvLyB0YWlsXG4gICAgICAgIC8vIHRoZSBwcmV2aW91cyBhbmltYXRpb24gZW5kZWQgaGVyZTpcbiAgICAgICAgc3RhcnQgPSBNYXRoLmV4cCgtMSk7XG4gICAgICAgIC8vIHNpbXBsZSB2aXNjb3VzIGRyYWdcbiAgICAgICAgeCAtPSAxO1xuICAgICAgICBleHB4ID0gMSAtIE1hdGguZXhwKC14KTtcbiAgICAgICAgdmFsID0gc3RhcnQgKyAoZXhweCAqICgxIC0gc3RhcnQpKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbCAqIG9wdGlvbnMucHVsc2VOb3JtYWxpemU7XG59XG5cbmZ1bmN0aW9uIHB1bHNlKHgpIHtcbiAgICBpZiAoeCA+PSAxKSByZXR1cm4gMTtcbiAgICBpZiAoeCA8PSAwKSByZXR1cm4gMDtcblxuICAgIGlmIChvcHRpb25zLnB1bHNlTm9ybWFsaXplID09IDEpIHtcbiAgICAgICAgb3B0aW9ucy5wdWxzZU5vcm1hbGl6ZSAvPSBwdWxzZV8oMSk7XG4gICAgfVxuICAgIHJldHVybiBwdWxzZV8oeCk7XG59XG5cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBGSVJTVCBSVU5cbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxudmFyIHVzZXJBZ2VudCA9IHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50O1xudmFyIGlzRWRnZSAgICA9IC9FZGdlLy50ZXN0KHVzZXJBZ2VudCk7IC8vIHRoYW5rIHlvdSBNU1xudmFyIGlzQ2hyb21lICA9IC9jaHJvbWUvaS50ZXN0KHVzZXJBZ2VudCkgJiYgIWlzRWRnZTsgXG52YXIgaXNTYWZhcmkgID0gL3NhZmFyaS9pLnRlc3QodXNlckFnZW50KSAmJiAhaXNFZGdlOyBcbnZhciBpc01vYmlsZSAgPSAvbW9iaWxlL2kudGVzdCh1c2VyQWdlbnQpO1xudmFyIGlzSUVXaW43ICA9IC9XaW5kb3dzIE5UIDYuMS9pLnRlc3QodXNlckFnZW50KSAmJiAvcnY6MTEvaS50ZXN0KHVzZXJBZ2VudCk7XG52YXIgaXNPbGRTYWZhcmkgPSBpc1NhZmFyaSAmJiAoL1ZlcnNpb25cXC84L2kudGVzdCh1c2VyQWdlbnQpIHx8IC9WZXJzaW9uXFwvOS9pLnRlc3QodXNlckFnZW50KSk7XG52YXIgaXNFbmFibGVkRm9yQnJvd3NlciA9IChpc0Nocm9tZSB8fCBpc1NhZmFyaSB8fCBpc0lFV2luNykgJiYgIWlzTW9iaWxlO1xuXG52YXIgd2hlZWxFdmVudDtcbmlmICgnb253aGVlbCcgaW4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpXG4gICAgd2hlZWxFdmVudCA9ICd3aGVlbCc7XG5lbHNlIGlmICgnb25tb3VzZXdoZWVsJyBpbiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSlcbiAgICB3aGVlbEV2ZW50ID0gJ21vdXNld2hlZWwnO1xuXG5pZiAod2hlZWxFdmVudCAmJiBpc0VuYWJsZWRGb3JCcm93c2VyKSB7XG4gICAgYWRkRXZlbnQod2hlZWxFdmVudCwgd2hlZWwpO1xuICAgIGFkZEV2ZW50KCdtb3VzZWRvd24nLCBtb3VzZWRvd24pO1xuICAgIGFkZEV2ZW50KCdsb2FkJywgaW5pdCk7XG59XG5cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBQVUJMSUMgSU5URVJGQUNFXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmZ1bmN0aW9uIFNtb290aFNjcm9sbChvcHRpb25zVG9TZXQpIHtcbiAgICBmb3IgKHZhciBrZXkgaW4gb3B0aW9uc1RvU2V0KVxuICAgICAgICBpZiAoZGVmYXVsdE9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSkgXG4gICAgICAgICAgICBvcHRpb25zW2tleV0gPSBvcHRpb25zVG9TZXRba2V5XTtcbn1cblNtb290aFNjcm9sbC5kZXN0cm95ID0gY2xlYW51cDtcblxuaWYgKHdpbmRvdy5TbW9vdGhTY3JvbGxPcHRpb25zKSAvLyBhc3luYyBBUElcbiAgICBTbW9vdGhTY3JvbGwod2luZG93LlNtb290aFNjcm9sbE9wdGlvbnMpO1xuXG5pZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKVxuICAgIGRlZmluZShmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFNtb290aFNjcm9sbDtcbiAgICB9KTtcbmVsc2UgaWYgKCdvYmplY3QnID09IHR5cGVvZiBleHBvcnRzKVxuICAgIG1vZHVsZS5leHBvcnRzID0gU21vb3RoU2Nyb2xsO1xuZWxzZVxuICAgIHdpbmRvdy5TbW9vdGhTY3JvbGwgPSBTbW9vdGhTY3JvbGw7XG5cbn0pKCk7XG4iLCIvKiEgalF1ZXJ5IHYzLjIuMSB8IChjKSBKUyBGb3VuZGF0aW9uIGFuZCBvdGhlciBjb250cmlidXRvcnMgfCBqcXVlcnkub3JnL2xpY2Vuc2UgKi9cbiFmdW5jdGlvbihhLGIpe1widXNlIHN0cmljdFwiO1wib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUmJlwib2JqZWN0XCI9PXR5cGVvZiBtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1hLmRvY3VtZW50P2IoYSwhMCk6ZnVuY3Rpb24oYSl7aWYoIWEuZG9jdW1lbnQpdGhyb3cgbmV3IEVycm9yKFwialF1ZXJ5IHJlcXVpcmVzIGEgd2luZG93IHdpdGggYSBkb2N1bWVudFwiKTtyZXR1cm4gYihhKX06YihhKX0oXCJ1bmRlZmluZWRcIiE9dHlwZW9mIHdpbmRvdz93aW5kb3c6dGhpcyxmdW5jdGlvbihhLGIpe1widXNlIHN0cmljdFwiO3ZhciBjPVtdLGQ9YS5kb2N1bWVudCxlPU9iamVjdC5nZXRQcm90b3R5cGVPZixmPWMuc2xpY2UsZz1jLmNvbmNhdCxoPWMucHVzaCxpPWMuaW5kZXhPZixqPXt9LGs9ai50b1N0cmluZyxsPWouaGFzT3duUHJvcGVydHksbT1sLnRvU3RyaW5nLG49bS5jYWxsKE9iamVjdCksbz17fTtmdW5jdGlvbiBwKGEsYil7Yj1ifHxkO3ZhciBjPWIuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtjLnRleHQ9YSxiLmhlYWQuYXBwZW5kQ2hpbGQoYykucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChjKX12YXIgcT1cIjMuMi4xXCIscj1mdW5jdGlvbihhLGIpe3JldHVybiBuZXcgci5mbi5pbml0KGEsYil9LHM9L15bXFxzXFx1RkVGRlxceEEwXSt8W1xcc1xcdUZFRkZcXHhBMF0rJC9nLHQ9L14tbXMtLyx1PS8tKFthLXpdKS9nLHY9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYi50b1VwcGVyQ2FzZSgpfTtyLmZuPXIucHJvdG90eXBlPXtqcXVlcnk6cSxjb25zdHJ1Y3RvcjpyLGxlbmd0aDowLHRvQXJyYXk6ZnVuY3Rpb24oKXtyZXR1cm4gZi5jYWxsKHRoaXMpfSxnZXQ6ZnVuY3Rpb24oYSl7cmV0dXJuIG51bGw9PWE/Zi5jYWxsKHRoaXMpOmE8MD90aGlzW2ErdGhpcy5sZW5ndGhdOnRoaXNbYV19LHB1c2hTdGFjazpmdW5jdGlvbihhKXt2YXIgYj1yLm1lcmdlKHRoaXMuY29uc3RydWN0b3IoKSxhKTtyZXR1cm4gYi5wcmV2T2JqZWN0PXRoaXMsYn0sZWFjaDpmdW5jdGlvbihhKXtyZXR1cm4gci5lYWNoKHRoaXMsYSl9LG1hcDpmdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5wdXNoU3RhY2soci5tYXAodGhpcyxmdW5jdGlvbihiLGMpe3JldHVybiBhLmNhbGwoYixjLGIpfSkpfSxzbGljZTpmdW5jdGlvbigpe3JldHVybiB0aGlzLnB1c2hTdGFjayhmLmFwcGx5KHRoaXMsYXJndW1lbnRzKSl9LGZpcnN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuZXEoMCl9LGxhc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5lcSgtMSl9LGVxOmZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMubGVuZ3RoLGM9K2ErKGE8MD9iOjApO3JldHVybiB0aGlzLnB1c2hTdGFjayhjPj0wJiZjPGI/W3RoaXNbY11dOltdKX0sZW5kOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMucHJldk9iamVjdHx8dGhpcy5jb25zdHJ1Y3RvcigpfSxwdXNoOmgsc29ydDpjLnNvcnQsc3BsaWNlOmMuc3BsaWNlfSxyLmV4dGVuZD1yLmZuLmV4dGVuZD1mdW5jdGlvbigpe3ZhciBhLGIsYyxkLGUsZixnPWFyZ3VtZW50c1swXXx8e30saD0xLGk9YXJndW1lbnRzLmxlbmd0aCxqPSExO2ZvcihcImJvb2xlYW5cIj09dHlwZW9mIGcmJihqPWcsZz1hcmd1bWVudHNbaF18fHt9LGgrKyksXCJvYmplY3RcIj09dHlwZW9mIGd8fHIuaXNGdW5jdGlvbihnKXx8KGc9e30pLGg9PT1pJiYoZz10aGlzLGgtLSk7aDxpO2grKylpZihudWxsIT0oYT1hcmd1bWVudHNbaF0pKWZvcihiIGluIGEpYz1nW2JdLGQ9YVtiXSxnIT09ZCYmKGomJmQmJihyLmlzUGxhaW5PYmplY3QoZCl8fChlPUFycmF5LmlzQXJyYXkoZCkpKT8oZT8oZT0hMSxmPWMmJkFycmF5LmlzQXJyYXkoYyk/YzpbXSk6Zj1jJiZyLmlzUGxhaW5PYmplY3QoYyk/Yzp7fSxnW2JdPXIuZXh0ZW5kKGosZixkKSk6dm9pZCAwIT09ZCYmKGdbYl09ZCkpO3JldHVybiBnfSxyLmV4dGVuZCh7ZXhwYW5kbzpcImpRdWVyeVwiKyhxK01hdGgucmFuZG9tKCkpLnJlcGxhY2UoL1xcRC9nLFwiXCIpLGlzUmVhZHk6ITAsZXJyb3I6ZnVuY3Rpb24oYSl7dGhyb3cgbmV3IEVycm9yKGEpfSxub29wOmZ1bmN0aW9uKCl7fSxpc0Z1bmN0aW9uOmZ1bmN0aW9uKGEpe3JldHVyblwiZnVuY3Rpb25cIj09PXIudHlwZShhKX0saXNXaW5kb3c6ZnVuY3Rpb24oYSl7cmV0dXJuIG51bGwhPWEmJmE9PT1hLndpbmRvd30saXNOdW1lcmljOmZ1bmN0aW9uKGEpe3ZhciBiPXIudHlwZShhKTtyZXR1cm4oXCJudW1iZXJcIj09PWJ8fFwic3RyaW5nXCI9PT1iKSYmIWlzTmFOKGEtcGFyc2VGbG9hdChhKSl9LGlzUGxhaW5PYmplY3Q6ZnVuY3Rpb24oYSl7dmFyIGIsYztyZXR1cm4hKCFhfHxcIltvYmplY3QgT2JqZWN0XVwiIT09ay5jYWxsKGEpKSYmKCEoYj1lKGEpKXx8KGM9bC5jYWxsKGIsXCJjb25zdHJ1Y3RvclwiKSYmYi5jb25zdHJ1Y3RvcixcImZ1bmN0aW9uXCI9PXR5cGVvZiBjJiZtLmNhbGwoYyk9PT1uKSl9LGlzRW1wdHlPYmplY3Q6ZnVuY3Rpb24oYSl7dmFyIGI7Zm9yKGIgaW4gYSlyZXR1cm4hMTtyZXR1cm4hMH0sdHlwZTpmdW5jdGlvbihhKXtyZXR1cm4gbnVsbD09YT9hK1wiXCI6XCJvYmplY3RcIj09dHlwZW9mIGF8fFwiZnVuY3Rpb25cIj09dHlwZW9mIGE/altrLmNhbGwoYSldfHxcIm9iamVjdFwiOnR5cGVvZiBhfSxnbG9iYWxFdmFsOmZ1bmN0aW9uKGEpe3AoYSl9LGNhbWVsQ2FzZTpmdW5jdGlvbihhKXtyZXR1cm4gYS5yZXBsYWNlKHQsXCJtcy1cIikucmVwbGFjZSh1LHYpfSxlYWNoOmZ1bmN0aW9uKGEsYil7dmFyIGMsZD0wO2lmKHcoYSkpe2ZvcihjPWEubGVuZ3RoO2Q8YztkKyspaWYoYi5jYWxsKGFbZF0sZCxhW2RdKT09PSExKWJyZWFrfWVsc2UgZm9yKGQgaW4gYSlpZihiLmNhbGwoYVtkXSxkLGFbZF0pPT09ITEpYnJlYWs7cmV0dXJuIGF9LHRyaW06ZnVuY3Rpb24oYSl7cmV0dXJuIG51bGw9PWE/XCJcIjooYStcIlwiKS5yZXBsYWNlKHMsXCJcIil9LG1ha2VBcnJheTpmdW5jdGlvbihhLGIpe3ZhciBjPWJ8fFtdO3JldHVybiBudWxsIT1hJiYodyhPYmplY3QoYSkpP3IubWVyZ2UoYyxcInN0cmluZ1wiPT10eXBlb2YgYT9bYV06YSk6aC5jYWxsKGMsYSkpLGN9LGluQXJyYXk6ZnVuY3Rpb24oYSxiLGMpe3JldHVybiBudWxsPT1iPy0xOmkuY2FsbChiLGEsYyl9LG1lcmdlOmZ1bmN0aW9uKGEsYil7Zm9yKHZhciBjPStiLmxlbmd0aCxkPTAsZT1hLmxlbmd0aDtkPGM7ZCsrKWFbZSsrXT1iW2RdO3JldHVybiBhLmxlbmd0aD1lLGF9LGdyZXA6ZnVuY3Rpb24oYSxiLGMpe2Zvcih2YXIgZCxlPVtdLGY9MCxnPWEubGVuZ3RoLGg9IWM7ZjxnO2YrKylkPSFiKGFbZl0sZiksZCE9PWgmJmUucHVzaChhW2ZdKTtyZXR1cm4gZX0sbWFwOmZ1bmN0aW9uKGEsYixjKXt2YXIgZCxlLGY9MCxoPVtdO2lmKHcoYSkpZm9yKGQ9YS5sZW5ndGg7ZjxkO2YrKyllPWIoYVtmXSxmLGMpLG51bGwhPWUmJmgucHVzaChlKTtlbHNlIGZvcihmIGluIGEpZT1iKGFbZl0sZixjKSxudWxsIT1lJiZoLnB1c2goZSk7cmV0dXJuIGcuYXBwbHkoW10saCl9LGd1aWQ6MSxwcm94eTpmdW5jdGlvbihhLGIpe3ZhciBjLGQsZTtpZihcInN0cmluZ1wiPT10eXBlb2YgYiYmKGM9YVtiXSxiPWEsYT1jKSxyLmlzRnVuY3Rpb24oYSkpcmV0dXJuIGQ9Zi5jYWxsKGFyZ3VtZW50cywyKSxlPWZ1bmN0aW9uKCl7cmV0dXJuIGEuYXBwbHkoYnx8dGhpcyxkLmNvbmNhdChmLmNhbGwoYXJndW1lbnRzKSkpfSxlLmd1aWQ9YS5ndWlkPWEuZ3VpZHx8ci5ndWlkKyssZX0sbm93OkRhdGUubm93LHN1cHBvcnQ6b30pLFwiZnVuY3Rpb25cIj09dHlwZW9mIFN5bWJvbCYmKHIuZm5bU3ltYm9sLml0ZXJhdG9yXT1jW1N5bWJvbC5pdGVyYXRvcl0pLHIuZWFjaChcIkJvb2xlYW4gTnVtYmVyIFN0cmluZyBGdW5jdGlvbiBBcnJheSBEYXRlIFJlZ0V4cCBPYmplY3QgRXJyb3IgU3ltYm9sXCIuc3BsaXQoXCIgXCIpLGZ1bmN0aW9uKGEsYil7altcIltvYmplY3QgXCIrYitcIl1cIl09Yi50b0xvd2VyQ2FzZSgpfSk7ZnVuY3Rpb24gdyhhKXt2YXIgYj0hIWEmJlwibGVuZ3RoXCJpbiBhJiZhLmxlbmd0aCxjPXIudHlwZShhKTtyZXR1cm5cImZ1bmN0aW9uXCIhPT1jJiYhci5pc1dpbmRvdyhhKSYmKFwiYXJyYXlcIj09PWN8fDA9PT1ifHxcIm51bWJlclwiPT10eXBlb2YgYiYmYj4wJiZiLTEgaW4gYSl9dmFyIHg9ZnVuY3Rpb24oYSl7dmFyIGIsYyxkLGUsZixnLGgsaSxqLGssbCxtLG4sbyxwLHEscixzLHQsdT1cInNpenpsZVwiKzEqbmV3IERhdGUsdj1hLmRvY3VtZW50LHc9MCx4PTAseT1oYSgpLHo9aGEoKSxBPWhhKCksQj1mdW5jdGlvbihhLGIpe3JldHVybiBhPT09YiYmKGw9ITApLDB9LEM9e30uaGFzT3duUHJvcGVydHksRD1bXSxFPUQucG9wLEY9RC5wdXNoLEc9RC5wdXNoLEg9RC5zbGljZSxJPWZ1bmN0aW9uKGEsYil7Zm9yKHZhciBjPTAsZD1hLmxlbmd0aDtjPGQ7YysrKWlmKGFbY109PT1iKXJldHVybiBjO3JldHVybi0xfSxKPVwiY2hlY2tlZHxzZWxlY3RlZHxhc3luY3xhdXRvZm9jdXN8YXV0b3BsYXl8Y29udHJvbHN8ZGVmZXJ8ZGlzYWJsZWR8aGlkZGVufGlzbWFwfGxvb3B8bXVsdGlwbGV8b3BlbnxyZWFkb25seXxyZXF1aXJlZHxzY29wZWRcIixLPVwiW1xcXFx4MjBcXFxcdFxcXFxyXFxcXG5cXFxcZl1cIixMPVwiKD86XFxcXFxcXFwufFtcXFxcdy1dfFteXFwwLVxcXFx4YTBdKStcIixNPVwiXFxcXFtcIitLK1wiKihcIitMK1wiKSg/OlwiK0srXCIqKFsqXiR8IX5dPz0pXCIrSytcIiooPzonKCg/OlxcXFxcXFxcLnxbXlxcXFxcXFxcJ10pKiknfFxcXCIoKD86XFxcXFxcXFwufFteXFxcXFxcXFxcXFwiXSkqKVxcXCJ8KFwiK0wrXCIpKXwpXCIrSytcIipcXFxcXVwiLE49XCI6KFwiK0wrXCIpKD86XFxcXCgoKCcoKD86XFxcXFxcXFwufFteXFxcXFxcXFwnXSkqKSd8XFxcIigoPzpcXFxcXFxcXC58W15cXFxcXFxcXFxcXCJdKSopXFxcIil8KCg/OlxcXFxcXFxcLnxbXlxcXFxcXFxcKClbXFxcXF1dfFwiK00rXCIpKil8LiopXFxcXCl8KVwiLE89bmV3IFJlZ0V4cChLK1wiK1wiLFwiZ1wiKSxQPW5ldyBSZWdFeHAoXCJeXCIrSytcIit8KCg/Ol58W15cXFxcXFxcXF0pKD86XFxcXFxcXFwuKSopXCIrSytcIiskXCIsXCJnXCIpLFE9bmV3IFJlZ0V4cChcIl5cIitLK1wiKixcIitLK1wiKlwiKSxSPW5ldyBSZWdFeHAoXCJeXCIrSytcIiooWz4rfl18XCIrSytcIilcIitLK1wiKlwiKSxTPW5ldyBSZWdFeHAoXCI9XCIrSytcIiooW15cXFxcXSdcXFwiXSo/KVwiK0srXCIqXFxcXF1cIixcImdcIiksVD1uZXcgUmVnRXhwKE4pLFU9bmV3IFJlZ0V4cChcIl5cIitMK1wiJFwiKSxWPXtJRDpuZXcgUmVnRXhwKFwiXiMoXCIrTCtcIilcIiksQ0xBU1M6bmV3IFJlZ0V4cChcIl5cXFxcLihcIitMK1wiKVwiKSxUQUc6bmV3IFJlZ0V4cChcIl4oXCIrTCtcInxbKl0pXCIpLEFUVFI6bmV3IFJlZ0V4cChcIl5cIitNKSxQU0VVRE86bmV3IFJlZ0V4cChcIl5cIitOKSxDSElMRDpuZXcgUmVnRXhwKFwiXjoob25seXxmaXJzdHxsYXN0fG50aHxudGgtbGFzdCktKGNoaWxkfG9mLXR5cGUpKD86XFxcXChcIitLK1wiKihldmVufG9kZHwoKFsrLV18KShcXFxcZCopbnwpXCIrSytcIiooPzooWystXXwpXCIrSytcIiooXFxcXGQrKXwpKVwiK0srXCIqXFxcXCl8KVwiLFwiaVwiKSxib29sOm5ldyBSZWdFeHAoXCJeKD86XCIrSitcIikkXCIsXCJpXCIpLG5lZWRzQ29udGV4dDpuZXcgUmVnRXhwKFwiXlwiK0srXCIqWz4rfl18OihldmVufG9kZHxlcXxndHxsdHxudGh8Zmlyc3R8bGFzdCkoPzpcXFxcKFwiK0srXCIqKCg/Oi1cXFxcZCk/XFxcXGQqKVwiK0srXCIqXFxcXCl8KSg/PVteLV18JClcIixcImlcIil9LFc9L14oPzppbnB1dHxzZWxlY3R8dGV4dGFyZWF8YnV0dG9uKSQvaSxYPS9eaFxcZCQvaSxZPS9eW157XStcXHtcXHMqXFxbbmF0aXZlIFxcdy8sWj0vXig/OiMoW1xcdy1dKyl8KFxcdyspfFxcLihbXFx3LV0rKSkkLywkPS9bK35dLyxfPW5ldyBSZWdFeHAoXCJcXFxcXFxcXChbXFxcXGRhLWZdezEsNn1cIitLK1wiP3woXCIrSytcIil8LilcIixcImlnXCIpLGFhPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD1cIjB4XCIrYi02NTUzNjtyZXR1cm4gZCE9PWR8fGM/YjpkPDA/U3RyaW5nLmZyb21DaGFyQ29kZShkKzY1NTM2KTpTdHJpbmcuZnJvbUNoYXJDb2RlKGQ+PjEwfDU1Mjk2LDEwMjMmZHw1NjMyMCl9LGJhPS8oW1xcMC1cXHgxZlxceDdmXXxeLT9cXGQpfF4tJHxbXlxcMC1cXHgxZlxceDdmLVxcdUZGRkZcXHctXS9nLGNhPWZ1bmN0aW9uKGEsYil7cmV0dXJuIGI/XCJcXDBcIj09PWE/XCJcXHVmZmZkXCI6YS5zbGljZSgwLC0xKStcIlxcXFxcIithLmNoYXJDb2RlQXQoYS5sZW5ndGgtMSkudG9TdHJpbmcoMTYpK1wiIFwiOlwiXFxcXFwiK2F9LGRhPWZ1bmN0aW9uKCl7bSgpfSxlYT10YShmdW5jdGlvbihhKXtyZXR1cm4gYS5kaXNhYmxlZD09PSEwJiYoXCJmb3JtXCJpbiBhfHxcImxhYmVsXCJpbiBhKX0se2RpcjpcInBhcmVudE5vZGVcIixuZXh0OlwibGVnZW5kXCJ9KTt0cnl7Ry5hcHBseShEPUguY2FsbCh2LmNoaWxkTm9kZXMpLHYuY2hpbGROb2RlcyksRFt2LmNoaWxkTm9kZXMubGVuZ3RoXS5ub2RlVHlwZX1jYXRjaChmYSl7Rz17YXBwbHk6RC5sZW5ndGg/ZnVuY3Rpb24oYSxiKXtGLmFwcGx5KGEsSC5jYWxsKGIpKX06ZnVuY3Rpb24oYSxiKXt2YXIgYz1hLmxlbmd0aCxkPTA7d2hpbGUoYVtjKytdPWJbZCsrXSk7YS5sZW5ndGg9Yy0xfX19ZnVuY3Rpb24gZ2EoYSxiLGQsZSl7dmFyIGYsaCxqLGssbCxvLHIscz1iJiZiLm93bmVyRG9jdW1lbnQsdz1iP2Iubm9kZVR5cGU6OTtpZihkPWR8fFtdLFwic3RyaW5nXCIhPXR5cGVvZiBhfHwhYXx8MSE9PXcmJjkhPT13JiYxMSE9PXcpcmV0dXJuIGQ7aWYoIWUmJigoYj9iLm93bmVyRG9jdW1lbnR8fGI6dikhPT1uJiZtKGIpLGI9Ynx8bixwKSl7aWYoMTEhPT13JiYobD1aLmV4ZWMoYSkpKWlmKGY9bFsxXSl7aWYoOT09PXcpe2lmKCEoaj1iLmdldEVsZW1lbnRCeUlkKGYpKSlyZXR1cm4gZDtpZihqLmlkPT09ZilyZXR1cm4gZC5wdXNoKGopLGR9ZWxzZSBpZihzJiYoaj1zLmdldEVsZW1lbnRCeUlkKGYpKSYmdChiLGopJiZqLmlkPT09ZilyZXR1cm4gZC5wdXNoKGopLGR9ZWxzZXtpZihsWzJdKXJldHVybiBHLmFwcGx5KGQsYi5nZXRFbGVtZW50c0J5VGFnTmFtZShhKSksZDtpZigoZj1sWzNdKSYmYy5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lJiZiLmdldEVsZW1lbnRzQnlDbGFzc05hbWUpcmV0dXJuIEcuYXBwbHkoZCxiLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoZikpLGR9aWYoYy5xc2EmJiFBW2ErXCIgXCJdJiYoIXF8fCFxLnRlc3QoYSkpKXtpZigxIT09dylzPWIscj1hO2Vsc2UgaWYoXCJvYmplY3RcIiE9PWIubm9kZU5hbWUudG9Mb3dlckNhc2UoKSl7KGs9Yi5nZXRBdHRyaWJ1dGUoXCJpZFwiKSk/az1rLnJlcGxhY2UoYmEsY2EpOmIuc2V0QXR0cmlidXRlKFwiaWRcIixrPXUpLG89ZyhhKSxoPW8ubGVuZ3RoO3doaWxlKGgtLSlvW2hdPVwiI1wiK2srXCIgXCIrc2Eob1toXSk7cj1vLmpvaW4oXCIsXCIpLHM9JC50ZXN0KGEpJiZxYShiLnBhcmVudE5vZGUpfHxifWlmKHIpdHJ5e3JldHVybiBHLmFwcGx5KGQscy5xdWVyeVNlbGVjdG9yQWxsKHIpKSxkfWNhdGNoKHgpe31maW5hbGx5e2s9PT11JiZiLnJlbW92ZUF0dHJpYnV0ZShcImlkXCIpfX19cmV0dXJuIGkoYS5yZXBsYWNlKFAsXCIkMVwiKSxiLGQsZSl9ZnVuY3Rpb24gaGEoKXt2YXIgYT1bXTtmdW5jdGlvbiBiKGMsZSl7cmV0dXJuIGEucHVzaChjK1wiIFwiKT5kLmNhY2hlTGVuZ3RoJiZkZWxldGUgYlthLnNoaWZ0KCldLGJbYytcIiBcIl09ZX1yZXR1cm4gYn1mdW5jdGlvbiBpYShhKXtyZXR1cm4gYVt1XT0hMCxhfWZ1bmN0aW9uIGphKGEpe3ZhciBiPW4uY3JlYXRlRWxlbWVudChcImZpZWxkc2V0XCIpO3RyeXtyZXR1cm4hIWEoYil9Y2F0Y2goYyl7cmV0dXJuITF9ZmluYWxseXtiLnBhcmVudE5vZGUmJmIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChiKSxiPW51bGx9fWZ1bmN0aW9uIGthKGEsYil7dmFyIGM9YS5zcGxpdChcInxcIiksZT1jLmxlbmd0aDt3aGlsZShlLS0pZC5hdHRySGFuZGxlW2NbZV1dPWJ9ZnVuY3Rpb24gbGEoYSxiKXt2YXIgYz1iJiZhLGQ9YyYmMT09PWEubm9kZVR5cGUmJjE9PT1iLm5vZGVUeXBlJiZhLnNvdXJjZUluZGV4LWIuc291cmNlSW5kZXg7aWYoZClyZXR1cm4gZDtpZihjKXdoaWxlKGM9Yy5uZXh0U2libGluZylpZihjPT09YilyZXR1cm4tMTtyZXR1cm4gYT8xOi0xfWZ1bmN0aW9uIG1hKGEpe3JldHVybiBmdW5jdGlvbihiKXt2YXIgYz1iLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7cmV0dXJuXCJpbnB1dFwiPT09YyYmYi50eXBlPT09YX19ZnVuY3Rpb24gbmEoYSl7cmV0dXJuIGZ1bmN0aW9uKGIpe3ZhciBjPWIubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtyZXR1cm4oXCJpbnB1dFwiPT09Y3x8XCJidXR0b25cIj09PWMpJiZiLnR5cGU9PT1hfX1mdW5jdGlvbiBvYShhKXtyZXR1cm4gZnVuY3Rpb24oYil7cmV0dXJuXCJmb3JtXCJpbiBiP2IucGFyZW50Tm9kZSYmYi5kaXNhYmxlZD09PSExP1wibGFiZWxcImluIGI/XCJsYWJlbFwiaW4gYi5wYXJlbnROb2RlP2IucGFyZW50Tm9kZS5kaXNhYmxlZD09PWE6Yi5kaXNhYmxlZD09PWE6Yi5pc0Rpc2FibGVkPT09YXx8Yi5pc0Rpc2FibGVkIT09IWEmJmVhKGIpPT09YTpiLmRpc2FibGVkPT09YTpcImxhYmVsXCJpbiBiJiZiLmRpc2FibGVkPT09YX19ZnVuY3Rpb24gcGEoYSl7cmV0dXJuIGlhKGZ1bmN0aW9uKGIpe3JldHVybiBiPStiLGlhKGZ1bmN0aW9uKGMsZCl7dmFyIGUsZj1hKFtdLGMubGVuZ3RoLGIpLGc9Zi5sZW5ndGg7d2hpbGUoZy0tKWNbZT1mW2ddXSYmKGNbZV09IShkW2VdPWNbZV0pKX0pfSl9ZnVuY3Rpb24gcWEoYSl7cmV0dXJuIGEmJlwidW5kZWZpbmVkXCIhPXR5cGVvZiBhLmdldEVsZW1lbnRzQnlUYWdOYW1lJiZhfWM9Z2Euc3VwcG9ydD17fSxmPWdhLmlzWE1MPWZ1bmN0aW9uKGEpe3ZhciBiPWEmJihhLm93bmVyRG9jdW1lbnR8fGEpLmRvY3VtZW50RWxlbWVudDtyZXR1cm4hIWImJlwiSFRNTFwiIT09Yi5ub2RlTmFtZX0sbT1nYS5zZXREb2N1bWVudD1mdW5jdGlvbihhKXt2YXIgYixlLGc9YT9hLm93bmVyRG9jdW1lbnR8fGE6djtyZXR1cm4gZyE9PW4mJjk9PT1nLm5vZGVUeXBlJiZnLmRvY3VtZW50RWxlbWVudD8obj1nLG89bi5kb2N1bWVudEVsZW1lbnQscD0hZihuKSx2IT09biYmKGU9bi5kZWZhdWx0VmlldykmJmUudG9wIT09ZSYmKGUuYWRkRXZlbnRMaXN0ZW5lcj9lLmFkZEV2ZW50TGlzdGVuZXIoXCJ1bmxvYWRcIixkYSwhMSk6ZS5hdHRhY2hFdmVudCYmZS5hdHRhY2hFdmVudChcIm9udW5sb2FkXCIsZGEpKSxjLmF0dHJpYnV0ZXM9amEoZnVuY3Rpb24oYSl7cmV0dXJuIGEuY2xhc3NOYW1lPVwiaVwiLCFhLmdldEF0dHJpYnV0ZShcImNsYXNzTmFtZVwiKX0pLGMuZ2V0RWxlbWVudHNCeVRhZ05hbWU9amEoZnVuY3Rpb24oYSl7cmV0dXJuIGEuYXBwZW5kQ2hpbGQobi5jcmVhdGVDb21tZW50KFwiXCIpKSwhYS5nZXRFbGVtZW50c0J5VGFnTmFtZShcIipcIikubGVuZ3RofSksYy5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lPVkudGVzdChuLmdldEVsZW1lbnRzQnlDbGFzc05hbWUpLGMuZ2V0QnlJZD1qYShmdW5jdGlvbihhKXtyZXR1cm4gby5hcHBlbmRDaGlsZChhKS5pZD11LCFuLmdldEVsZW1lbnRzQnlOYW1lfHwhbi5nZXRFbGVtZW50c0J5TmFtZSh1KS5sZW5ndGh9KSxjLmdldEJ5SWQ/KGQuZmlsdGVyLklEPWZ1bmN0aW9uKGEpe3ZhciBiPWEucmVwbGFjZShfLGFhKTtyZXR1cm4gZnVuY3Rpb24oYSl7cmV0dXJuIGEuZ2V0QXR0cmlidXRlKFwiaWRcIik9PT1ifX0sZC5maW5kLklEPWZ1bmN0aW9uKGEsYil7aWYoXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGIuZ2V0RWxlbWVudEJ5SWQmJnApe3ZhciBjPWIuZ2V0RWxlbWVudEJ5SWQoYSk7cmV0dXJuIGM/W2NdOltdfX0pOihkLmZpbHRlci5JRD1mdW5jdGlvbihhKXt2YXIgYj1hLnJlcGxhY2UoXyxhYSk7cmV0dXJuIGZ1bmN0aW9uKGEpe3ZhciBjPVwidW5kZWZpbmVkXCIhPXR5cGVvZiBhLmdldEF0dHJpYnV0ZU5vZGUmJmEuZ2V0QXR0cmlidXRlTm9kZShcImlkXCIpO3JldHVybiBjJiZjLnZhbHVlPT09Yn19LGQuZmluZC5JRD1mdW5jdGlvbihhLGIpe2lmKFwidW5kZWZpbmVkXCIhPXR5cGVvZiBiLmdldEVsZW1lbnRCeUlkJiZwKXt2YXIgYyxkLGUsZj1iLmdldEVsZW1lbnRCeUlkKGEpO2lmKGYpe2lmKGM9Zi5nZXRBdHRyaWJ1dGVOb2RlKFwiaWRcIiksYyYmYy52YWx1ZT09PWEpcmV0dXJuW2ZdO2U9Yi5nZXRFbGVtZW50c0J5TmFtZShhKSxkPTA7d2hpbGUoZj1lW2QrK10paWYoYz1mLmdldEF0dHJpYnV0ZU5vZGUoXCJpZFwiKSxjJiZjLnZhbHVlPT09YSlyZXR1cm5bZl19cmV0dXJuW119fSksZC5maW5kLlRBRz1jLmdldEVsZW1lbnRzQnlUYWdOYW1lP2Z1bmN0aW9uKGEsYil7cmV0dXJuXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGIuZ2V0RWxlbWVudHNCeVRhZ05hbWU/Yi5nZXRFbGVtZW50c0J5VGFnTmFtZShhKTpjLnFzYT9iLnF1ZXJ5U2VsZWN0b3JBbGwoYSk6dm9pZCAwfTpmdW5jdGlvbihhLGIpe3ZhciBjLGQ9W10sZT0wLGY9Yi5nZXRFbGVtZW50c0J5VGFnTmFtZShhKTtpZihcIipcIj09PWEpe3doaWxlKGM9ZltlKytdKTE9PT1jLm5vZGVUeXBlJiZkLnB1c2goYyk7cmV0dXJuIGR9cmV0dXJuIGZ9LGQuZmluZC5DTEFTUz1jLmdldEVsZW1lbnRzQnlDbGFzc05hbWUmJmZ1bmN0aW9uKGEsYil7aWYoXCJ1bmRlZmluZWRcIiE9dHlwZW9mIGIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSYmcClyZXR1cm4gYi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKGEpfSxyPVtdLHE9W10sKGMucXNhPVkudGVzdChuLnF1ZXJ5U2VsZWN0b3JBbGwpKSYmKGphKGZ1bmN0aW9uKGEpe28uYXBwZW5kQ2hpbGQoYSkuaW5uZXJIVE1MPVwiPGEgaWQ9J1wiK3UrXCInPjwvYT48c2VsZWN0IGlkPSdcIit1K1wiLVxcclxcXFwnIG1zYWxsb3djYXB0dXJlPScnPjxvcHRpb24gc2VsZWN0ZWQ9Jyc+PC9vcHRpb24+PC9zZWxlY3Q+XCIsYS5xdWVyeVNlbGVjdG9yQWxsKFwiW21zYWxsb3djYXB0dXJlXj0nJ11cIikubGVuZ3RoJiZxLnB1c2goXCJbKl4kXT1cIitLK1wiKig/OicnfFxcXCJcXFwiKVwiKSxhLnF1ZXJ5U2VsZWN0b3JBbGwoXCJbc2VsZWN0ZWRdXCIpLmxlbmd0aHx8cS5wdXNoKFwiXFxcXFtcIitLK1wiKig/OnZhbHVlfFwiK0orXCIpXCIpLGEucXVlcnlTZWxlY3RvckFsbChcIltpZH49XCIrdStcIi1dXCIpLmxlbmd0aHx8cS5wdXNoKFwifj1cIiksYS5xdWVyeVNlbGVjdG9yQWxsKFwiOmNoZWNrZWRcIikubGVuZ3RofHxxLnB1c2goXCI6Y2hlY2tlZFwiKSxhLnF1ZXJ5U2VsZWN0b3JBbGwoXCJhI1wiK3UrXCIrKlwiKS5sZW5ndGh8fHEucHVzaChcIi4jLitbK35dXCIpfSksamEoZnVuY3Rpb24oYSl7YS5pbm5lckhUTUw9XCI8YSBocmVmPScnIGRpc2FibGVkPSdkaXNhYmxlZCc+PC9hPjxzZWxlY3QgZGlzYWJsZWQ9J2Rpc2FibGVkJz48b3B0aW9uLz48L3NlbGVjdD5cIjt2YXIgYj1uLmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtiLnNldEF0dHJpYnV0ZShcInR5cGVcIixcImhpZGRlblwiKSxhLmFwcGVuZENoaWxkKGIpLnNldEF0dHJpYnV0ZShcIm5hbWVcIixcIkRcIiksYS5xdWVyeVNlbGVjdG9yQWxsKFwiW25hbWU9ZF1cIikubGVuZ3RoJiZxLnB1c2goXCJuYW1lXCIrSytcIipbKl4kfCF+XT89XCIpLDIhPT1hLnF1ZXJ5U2VsZWN0b3JBbGwoXCI6ZW5hYmxlZFwiKS5sZW5ndGgmJnEucHVzaChcIjplbmFibGVkXCIsXCI6ZGlzYWJsZWRcIiksby5hcHBlbmRDaGlsZChhKS5kaXNhYmxlZD0hMCwyIT09YS5xdWVyeVNlbGVjdG9yQWxsKFwiOmRpc2FibGVkXCIpLmxlbmd0aCYmcS5wdXNoKFwiOmVuYWJsZWRcIixcIjpkaXNhYmxlZFwiKSxhLnF1ZXJ5U2VsZWN0b3JBbGwoXCIqLDp4XCIpLHEucHVzaChcIiwuKjpcIil9KSksKGMubWF0Y2hlc1NlbGVjdG9yPVkudGVzdChzPW8ubWF0Y2hlc3x8by53ZWJraXRNYXRjaGVzU2VsZWN0b3J8fG8ubW96TWF0Y2hlc1NlbGVjdG9yfHxvLm9NYXRjaGVzU2VsZWN0b3J8fG8ubXNNYXRjaGVzU2VsZWN0b3IpKSYmamEoZnVuY3Rpb24oYSl7Yy5kaXNjb25uZWN0ZWRNYXRjaD1zLmNhbGwoYSxcIipcIikscy5jYWxsKGEsXCJbcyE9JyddOnhcIiksci5wdXNoKFwiIT1cIixOKX0pLHE9cS5sZW5ndGgmJm5ldyBSZWdFeHAocS5qb2luKFwifFwiKSkscj1yLmxlbmd0aCYmbmV3IFJlZ0V4cChyLmpvaW4oXCJ8XCIpKSxiPVkudGVzdChvLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uKSx0PWJ8fFkudGVzdChvLmNvbnRhaW5zKT9mdW5jdGlvbihhLGIpe3ZhciBjPTk9PT1hLm5vZGVUeXBlP2EuZG9jdW1lbnRFbGVtZW50OmEsZD1iJiZiLnBhcmVudE5vZGU7cmV0dXJuIGE9PT1kfHwhKCFkfHwxIT09ZC5ub2RlVHlwZXx8IShjLmNvbnRhaW5zP2MuY29udGFpbnMoZCk6YS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiYmMTYmYS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbihkKSkpfTpmdW5jdGlvbihhLGIpe2lmKGIpd2hpbGUoYj1iLnBhcmVudE5vZGUpaWYoYj09PWEpcmV0dXJuITA7cmV0dXJuITF9LEI9Yj9mdW5jdGlvbihhLGIpe2lmKGE9PT1iKXJldHVybiBsPSEwLDA7dmFyIGQ9IWEuY29tcGFyZURvY3VtZW50UG9zaXRpb24tIWIuY29tcGFyZURvY3VtZW50UG9zaXRpb247cmV0dXJuIGQ/ZDooZD0oYS5vd25lckRvY3VtZW50fHxhKT09PShiLm93bmVyRG9jdW1lbnR8fGIpP2EuY29tcGFyZURvY3VtZW50UG9zaXRpb24oYik6MSwxJmR8fCFjLnNvcnREZXRhY2hlZCYmYi5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbihhKT09PWQ/YT09PW58fGEub3duZXJEb2N1bWVudD09PXYmJnQodixhKT8tMTpiPT09bnx8Yi5vd25lckRvY3VtZW50PT09diYmdCh2LGIpPzE6az9JKGssYSktSShrLGIpOjA6NCZkPy0xOjEpfTpmdW5jdGlvbihhLGIpe2lmKGE9PT1iKXJldHVybiBsPSEwLDA7dmFyIGMsZD0wLGU9YS5wYXJlbnROb2RlLGY9Yi5wYXJlbnROb2RlLGc9W2FdLGg9W2JdO2lmKCFlfHwhZilyZXR1cm4gYT09PW4/LTE6Yj09PW4/MTplPy0xOmY/MTprP0koayxhKS1JKGssYik6MDtpZihlPT09ZilyZXR1cm4gbGEoYSxiKTtjPWE7d2hpbGUoYz1jLnBhcmVudE5vZGUpZy51bnNoaWZ0KGMpO2M9Yjt3aGlsZShjPWMucGFyZW50Tm9kZSloLnVuc2hpZnQoYyk7d2hpbGUoZ1tkXT09PWhbZF0pZCsrO3JldHVybiBkP2xhKGdbZF0saFtkXSk6Z1tkXT09PXY/LTE6aFtkXT09PXY/MTowfSxuKTpufSxnYS5tYXRjaGVzPWZ1bmN0aW9uKGEsYil7cmV0dXJuIGdhKGEsbnVsbCxudWxsLGIpfSxnYS5tYXRjaGVzU2VsZWN0b3I9ZnVuY3Rpb24oYSxiKXtpZigoYS5vd25lckRvY3VtZW50fHxhKSE9PW4mJm0oYSksYj1iLnJlcGxhY2UoUyxcIj0nJDEnXVwiKSxjLm1hdGNoZXNTZWxlY3RvciYmcCYmIUFbYitcIiBcIl0mJighcnx8IXIudGVzdChiKSkmJighcXx8IXEudGVzdChiKSkpdHJ5e3ZhciBkPXMuY2FsbChhLGIpO2lmKGR8fGMuZGlzY29ubmVjdGVkTWF0Y2h8fGEuZG9jdW1lbnQmJjExIT09YS5kb2N1bWVudC5ub2RlVHlwZSlyZXR1cm4gZH1jYXRjaChlKXt9cmV0dXJuIGdhKGIsbixudWxsLFthXSkubGVuZ3RoPjB9LGdhLmNvbnRhaW5zPWZ1bmN0aW9uKGEsYil7cmV0dXJuKGEub3duZXJEb2N1bWVudHx8YSkhPT1uJiZtKGEpLHQoYSxiKX0sZ2EuYXR0cj1mdW5jdGlvbihhLGIpeyhhLm93bmVyRG9jdW1lbnR8fGEpIT09biYmbShhKTt2YXIgZT1kLmF0dHJIYW5kbGVbYi50b0xvd2VyQ2FzZSgpXSxmPWUmJkMuY2FsbChkLmF0dHJIYW5kbGUsYi50b0xvd2VyQ2FzZSgpKT9lKGEsYiwhcCk6dm9pZCAwO3JldHVybiB2b2lkIDAhPT1mP2Y6Yy5hdHRyaWJ1dGVzfHwhcD9hLmdldEF0dHJpYnV0ZShiKTooZj1hLmdldEF0dHJpYnV0ZU5vZGUoYikpJiZmLnNwZWNpZmllZD9mLnZhbHVlOm51bGx9LGdhLmVzY2FwZT1mdW5jdGlvbihhKXtyZXR1cm4oYStcIlwiKS5yZXBsYWNlKGJhLGNhKX0sZ2EuZXJyb3I9ZnVuY3Rpb24oYSl7dGhyb3cgbmV3IEVycm9yKFwiU3ludGF4IGVycm9yLCB1bnJlY29nbml6ZWQgZXhwcmVzc2lvbjogXCIrYSl9LGdhLnVuaXF1ZVNvcnQ9ZnVuY3Rpb24oYSl7dmFyIGIsZD1bXSxlPTAsZj0wO2lmKGw9IWMuZGV0ZWN0RHVwbGljYXRlcyxrPSFjLnNvcnRTdGFibGUmJmEuc2xpY2UoMCksYS5zb3J0KEIpLGwpe3doaWxlKGI9YVtmKytdKWI9PT1hW2ZdJiYoZT1kLnB1c2goZikpO3doaWxlKGUtLSlhLnNwbGljZShkW2VdLDEpfXJldHVybiBrPW51bGwsYX0sZT1nYS5nZXRUZXh0PWZ1bmN0aW9uKGEpe3ZhciBiLGM9XCJcIixkPTAsZj1hLm5vZGVUeXBlO2lmKGYpe2lmKDE9PT1mfHw5PT09Znx8MTE9PT1mKXtpZihcInN0cmluZ1wiPT10eXBlb2YgYS50ZXh0Q29udGVudClyZXR1cm4gYS50ZXh0Q29udGVudDtmb3IoYT1hLmZpcnN0Q2hpbGQ7YTthPWEubmV4dFNpYmxpbmcpYys9ZShhKX1lbHNlIGlmKDM9PT1mfHw0PT09ZilyZXR1cm4gYS5ub2RlVmFsdWV9ZWxzZSB3aGlsZShiPWFbZCsrXSljKz1lKGIpO3JldHVybiBjfSxkPWdhLnNlbGVjdG9ycz17Y2FjaGVMZW5ndGg6NTAsY3JlYXRlUHNldWRvOmlhLG1hdGNoOlYsYXR0ckhhbmRsZTp7fSxmaW5kOnt9LHJlbGF0aXZlOntcIj5cIjp7ZGlyOlwicGFyZW50Tm9kZVwiLGZpcnN0OiEwfSxcIiBcIjp7ZGlyOlwicGFyZW50Tm9kZVwifSxcIitcIjp7ZGlyOlwicHJldmlvdXNTaWJsaW5nXCIsZmlyc3Q6ITB9LFwiflwiOntkaXI6XCJwcmV2aW91c1NpYmxpbmdcIn19LHByZUZpbHRlcjp7QVRUUjpmdW5jdGlvbihhKXtyZXR1cm4gYVsxXT1hWzFdLnJlcGxhY2UoXyxhYSksYVszXT0oYVszXXx8YVs0XXx8YVs1XXx8XCJcIikucmVwbGFjZShfLGFhKSxcIn49XCI9PT1hWzJdJiYoYVszXT1cIiBcIithWzNdK1wiIFwiKSxhLnNsaWNlKDAsNCl9LENISUxEOmZ1bmN0aW9uKGEpe3JldHVybiBhWzFdPWFbMV0udG9Mb3dlckNhc2UoKSxcIm50aFwiPT09YVsxXS5zbGljZSgwLDMpPyhhWzNdfHxnYS5lcnJvcihhWzBdKSxhWzRdPSsoYVs0XT9hWzVdKyhhWzZdfHwxKToyKihcImV2ZW5cIj09PWFbM118fFwib2RkXCI9PT1hWzNdKSksYVs1XT0rKGFbN10rYVs4XXx8XCJvZGRcIj09PWFbM10pKTphWzNdJiZnYS5lcnJvcihhWzBdKSxhfSxQU0VVRE86ZnVuY3Rpb24oYSl7dmFyIGIsYz0hYVs2XSYmYVsyXTtyZXR1cm4gVi5DSElMRC50ZXN0KGFbMF0pP251bGw6KGFbM10/YVsyXT1hWzRdfHxhWzVdfHxcIlwiOmMmJlQudGVzdChjKSYmKGI9ZyhjLCEwKSkmJihiPWMuaW5kZXhPZihcIilcIixjLmxlbmd0aC1iKS1jLmxlbmd0aCkmJihhWzBdPWFbMF0uc2xpY2UoMCxiKSxhWzJdPWMuc2xpY2UoMCxiKSksYS5zbGljZSgwLDMpKX19LGZpbHRlcjp7VEFHOmZ1bmN0aW9uKGEpe3ZhciBiPWEucmVwbGFjZShfLGFhKS50b0xvd2VyQ2FzZSgpO3JldHVyblwiKlwiPT09YT9mdW5jdGlvbigpe3JldHVybiEwfTpmdW5jdGlvbihhKXtyZXR1cm4gYS5ub2RlTmFtZSYmYS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpPT09Yn19LENMQVNTOmZ1bmN0aW9uKGEpe3ZhciBiPXlbYStcIiBcIl07cmV0dXJuIGJ8fChiPW5ldyBSZWdFeHAoXCIoXnxcIitLK1wiKVwiK2ErXCIoXCIrSytcInwkKVwiKSkmJnkoYSxmdW5jdGlvbihhKXtyZXR1cm4gYi50ZXN0KFwic3RyaW5nXCI9PXR5cGVvZiBhLmNsYXNzTmFtZSYmYS5jbGFzc05hbWV8fFwidW5kZWZpbmVkXCIhPXR5cGVvZiBhLmdldEF0dHJpYnV0ZSYmYS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKXx8XCJcIil9KX0sQVRUUjpmdW5jdGlvbihhLGIsYyl7cmV0dXJuIGZ1bmN0aW9uKGQpe3ZhciBlPWdhLmF0dHIoZCxhKTtyZXR1cm4gbnVsbD09ZT9cIiE9XCI9PT1iOiFifHwoZSs9XCJcIixcIj1cIj09PWI/ZT09PWM6XCIhPVwiPT09Yj9lIT09YzpcIl49XCI9PT1iP2MmJjA9PT1lLmluZGV4T2YoYyk6XCIqPVwiPT09Yj9jJiZlLmluZGV4T2YoYyk+LTE6XCIkPVwiPT09Yj9jJiZlLnNsaWNlKC1jLmxlbmd0aCk9PT1jOlwifj1cIj09PWI/KFwiIFwiK2UucmVwbGFjZShPLFwiIFwiKStcIiBcIikuaW5kZXhPZihjKT4tMTpcInw9XCI9PT1iJiYoZT09PWN8fGUuc2xpY2UoMCxjLmxlbmd0aCsxKT09PWMrXCItXCIpKX19LENISUxEOmZ1bmN0aW9uKGEsYixjLGQsZSl7dmFyIGY9XCJudGhcIiE9PWEuc2xpY2UoMCwzKSxnPVwibGFzdFwiIT09YS5zbGljZSgtNCksaD1cIm9mLXR5cGVcIj09PWI7cmV0dXJuIDE9PT1kJiYwPT09ZT9mdW5jdGlvbihhKXtyZXR1cm4hIWEucGFyZW50Tm9kZX06ZnVuY3Rpb24oYixjLGkpe3ZhciBqLGssbCxtLG4sbyxwPWYhPT1nP1wibmV4dFNpYmxpbmdcIjpcInByZXZpb3VzU2libGluZ1wiLHE9Yi5wYXJlbnROb2RlLHI9aCYmYi5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpLHM9IWkmJiFoLHQ9ITE7aWYocSl7aWYoZil7d2hpbGUocCl7bT1iO3doaWxlKG09bVtwXSlpZihoP20ubm9kZU5hbWUudG9Mb3dlckNhc2UoKT09PXI6MT09PW0ubm9kZVR5cGUpcmV0dXJuITE7bz1wPVwib25seVwiPT09YSYmIW8mJlwibmV4dFNpYmxpbmdcIn1yZXR1cm4hMH1pZihvPVtnP3EuZmlyc3RDaGlsZDpxLmxhc3RDaGlsZF0sZyYmcyl7bT1xLGw9bVt1XXx8KG1bdV09e30pLGs9bFttLnVuaXF1ZUlEXXx8KGxbbS51bmlxdWVJRF09e30pLGo9a1thXXx8W10sbj1qWzBdPT09dyYmalsxXSx0PW4mJmpbMl0sbT1uJiZxLmNoaWxkTm9kZXNbbl07d2hpbGUobT0rK24mJm0mJm1bcF18fCh0PW49MCl8fG8ucG9wKCkpaWYoMT09PW0ubm9kZVR5cGUmJisrdCYmbT09PWIpe2tbYV09W3csbix0XTticmVha319ZWxzZSBpZihzJiYobT1iLGw9bVt1XXx8KG1bdV09e30pLGs9bFttLnVuaXF1ZUlEXXx8KGxbbS51bmlxdWVJRF09e30pLGo9a1thXXx8W10sbj1qWzBdPT09dyYmalsxXSx0PW4pLHQ9PT0hMSl3aGlsZShtPSsrbiYmbSYmbVtwXXx8KHQ9bj0wKXx8by5wb3AoKSlpZigoaD9tLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCk9PT1yOjE9PT1tLm5vZGVUeXBlKSYmKyt0JiYocyYmKGw9bVt1XXx8KG1bdV09e30pLGs9bFttLnVuaXF1ZUlEXXx8KGxbbS51bmlxdWVJRF09e30pLGtbYV09W3csdF0pLG09PT1iKSlicmVhaztyZXR1cm4gdC09ZSx0PT09ZHx8dCVkPT09MCYmdC9kPj0wfX19LFBTRVVETzpmdW5jdGlvbihhLGIpe3ZhciBjLGU9ZC5wc2V1ZG9zW2FdfHxkLnNldEZpbHRlcnNbYS50b0xvd2VyQ2FzZSgpXXx8Z2EuZXJyb3IoXCJ1bnN1cHBvcnRlZCBwc2V1ZG86IFwiK2EpO3JldHVybiBlW3VdP2UoYik6ZS5sZW5ndGg+MT8oYz1bYSxhLFwiXCIsYl0sZC5zZXRGaWx0ZXJzLmhhc093blByb3BlcnR5KGEudG9Mb3dlckNhc2UoKSk/aWEoZnVuY3Rpb24oYSxjKXt2YXIgZCxmPWUoYSxiKSxnPWYubGVuZ3RoO3doaWxlKGctLSlkPUkoYSxmW2ddKSxhW2RdPSEoY1tkXT1mW2ddKX0pOmZ1bmN0aW9uKGEpe3JldHVybiBlKGEsMCxjKX0pOmV9fSxwc2V1ZG9zOntub3Q6aWEoZnVuY3Rpb24oYSl7dmFyIGI9W10sYz1bXSxkPWgoYS5yZXBsYWNlKFAsXCIkMVwiKSk7cmV0dXJuIGRbdV0/aWEoZnVuY3Rpb24oYSxiLGMsZSl7dmFyIGYsZz1kKGEsbnVsbCxlLFtdKSxoPWEubGVuZ3RoO3doaWxlKGgtLSkoZj1nW2hdKSYmKGFbaF09IShiW2hdPWYpKX0pOmZ1bmN0aW9uKGEsZSxmKXtyZXR1cm4gYlswXT1hLGQoYixudWxsLGYsYyksYlswXT1udWxsLCFjLnBvcCgpfX0pLGhhczppYShmdW5jdGlvbihhKXtyZXR1cm4gZnVuY3Rpb24oYil7cmV0dXJuIGdhKGEsYikubGVuZ3RoPjB9fSksY29udGFpbnM6aWEoZnVuY3Rpb24oYSl7cmV0dXJuIGE9YS5yZXBsYWNlKF8sYWEpLGZ1bmN0aW9uKGIpe3JldHVybihiLnRleHRDb250ZW50fHxiLmlubmVyVGV4dHx8ZShiKSkuaW5kZXhPZihhKT4tMX19KSxsYW5nOmlhKGZ1bmN0aW9uKGEpe3JldHVybiBVLnRlc3QoYXx8XCJcIil8fGdhLmVycm9yKFwidW5zdXBwb3J0ZWQgbGFuZzogXCIrYSksYT1hLnJlcGxhY2UoXyxhYSkudG9Mb3dlckNhc2UoKSxmdW5jdGlvbihiKXt2YXIgYztkbyBpZihjPXA/Yi5sYW5nOmIuZ2V0QXR0cmlidXRlKFwieG1sOmxhbmdcIil8fGIuZ2V0QXR0cmlidXRlKFwibGFuZ1wiKSlyZXR1cm4gYz1jLnRvTG93ZXJDYXNlKCksYz09PWF8fDA9PT1jLmluZGV4T2YoYStcIi1cIik7d2hpbGUoKGI9Yi5wYXJlbnROb2RlKSYmMT09PWIubm9kZVR5cGUpO3JldHVybiExfX0pLHRhcmdldDpmdW5jdGlvbihiKXt2YXIgYz1hLmxvY2F0aW9uJiZhLmxvY2F0aW9uLmhhc2g7cmV0dXJuIGMmJmMuc2xpY2UoMSk9PT1iLmlkfSxyb290OmZ1bmN0aW9uKGEpe3JldHVybiBhPT09b30sZm9jdXM6ZnVuY3Rpb24oYSl7cmV0dXJuIGE9PT1uLmFjdGl2ZUVsZW1lbnQmJighbi5oYXNGb2N1c3x8bi5oYXNGb2N1cygpKSYmISEoYS50eXBlfHxhLmhyZWZ8fH5hLnRhYkluZGV4KX0sZW5hYmxlZDpvYSghMSksZGlzYWJsZWQ6b2EoITApLGNoZWNrZWQ6ZnVuY3Rpb24oYSl7dmFyIGI9YS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO3JldHVyblwiaW5wdXRcIj09PWImJiEhYS5jaGVja2VkfHxcIm9wdGlvblwiPT09YiYmISFhLnNlbGVjdGVkfSxzZWxlY3RlZDpmdW5jdGlvbihhKXtyZXR1cm4gYS5wYXJlbnROb2RlJiZhLnBhcmVudE5vZGUuc2VsZWN0ZWRJbmRleCxhLnNlbGVjdGVkPT09ITB9LGVtcHR5OmZ1bmN0aW9uKGEpe2ZvcihhPWEuZmlyc3RDaGlsZDthO2E9YS5uZXh0U2libGluZylpZihhLm5vZGVUeXBlPDYpcmV0dXJuITE7cmV0dXJuITB9LHBhcmVudDpmdW5jdGlvbihhKXtyZXR1cm4hZC5wc2V1ZG9zLmVtcHR5KGEpfSxoZWFkZXI6ZnVuY3Rpb24oYSl7cmV0dXJuIFgudGVzdChhLm5vZGVOYW1lKX0saW5wdXQ6ZnVuY3Rpb24oYSl7cmV0dXJuIFcudGVzdChhLm5vZGVOYW1lKX0sYnV0dG9uOmZ1bmN0aW9uKGEpe3ZhciBiPWEubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtyZXR1cm5cImlucHV0XCI9PT1iJiZcImJ1dHRvblwiPT09YS50eXBlfHxcImJ1dHRvblwiPT09Yn0sdGV4dDpmdW5jdGlvbihhKXt2YXIgYjtyZXR1cm5cImlucHV0XCI9PT1hLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkmJlwidGV4dFwiPT09YS50eXBlJiYobnVsbD09KGI9YS5nZXRBdHRyaWJ1dGUoXCJ0eXBlXCIpKXx8XCJ0ZXh0XCI9PT1iLnRvTG93ZXJDYXNlKCkpfSxmaXJzdDpwYShmdW5jdGlvbigpe3JldHVyblswXX0pLGxhc3Q6cGEoZnVuY3Rpb24oYSxiKXtyZXR1cm5bYi0xXX0pLGVxOnBhKGZ1bmN0aW9uKGEsYixjKXtyZXR1cm5bYzwwP2MrYjpjXX0pLGV2ZW46cGEoZnVuY3Rpb24oYSxiKXtmb3IodmFyIGM9MDtjPGI7Yys9MilhLnB1c2goYyk7cmV0dXJuIGF9KSxvZGQ6cGEoZnVuY3Rpb24oYSxiKXtmb3IodmFyIGM9MTtjPGI7Yys9MilhLnB1c2goYyk7cmV0dXJuIGF9KSxsdDpwYShmdW5jdGlvbihhLGIsYyl7Zm9yKHZhciBkPWM8MD9jK2I6YzstLWQ+PTA7KWEucHVzaChkKTtyZXR1cm4gYX0pLGd0OnBhKGZ1bmN0aW9uKGEsYixjKXtmb3IodmFyIGQ9YzwwP2MrYjpjOysrZDxiOylhLnB1c2goZCk7cmV0dXJuIGF9KX19LGQucHNldWRvcy5udGg9ZC5wc2V1ZG9zLmVxO2ZvcihiIGlue3JhZGlvOiEwLGNoZWNrYm94OiEwLGZpbGU6ITAscGFzc3dvcmQ6ITAsaW1hZ2U6ITB9KWQucHNldWRvc1tiXT1tYShiKTtmb3IoYiBpbntzdWJtaXQ6ITAscmVzZXQ6ITB9KWQucHNldWRvc1tiXT1uYShiKTtmdW5jdGlvbiByYSgpe31yYS5wcm90b3R5cGU9ZC5maWx0ZXJzPWQucHNldWRvcyxkLnNldEZpbHRlcnM9bmV3IHJhLGc9Z2EudG9rZW5pemU9ZnVuY3Rpb24oYSxiKXt2YXIgYyxlLGYsZyxoLGksaixrPXpbYStcIiBcIl07aWYoaylyZXR1cm4gYj8wOmsuc2xpY2UoMCk7aD1hLGk9W10saj1kLnByZUZpbHRlcjt3aGlsZShoKXtjJiYhKGU9US5leGVjKGgpKXx8KGUmJihoPWguc2xpY2UoZVswXS5sZW5ndGgpfHxoKSxpLnB1c2goZj1bXSkpLGM9ITEsKGU9Ui5leGVjKGgpKSYmKGM9ZS5zaGlmdCgpLGYucHVzaCh7dmFsdWU6Yyx0eXBlOmVbMF0ucmVwbGFjZShQLFwiIFwiKX0pLGg9aC5zbGljZShjLmxlbmd0aCkpO2ZvcihnIGluIGQuZmlsdGVyKSEoZT1WW2ddLmV4ZWMoaCkpfHxqW2ddJiYhKGU9altnXShlKSl8fChjPWUuc2hpZnQoKSxmLnB1c2goe3ZhbHVlOmMsdHlwZTpnLG1hdGNoZXM6ZX0pLGg9aC5zbGljZShjLmxlbmd0aCkpO2lmKCFjKWJyZWFrfXJldHVybiBiP2gubGVuZ3RoOmg/Z2EuZXJyb3IoYSk6eihhLGkpLnNsaWNlKDApfTtmdW5jdGlvbiBzYShhKXtmb3IodmFyIGI9MCxjPWEubGVuZ3RoLGQ9XCJcIjtiPGM7YisrKWQrPWFbYl0udmFsdWU7cmV0dXJuIGR9ZnVuY3Rpb24gdGEoYSxiLGMpe3ZhciBkPWIuZGlyLGU9Yi5uZXh0LGY9ZXx8ZCxnPWMmJlwicGFyZW50Tm9kZVwiPT09ZixoPXgrKztyZXR1cm4gYi5maXJzdD9mdW5jdGlvbihiLGMsZSl7d2hpbGUoYj1iW2RdKWlmKDE9PT1iLm5vZGVUeXBlfHxnKXJldHVybiBhKGIsYyxlKTtyZXR1cm4hMX06ZnVuY3Rpb24oYixjLGkpe3ZhciBqLGssbCxtPVt3LGhdO2lmKGkpe3doaWxlKGI9YltkXSlpZigoMT09PWIubm9kZVR5cGV8fGcpJiZhKGIsYyxpKSlyZXR1cm4hMH1lbHNlIHdoaWxlKGI9YltkXSlpZigxPT09Yi5ub2RlVHlwZXx8ZylpZihsPWJbdV18fChiW3VdPXt9KSxrPWxbYi51bmlxdWVJRF18fChsW2IudW5pcXVlSURdPXt9KSxlJiZlPT09Yi5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpKWI9YltkXXx8YjtlbHNle2lmKChqPWtbZl0pJiZqWzBdPT09dyYmalsxXT09PWgpcmV0dXJuIG1bMl09alsyXTtpZihrW2ZdPW0sbVsyXT1hKGIsYyxpKSlyZXR1cm4hMH1yZXR1cm4hMX19ZnVuY3Rpb24gdWEoYSl7cmV0dXJuIGEubGVuZ3RoPjE/ZnVuY3Rpb24oYixjLGQpe3ZhciBlPWEubGVuZ3RoO3doaWxlKGUtLSlpZighYVtlXShiLGMsZCkpcmV0dXJuITE7cmV0dXJuITB9OmFbMF19ZnVuY3Rpb24gdmEoYSxiLGMpe2Zvcih2YXIgZD0wLGU9Yi5sZW5ndGg7ZDxlO2QrKylnYShhLGJbZF0sYyk7cmV0dXJuIGN9ZnVuY3Rpb24gd2EoYSxiLGMsZCxlKXtmb3IodmFyIGYsZz1bXSxoPTAsaT1hLmxlbmd0aCxqPW51bGwhPWI7aDxpO2grKykoZj1hW2hdKSYmKGMmJiFjKGYsZCxlKXx8KGcucHVzaChmKSxqJiZiLnB1c2goaCkpKTtyZXR1cm4gZ31mdW5jdGlvbiB4YShhLGIsYyxkLGUsZil7cmV0dXJuIGQmJiFkW3VdJiYoZD14YShkKSksZSYmIWVbdV0mJihlPXhhKGUsZikpLGlhKGZ1bmN0aW9uKGYsZyxoLGkpe3ZhciBqLGssbCxtPVtdLG49W10sbz1nLmxlbmd0aCxwPWZ8fHZhKGJ8fFwiKlwiLGgubm9kZVR5cGU/W2hdOmgsW10pLHE9IWF8fCFmJiZiP3A6d2EocCxtLGEsaCxpKSxyPWM/ZXx8KGY/YTpvfHxkKT9bXTpnOnE7aWYoYyYmYyhxLHIsaCxpKSxkKXtqPXdhKHIsbiksZChqLFtdLGgsaSksaz1qLmxlbmd0aDt3aGlsZShrLS0pKGw9altrXSkmJihyW25ba11dPSEocVtuW2tdXT1sKSl9aWYoZil7aWYoZXx8YSl7aWYoZSl7aj1bXSxrPXIubGVuZ3RoO3doaWxlKGstLSkobD1yW2tdKSYmai5wdXNoKHFba109bCk7ZShudWxsLHI9W10saixpKX1rPXIubGVuZ3RoO3doaWxlKGstLSkobD1yW2tdKSYmKGo9ZT9JKGYsbCk6bVtrXSk+LTEmJihmW2pdPSEoZ1tqXT1sKSl9fWVsc2Ugcj13YShyPT09Zz9yLnNwbGljZShvLHIubGVuZ3RoKTpyKSxlP2UobnVsbCxnLHIsaSk6Ry5hcHBseShnLHIpfSl9ZnVuY3Rpb24geWEoYSl7Zm9yKHZhciBiLGMsZSxmPWEubGVuZ3RoLGc9ZC5yZWxhdGl2ZVthWzBdLnR5cGVdLGg9Z3x8ZC5yZWxhdGl2ZVtcIiBcIl0saT1nPzE6MCxrPXRhKGZ1bmN0aW9uKGEpe3JldHVybiBhPT09Yn0saCwhMCksbD10YShmdW5jdGlvbihhKXtyZXR1cm4gSShiLGEpPi0xfSxoLCEwKSxtPVtmdW5jdGlvbihhLGMsZCl7dmFyIGU9IWcmJihkfHxjIT09ail8fCgoYj1jKS5ub2RlVHlwZT9rKGEsYyxkKTpsKGEsYyxkKSk7cmV0dXJuIGI9bnVsbCxlfV07aTxmO2krKylpZihjPWQucmVsYXRpdmVbYVtpXS50eXBlXSltPVt0YSh1YShtKSxjKV07ZWxzZXtpZihjPWQuZmlsdGVyW2FbaV0udHlwZV0uYXBwbHkobnVsbCxhW2ldLm1hdGNoZXMpLGNbdV0pe2ZvcihlPSsraTtlPGY7ZSsrKWlmKGQucmVsYXRpdmVbYVtlXS50eXBlXSlicmVhaztyZXR1cm4geGEoaT4xJiZ1YShtKSxpPjEmJnNhKGEuc2xpY2UoMCxpLTEpLmNvbmNhdCh7dmFsdWU6XCIgXCI9PT1hW2ktMl0udHlwZT9cIipcIjpcIlwifSkpLnJlcGxhY2UoUCxcIiQxXCIpLGMsaTxlJiZ5YShhLnNsaWNlKGksZSkpLGU8ZiYmeWEoYT1hLnNsaWNlKGUpKSxlPGYmJnNhKGEpKX1tLnB1c2goYyl9cmV0dXJuIHVhKG0pfWZ1bmN0aW9uIHphKGEsYil7dmFyIGM9Yi5sZW5ndGg+MCxlPWEubGVuZ3RoPjAsZj1mdW5jdGlvbihmLGcsaCxpLGspe3ZhciBsLG8scSxyPTAscz1cIjBcIix0PWYmJltdLHU9W10sdj1qLHg9Znx8ZSYmZC5maW5kLlRBRyhcIipcIixrKSx5PXcrPW51bGw9PXY/MTpNYXRoLnJhbmRvbSgpfHwuMSx6PXgubGVuZ3RoO2ZvcihrJiYoaj1nPT09bnx8Z3x8ayk7cyE9PXomJm51bGwhPShsPXhbc10pO3MrKyl7aWYoZSYmbCl7bz0wLGd8fGwub3duZXJEb2N1bWVudD09PW58fChtKGwpLGg9IXApO3doaWxlKHE9YVtvKytdKWlmKHEobCxnfHxuLGgpKXtpLnB1c2gobCk7YnJlYWt9ayYmKHc9eSl9YyYmKChsPSFxJiZsKSYmci0tLGYmJnQucHVzaChsKSl9aWYocis9cyxjJiZzIT09cil7bz0wO3doaWxlKHE9YltvKytdKXEodCx1LGcsaCk7aWYoZil7aWYocj4wKXdoaWxlKHMtLSl0W3NdfHx1W3NdfHwodVtzXT1FLmNhbGwoaSkpO3U9d2EodSl9Ry5hcHBseShpLHUpLGsmJiFmJiZ1Lmxlbmd0aD4wJiZyK2IubGVuZ3RoPjEmJmdhLnVuaXF1ZVNvcnQoaSl9cmV0dXJuIGsmJih3PXksaj12KSx0fTtyZXR1cm4gYz9pYShmKTpmfXJldHVybiBoPWdhLmNvbXBpbGU9ZnVuY3Rpb24oYSxiKXt2YXIgYyxkPVtdLGU9W10sZj1BW2ErXCIgXCJdO2lmKCFmKXtifHwoYj1nKGEpKSxjPWIubGVuZ3RoO3doaWxlKGMtLSlmPXlhKGJbY10pLGZbdV0/ZC5wdXNoKGYpOmUucHVzaChmKTtmPUEoYSx6YShlLGQpKSxmLnNlbGVjdG9yPWF9cmV0dXJuIGZ9LGk9Z2Euc2VsZWN0PWZ1bmN0aW9uKGEsYixjLGUpe3ZhciBmLGksaixrLGwsbT1cImZ1bmN0aW9uXCI9PXR5cGVvZiBhJiZhLG49IWUmJmcoYT1tLnNlbGVjdG9yfHxhKTtpZihjPWN8fFtdLDE9PT1uLmxlbmd0aCl7aWYoaT1uWzBdPW5bMF0uc2xpY2UoMCksaS5sZW5ndGg+MiYmXCJJRFwiPT09KGo9aVswXSkudHlwZSYmOT09PWIubm9kZVR5cGUmJnAmJmQucmVsYXRpdmVbaVsxXS50eXBlXSl7aWYoYj0oZC5maW5kLklEKGoubWF0Y2hlc1swXS5yZXBsYWNlKF8sYWEpLGIpfHxbXSlbMF0sIWIpcmV0dXJuIGM7bSYmKGI9Yi5wYXJlbnROb2RlKSxhPWEuc2xpY2UoaS5zaGlmdCgpLnZhbHVlLmxlbmd0aCl9Zj1WLm5lZWRzQ29udGV4dC50ZXN0KGEpPzA6aS5sZW5ndGg7d2hpbGUoZi0tKXtpZihqPWlbZl0sZC5yZWxhdGl2ZVtrPWoudHlwZV0pYnJlYWs7aWYoKGw9ZC5maW5kW2tdKSYmKGU9bChqLm1hdGNoZXNbMF0ucmVwbGFjZShfLGFhKSwkLnRlc3QoaVswXS50eXBlKSYmcWEoYi5wYXJlbnROb2RlKXx8YikpKXtpZihpLnNwbGljZShmLDEpLGE9ZS5sZW5ndGgmJnNhKGkpLCFhKXJldHVybiBHLmFwcGx5KGMsZSksYzticmVha319fXJldHVybihtfHxoKGEsbikpKGUsYiwhcCxjLCFifHwkLnRlc3QoYSkmJnFhKGIucGFyZW50Tm9kZSl8fGIpLGN9LGMuc29ydFN0YWJsZT11LnNwbGl0KFwiXCIpLnNvcnQoQikuam9pbihcIlwiKT09PXUsYy5kZXRlY3REdXBsaWNhdGVzPSEhbCxtKCksYy5zb3J0RGV0YWNoZWQ9amEoZnVuY3Rpb24oYSl7cmV0dXJuIDEmYS5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbihuLmNyZWF0ZUVsZW1lbnQoXCJmaWVsZHNldFwiKSl9KSxqYShmdW5jdGlvbihhKXtyZXR1cm4gYS5pbm5lckhUTUw9XCI8YSBocmVmPScjJz48L2E+XCIsXCIjXCI9PT1hLmZpcnN0Q2hpbGQuZ2V0QXR0cmlidXRlKFwiaHJlZlwiKX0pfHxrYShcInR5cGV8aHJlZnxoZWlnaHR8d2lkdGhcIixmdW5jdGlvbihhLGIsYyl7aWYoIWMpcmV0dXJuIGEuZ2V0QXR0cmlidXRlKGIsXCJ0eXBlXCI9PT1iLnRvTG93ZXJDYXNlKCk/MToyKX0pLGMuYXR0cmlidXRlcyYmamEoZnVuY3Rpb24oYSl7cmV0dXJuIGEuaW5uZXJIVE1MPVwiPGlucHV0Lz5cIixhLmZpcnN0Q2hpbGQuc2V0QXR0cmlidXRlKFwidmFsdWVcIixcIlwiKSxcIlwiPT09YS5maXJzdENoaWxkLmdldEF0dHJpYnV0ZShcInZhbHVlXCIpfSl8fGthKFwidmFsdWVcIixmdW5jdGlvbihhLGIsYyl7aWYoIWMmJlwiaW5wdXRcIj09PWEubm9kZU5hbWUudG9Mb3dlckNhc2UoKSlyZXR1cm4gYS5kZWZhdWx0VmFsdWV9KSxqYShmdW5jdGlvbihhKXtyZXR1cm4gbnVsbD09YS5nZXRBdHRyaWJ1dGUoXCJkaXNhYmxlZFwiKX0pfHxrYShKLGZ1bmN0aW9uKGEsYixjKXt2YXIgZDtpZighYylyZXR1cm4gYVtiXT09PSEwP2IudG9Mb3dlckNhc2UoKTooZD1hLmdldEF0dHJpYnV0ZU5vZGUoYikpJiZkLnNwZWNpZmllZD9kLnZhbHVlOm51bGx9KSxnYX0oYSk7ci5maW5kPXgsci5leHByPXguc2VsZWN0b3JzLHIuZXhwcltcIjpcIl09ci5leHByLnBzZXVkb3Msci51bmlxdWVTb3J0PXIudW5pcXVlPXgudW5pcXVlU29ydCxyLnRleHQ9eC5nZXRUZXh0LHIuaXNYTUxEb2M9eC5pc1hNTCxyLmNvbnRhaW5zPXguY29udGFpbnMsci5lc2NhcGVTZWxlY3Rvcj14LmVzY2FwZTt2YXIgeT1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9W10sZT12b2lkIDAhPT1jO3doaWxlKChhPWFbYl0pJiY5IT09YS5ub2RlVHlwZSlpZigxPT09YS5ub2RlVHlwZSl7aWYoZSYmcihhKS5pcyhjKSlicmVhaztkLnB1c2goYSl9cmV0dXJuIGR9LHo9ZnVuY3Rpb24oYSxiKXtmb3IodmFyIGM9W107YTthPWEubmV4dFNpYmxpbmcpMT09PWEubm9kZVR5cGUmJmEhPT1iJiZjLnB1c2goYSk7cmV0dXJuIGN9LEE9ci5leHByLm1hdGNoLm5lZWRzQ29udGV4dDtmdW5jdGlvbiBCKGEsYil7cmV0dXJuIGEubm9kZU5hbWUmJmEubm9kZU5hbWUudG9Mb3dlckNhc2UoKT09PWIudG9Mb3dlckNhc2UoKX12YXIgQz0vXjwoW2Etel1bXlxcL1xcMD46XFx4MjBcXHRcXHJcXG5cXGZdKilbXFx4MjBcXHRcXHJcXG5cXGZdKlxcLz8+KD86PFxcL1xcMT58KSQvaSxEPS9eLlteOiNcXFtcXC4sXSokLztmdW5jdGlvbiBFKGEsYixjKXtyZXR1cm4gci5pc0Z1bmN0aW9uKGIpP3IuZ3JlcChhLGZ1bmN0aW9uKGEsZCl7cmV0dXJuISFiLmNhbGwoYSxkLGEpIT09Y30pOmIubm9kZVR5cGU/ci5ncmVwKGEsZnVuY3Rpb24oYSl7cmV0dXJuIGE9PT1iIT09Y30pOlwic3RyaW5nXCIhPXR5cGVvZiBiP3IuZ3JlcChhLGZ1bmN0aW9uKGEpe3JldHVybiBpLmNhbGwoYixhKT4tMSE9PWN9KTpELnRlc3QoYik/ci5maWx0ZXIoYixhLGMpOihiPXIuZmlsdGVyKGIsYSksci5ncmVwKGEsZnVuY3Rpb24oYSl7cmV0dXJuIGkuY2FsbChiLGEpPi0xIT09YyYmMT09PWEubm9kZVR5cGV9KSl9ci5maWx0ZXI9ZnVuY3Rpb24oYSxiLGMpe3ZhciBkPWJbMF07cmV0dXJuIGMmJihhPVwiOm5vdChcIithK1wiKVwiKSwxPT09Yi5sZW5ndGgmJjE9PT1kLm5vZGVUeXBlP3IuZmluZC5tYXRjaGVzU2VsZWN0b3IoZCxhKT9bZF06W106ci5maW5kLm1hdGNoZXMoYSxyLmdyZXAoYixmdW5jdGlvbihhKXtyZXR1cm4gMT09PWEubm9kZVR5cGV9KSl9LHIuZm4uZXh0ZW5kKHtmaW5kOmZ1bmN0aW9uKGEpe3ZhciBiLGMsZD10aGlzLmxlbmd0aCxlPXRoaXM7aWYoXCJzdHJpbmdcIiE9dHlwZW9mIGEpcmV0dXJuIHRoaXMucHVzaFN0YWNrKHIoYSkuZmlsdGVyKGZ1bmN0aW9uKCl7Zm9yKGI9MDtiPGQ7YisrKWlmKHIuY29udGFpbnMoZVtiXSx0aGlzKSlyZXR1cm4hMH0pKTtmb3IoYz10aGlzLnB1c2hTdGFjayhbXSksYj0wO2I8ZDtiKyspci5maW5kKGEsZVtiXSxjKTtyZXR1cm4gZD4xP3IudW5pcXVlU29ydChjKTpjfSxmaWx0ZXI6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMucHVzaFN0YWNrKEUodGhpcyxhfHxbXSwhMSkpfSxub3Q6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMucHVzaFN0YWNrKEUodGhpcyxhfHxbXSwhMCkpfSxpczpmdW5jdGlvbihhKXtyZXR1cm4hIUUodGhpcyxcInN0cmluZ1wiPT10eXBlb2YgYSYmQS50ZXN0KGEpP3IoYSk6YXx8W10sITEpLmxlbmd0aH19KTt2YXIgRixHPS9eKD86XFxzKig8W1xcd1xcV10rPilbXj5dKnwjKFtcXHctXSspKSQvLEg9ci5mbi5pbml0PWZ1bmN0aW9uKGEsYixjKXt2YXIgZSxmO2lmKCFhKXJldHVybiB0aGlzO2lmKGM9Y3x8RixcInN0cmluZ1wiPT10eXBlb2YgYSl7aWYoZT1cIjxcIj09PWFbMF0mJlwiPlwiPT09YVthLmxlbmd0aC0xXSYmYS5sZW5ndGg+PTM/W251bGwsYSxudWxsXTpHLmV4ZWMoYSksIWV8fCFlWzFdJiZiKXJldHVybiFifHxiLmpxdWVyeT8oYnx8YykuZmluZChhKTp0aGlzLmNvbnN0cnVjdG9yKGIpLmZpbmQoYSk7aWYoZVsxXSl7aWYoYj1iIGluc3RhbmNlb2Ygcj9iWzBdOmIsci5tZXJnZSh0aGlzLHIucGFyc2VIVE1MKGVbMV0sYiYmYi5ub2RlVHlwZT9iLm93bmVyRG9jdW1lbnR8fGI6ZCwhMCkpLEMudGVzdChlWzFdKSYmci5pc1BsYWluT2JqZWN0KGIpKWZvcihlIGluIGIpci5pc0Z1bmN0aW9uKHRoaXNbZV0pP3RoaXNbZV0oYltlXSk6dGhpcy5hdHRyKGUsYltlXSk7cmV0dXJuIHRoaXN9cmV0dXJuIGY9ZC5nZXRFbGVtZW50QnlJZChlWzJdKSxmJiYodGhpc1swXT1mLHRoaXMubGVuZ3RoPTEpLHRoaXN9cmV0dXJuIGEubm9kZVR5cGU/KHRoaXNbMF09YSx0aGlzLmxlbmd0aD0xLHRoaXMpOnIuaXNGdW5jdGlvbihhKT92b2lkIDAhPT1jLnJlYWR5P2MucmVhZHkoYSk6YShyKTpyLm1ha2VBcnJheShhLHRoaXMpfTtILnByb3RvdHlwZT1yLmZuLEY9cihkKTt2YXIgST0vXig/OnBhcmVudHN8cHJldig/OlVudGlsfEFsbCkpLyxKPXtjaGlsZHJlbjohMCxjb250ZW50czohMCxuZXh0OiEwLHByZXY6ITB9O3IuZm4uZXh0ZW5kKHtoYXM6ZnVuY3Rpb24oYSl7dmFyIGI9cihhLHRoaXMpLGM9Yi5sZW5ndGg7cmV0dXJuIHRoaXMuZmlsdGVyKGZ1bmN0aW9uKCl7Zm9yKHZhciBhPTA7YTxjO2ErKylpZihyLmNvbnRhaW5zKHRoaXMsYlthXSkpcmV0dXJuITB9KX0sY2xvc2VzdDpmdW5jdGlvbihhLGIpe3ZhciBjLGQ9MCxlPXRoaXMubGVuZ3RoLGY9W10sZz1cInN0cmluZ1wiIT10eXBlb2YgYSYmcihhKTtpZighQS50ZXN0KGEpKWZvcig7ZDxlO2QrKylmb3IoYz10aGlzW2RdO2MmJmMhPT1iO2M9Yy5wYXJlbnROb2RlKWlmKGMubm9kZVR5cGU8MTEmJihnP2cuaW5kZXgoYyk+LTE6MT09PWMubm9kZVR5cGUmJnIuZmluZC5tYXRjaGVzU2VsZWN0b3IoYyxhKSkpe2YucHVzaChjKTticmVha31yZXR1cm4gdGhpcy5wdXNoU3RhY2soZi5sZW5ndGg+MT9yLnVuaXF1ZVNvcnQoZik6Zil9LGluZGV4OmZ1bmN0aW9uKGEpe3JldHVybiBhP1wic3RyaW5nXCI9PXR5cGVvZiBhP2kuY2FsbChyKGEpLHRoaXNbMF0pOmkuY2FsbCh0aGlzLGEuanF1ZXJ5P2FbMF06YSk6dGhpc1swXSYmdGhpc1swXS5wYXJlbnROb2RlP3RoaXMuZmlyc3QoKS5wcmV2QWxsKCkubGVuZ3RoOi0xfSxhZGQ6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5wdXNoU3RhY2soci51bmlxdWVTb3J0KHIubWVyZ2UodGhpcy5nZXQoKSxyKGEsYikpKSl9LGFkZEJhY2s6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuYWRkKG51bGw9PWE/dGhpcy5wcmV2T2JqZWN0OnRoaXMucHJldk9iamVjdC5maWx0ZXIoYSkpfX0pO2Z1bmN0aW9uIEsoYSxiKXt3aGlsZSgoYT1hW2JdKSYmMSE9PWEubm9kZVR5cGUpO3JldHVybiBhfXIuZWFjaCh7cGFyZW50OmZ1bmN0aW9uKGEpe3ZhciBiPWEucGFyZW50Tm9kZTtyZXR1cm4gYiYmMTEhPT1iLm5vZGVUeXBlP2I6bnVsbH0scGFyZW50czpmdW5jdGlvbihhKXtyZXR1cm4geShhLFwicGFyZW50Tm9kZVwiKX0scGFyZW50c1VudGlsOmZ1bmN0aW9uKGEsYixjKXtyZXR1cm4geShhLFwicGFyZW50Tm9kZVwiLGMpfSxuZXh0OmZ1bmN0aW9uKGEpe3JldHVybiBLKGEsXCJuZXh0U2libGluZ1wiKX0scHJldjpmdW5jdGlvbihhKXtyZXR1cm4gSyhhLFwicHJldmlvdXNTaWJsaW5nXCIpfSxuZXh0QWxsOmZ1bmN0aW9uKGEpe3JldHVybiB5KGEsXCJuZXh0U2libGluZ1wiKX0scHJldkFsbDpmdW5jdGlvbihhKXtyZXR1cm4geShhLFwicHJldmlvdXNTaWJsaW5nXCIpfSxuZXh0VW50aWw6ZnVuY3Rpb24oYSxiLGMpe3JldHVybiB5KGEsXCJuZXh0U2libGluZ1wiLGMpfSxwcmV2VW50aWw6ZnVuY3Rpb24oYSxiLGMpe3JldHVybiB5KGEsXCJwcmV2aW91c1NpYmxpbmdcIixjKX0sc2libGluZ3M6ZnVuY3Rpb24oYSl7cmV0dXJuIHooKGEucGFyZW50Tm9kZXx8e30pLmZpcnN0Q2hpbGQsYSl9LGNoaWxkcmVuOmZ1bmN0aW9uKGEpe3JldHVybiB6KGEuZmlyc3RDaGlsZCl9LGNvbnRlbnRzOmZ1bmN0aW9uKGEpe3JldHVybiBCKGEsXCJpZnJhbWVcIik/YS5jb250ZW50RG9jdW1lbnQ6KEIoYSxcInRlbXBsYXRlXCIpJiYoYT1hLmNvbnRlbnR8fGEpLHIubWVyZ2UoW10sYS5jaGlsZE5vZGVzKSl9fSxmdW5jdGlvbihhLGIpe3IuZm5bYV09ZnVuY3Rpb24oYyxkKXt2YXIgZT1yLm1hcCh0aGlzLGIsYyk7cmV0dXJuXCJVbnRpbFwiIT09YS5zbGljZSgtNSkmJihkPWMpLGQmJlwic3RyaW5nXCI9PXR5cGVvZiBkJiYoZT1yLmZpbHRlcihkLGUpKSx0aGlzLmxlbmd0aD4xJiYoSlthXXx8ci51bmlxdWVTb3J0KGUpLEkudGVzdChhKSYmZS5yZXZlcnNlKCkpLHRoaXMucHVzaFN0YWNrKGUpfX0pO3ZhciBMPS9bXlxceDIwXFx0XFxyXFxuXFxmXSsvZztmdW5jdGlvbiBNKGEpe3ZhciBiPXt9O3JldHVybiByLmVhY2goYS5tYXRjaChMKXx8W10sZnVuY3Rpb24oYSxjKXtiW2NdPSEwfSksYn1yLkNhbGxiYWNrcz1mdW5jdGlvbihhKXthPVwic3RyaW5nXCI9PXR5cGVvZiBhP00oYSk6ci5leHRlbmQoe30sYSk7dmFyIGIsYyxkLGUsZj1bXSxnPVtdLGg9LTEsaT1mdW5jdGlvbigpe2ZvcihlPWV8fGEub25jZSxkPWI9ITA7Zy5sZW5ndGg7aD0tMSl7Yz1nLnNoaWZ0KCk7d2hpbGUoKytoPGYubGVuZ3RoKWZbaF0uYXBwbHkoY1swXSxjWzFdKT09PSExJiZhLnN0b3BPbkZhbHNlJiYoaD1mLmxlbmd0aCxjPSExKX1hLm1lbW9yeXx8KGM9ITEpLGI9ITEsZSYmKGY9Yz9bXTpcIlwiKX0saj17YWRkOmZ1bmN0aW9uKCl7cmV0dXJuIGYmJihjJiYhYiYmKGg9Zi5sZW5ndGgtMSxnLnB1c2goYykpLGZ1bmN0aW9uIGQoYil7ci5lYWNoKGIsZnVuY3Rpb24oYixjKXtyLmlzRnVuY3Rpb24oYyk/YS51bmlxdWUmJmouaGFzKGMpfHxmLnB1c2goYyk6YyYmYy5sZW5ndGgmJlwic3RyaW5nXCIhPT1yLnR5cGUoYykmJmQoYyl9KX0oYXJndW1lbnRzKSxjJiYhYiYmaSgpKSx0aGlzfSxyZW1vdmU6ZnVuY3Rpb24oKXtyZXR1cm4gci5lYWNoKGFyZ3VtZW50cyxmdW5jdGlvbihhLGIpe3ZhciBjO3doaWxlKChjPXIuaW5BcnJheShiLGYsYykpPi0xKWYuc3BsaWNlKGMsMSksYzw9aCYmaC0tfSksdGhpc30saGFzOmZ1bmN0aW9uKGEpe3JldHVybiBhP3IuaW5BcnJheShhLGYpPi0xOmYubGVuZ3RoPjB9LGVtcHR5OmZ1bmN0aW9uKCl7cmV0dXJuIGYmJihmPVtdKSx0aGlzfSxkaXNhYmxlOmZ1bmN0aW9uKCl7cmV0dXJuIGU9Zz1bXSxmPWM9XCJcIix0aGlzfSxkaXNhYmxlZDpmdW5jdGlvbigpe3JldHVybiFmfSxsb2NrOmZ1bmN0aW9uKCl7cmV0dXJuIGU9Zz1bXSxjfHxifHwoZj1jPVwiXCIpLHRoaXN9LGxvY2tlZDpmdW5jdGlvbigpe3JldHVybiEhZX0sZmlyZVdpdGg6ZnVuY3Rpb24oYSxjKXtyZXR1cm4gZXx8KGM9Y3x8W10sYz1bYSxjLnNsaWNlP2Muc2xpY2UoKTpjXSxnLnB1c2goYyksYnx8aSgpKSx0aGlzfSxmaXJlOmZ1bmN0aW9uKCl7cmV0dXJuIGouZmlyZVdpdGgodGhpcyxhcmd1bWVudHMpLHRoaXN9LGZpcmVkOmZ1bmN0aW9uKCl7cmV0dXJuISFkfX07cmV0dXJuIGp9O2Z1bmN0aW9uIE4oYSl7cmV0dXJuIGF9ZnVuY3Rpb24gTyhhKXt0aHJvdyBhfWZ1bmN0aW9uIFAoYSxiLGMsZCl7dmFyIGU7dHJ5e2EmJnIuaXNGdW5jdGlvbihlPWEucHJvbWlzZSk/ZS5jYWxsKGEpLmRvbmUoYikuZmFpbChjKTphJiZyLmlzRnVuY3Rpb24oZT1hLnRoZW4pP2UuY2FsbChhLGIsYyk6Yi5hcHBseSh2b2lkIDAsW2FdLnNsaWNlKGQpKX1jYXRjaChhKXtjLmFwcGx5KHZvaWQgMCxbYV0pfX1yLmV4dGVuZCh7RGVmZXJyZWQ6ZnVuY3Rpb24oYil7dmFyIGM9W1tcIm5vdGlmeVwiLFwicHJvZ3Jlc3NcIixyLkNhbGxiYWNrcyhcIm1lbW9yeVwiKSxyLkNhbGxiYWNrcyhcIm1lbW9yeVwiKSwyXSxbXCJyZXNvbHZlXCIsXCJkb25lXCIsci5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSxyLkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLDAsXCJyZXNvbHZlZFwiXSxbXCJyZWplY3RcIixcImZhaWxcIixyLkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLHIuQ2FsbGJhY2tzKFwib25jZSBtZW1vcnlcIiksMSxcInJlamVjdGVkXCJdXSxkPVwicGVuZGluZ1wiLGU9e3N0YXRlOmZ1bmN0aW9uKCl7cmV0dXJuIGR9LGFsd2F5czpmdW5jdGlvbigpe3JldHVybiBmLmRvbmUoYXJndW1lbnRzKS5mYWlsKGFyZ3VtZW50cyksdGhpc30sXCJjYXRjaFwiOmZ1bmN0aW9uKGEpe3JldHVybiBlLnRoZW4obnVsbCxhKX0scGlwZTpmdW5jdGlvbigpe3ZhciBhPWFyZ3VtZW50cztyZXR1cm4gci5EZWZlcnJlZChmdW5jdGlvbihiKXtyLmVhY2goYyxmdW5jdGlvbihjLGQpe3ZhciBlPXIuaXNGdW5jdGlvbihhW2RbNF1dKSYmYVtkWzRdXTtmW2RbMV1dKGZ1bmN0aW9uKCl7dmFyIGE9ZSYmZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7YSYmci5pc0Z1bmN0aW9uKGEucHJvbWlzZSk/YS5wcm9taXNlKCkucHJvZ3Jlc3MoYi5ub3RpZnkpLmRvbmUoYi5yZXNvbHZlKS5mYWlsKGIucmVqZWN0KTpiW2RbMF0rXCJXaXRoXCJdKHRoaXMsZT9bYV06YXJndW1lbnRzKX0pfSksYT1udWxsfSkucHJvbWlzZSgpfSx0aGVuOmZ1bmN0aW9uKGIsZCxlKXt2YXIgZj0wO2Z1bmN0aW9uIGcoYixjLGQsZSl7cmV0dXJuIGZ1bmN0aW9uKCl7dmFyIGg9dGhpcyxpPWFyZ3VtZW50cyxqPWZ1bmN0aW9uKCl7dmFyIGEsajtpZighKGI8Zikpe2lmKGE9ZC5hcHBseShoLGkpLGE9PT1jLnByb21pc2UoKSl0aHJvdyBuZXcgVHlwZUVycm9yKFwiVGhlbmFibGUgc2VsZi1yZXNvbHV0aW9uXCIpO2o9YSYmKFwib2JqZWN0XCI9PXR5cGVvZiBhfHxcImZ1bmN0aW9uXCI9PXR5cGVvZiBhKSYmYS50aGVuLHIuaXNGdW5jdGlvbihqKT9lP2ouY2FsbChhLGcoZixjLE4sZSksZyhmLGMsTyxlKSk6KGYrKyxqLmNhbGwoYSxnKGYsYyxOLGUpLGcoZixjLE8sZSksZyhmLGMsTixjLm5vdGlmeVdpdGgpKSk6KGQhPT1OJiYoaD12b2lkIDAsaT1bYV0pLChlfHxjLnJlc29sdmVXaXRoKShoLGkpKX19LGs9ZT9qOmZ1bmN0aW9uKCl7dHJ5e2ooKX1jYXRjaChhKXtyLkRlZmVycmVkLmV4Y2VwdGlvbkhvb2smJnIuRGVmZXJyZWQuZXhjZXB0aW9uSG9vayhhLGsuc3RhY2tUcmFjZSksYisxPj1mJiYoZCE9PU8mJihoPXZvaWQgMCxpPVthXSksYy5yZWplY3RXaXRoKGgsaSkpfX07Yj9rKCk6KHIuRGVmZXJyZWQuZ2V0U3RhY2tIb29rJiYoay5zdGFja1RyYWNlPXIuRGVmZXJyZWQuZ2V0U3RhY2tIb29rKCkpLGEuc2V0VGltZW91dChrKSl9fXJldHVybiByLkRlZmVycmVkKGZ1bmN0aW9uKGEpe2NbMF1bM10uYWRkKGcoMCxhLHIuaXNGdW5jdGlvbihlKT9lOk4sYS5ub3RpZnlXaXRoKSksY1sxXVszXS5hZGQoZygwLGEsci5pc0Z1bmN0aW9uKGIpP2I6TikpLGNbMl1bM10uYWRkKGcoMCxhLHIuaXNGdW5jdGlvbihkKT9kOk8pKX0pLnByb21pc2UoKX0scHJvbWlzZTpmdW5jdGlvbihhKXtyZXR1cm4gbnVsbCE9YT9yLmV4dGVuZChhLGUpOmV9fSxmPXt9O3JldHVybiByLmVhY2goYyxmdW5jdGlvbihhLGIpe3ZhciBnPWJbMl0saD1iWzVdO2VbYlsxXV09Zy5hZGQsaCYmZy5hZGQoZnVuY3Rpb24oKXtkPWh9LGNbMy1hXVsyXS5kaXNhYmxlLGNbMF1bMl0ubG9jayksZy5hZGQoYlszXS5maXJlKSxmW2JbMF1dPWZ1bmN0aW9uKCl7cmV0dXJuIGZbYlswXStcIldpdGhcIl0odGhpcz09PWY/dm9pZCAwOnRoaXMsYXJndW1lbnRzKSx0aGlzfSxmW2JbMF0rXCJXaXRoXCJdPWcuZmlyZVdpdGh9KSxlLnByb21pc2UoZiksYiYmYi5jYWxsKGYsZiksZn0sd2hlbjpmdW5jdGlvbihhKXt2YXIgYj1hcmd1bWVudHMubGVuZ3RoLGM9YixkPUFycmF5KGMpLGU9Zi5jYWxsKGFyZ3VtZW50cyksZz1yLkRlZmVycmVkKCksaD1mdW5jdGlvbihhKXtyZXR1cm4gZnVuY3Rpb24oYyl7ZFthXT10aGlzLGVbYV09YXJndW1lbnRzLmxlbmd0aD4xP2YuY2FsbChhcmd1bWVudHMpOmMsLS1ifHxnLnJlc29sdmVXaXRoKGQsZSl9fTtpZihiPD0xJiYoUChhLGcuZG9uZShoKGMpKS5yZXNvbHZlLGcucmVqZWN0LCFiKSxcInBlbmRpbmdcIj09PWcuc3RhdGUoKXx8ci5pc0Z1bmN0aW9uKGVbY10mJmVbY10udGhlbikpKXJldHVybiBnLnRoZW4oKTt3aGlsZShjLS0pUChlW2NdLGgoYyksZy5yZWplY3QpO3JldHVybiBnLnByb21pc2UoKX19KTt2YXIgUT0vXihFdmFsfEludGVybmFsfFJhbmdlfFJlZmVyZW5jZXxTeW50YXh8VHlwZXxVUkkpRXJyb3IkLztyLkRlZmVycmVkLmV4Y2VwdGlvbkhvb2s9ZnVuY3Rpb24oYixjKXthLmNvbnNvbGUmJmEuY29uc29sZS53YXJuJiZiJiZRLnRlc3QoYi5uYW1lKSYmYS5jb25zb2xlLndhcm4oXCJqUXVlcnkuRGVmZXJyZWQgZXhjZXB0aW9uOiBcIitiLm1lc3NhZ2UsYi5zdGFjayxjKX0sci5yZWFkeUV4Y2VwdGlvbj1mdW5jdGlvbihiKXthLnNldFRpbWVvdXQoZnVuY3Rpb24oKXt0aHJvdyBifSl9O3ZhciBSPXIuRGVmZXJyZWQoKTtyLmZuLnJlYWR5PWZ1bmN0aW9uKGEpe3JldHVybiBSLnRoZW4oYSlbXCJjYXRjaFwiXShmdW5jdGlvbihhKXtyLnJlYWR5RXhjZXB0aW9uKGEpfSksdGhpc30sci5leHRlbmQoe2lzUmVhZHk6ITEscmVhZHlXYWl0OjEscmVhZHk6ZnVuY3Rpb24oYSl7KGE9PT0hMD8tLXIucmVhZHlXYWl0OnIuaXNSZWFkeSl8fChyLmlzUmVhZHk9ITAsYSE9PSEwJiYtLXIucmVhZHlXYWl0PjB8fFIucmVzb2x2ZVdpdGgoZCxbcl0pKX19KSxyLnJlYWR5LnRoZW49Ui50aGVuO2Z1bmN0aW9uIFMoKXtkLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsUyksXG5hLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsUyksci5yZWFkeSgpfVwiY29tcGxldGVcIj09PWQucmVhZHlTdGF0ZXx8XCJsb2FkaW5nXCIhPT1kLnJlYWR5U3RhdGUmJiFkLmRvY3VtZW50RWxlbWVudC5kb1Njcm9sbD9hLnNldFRpbWVvdXQoci5yZWFkeSk6KGQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTUNvbnRlbnRMb2FkZWRcIixTKSxhLmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsUykpO3ZhciBUPWZ1bmN0aW9uKGEsYixjLGQsZSxmLGcpe3ZhciBoPTAsaT1hLmxlbmd0aCxqPW51bGw9PWM7aWYoXCJvYmplY3RcIj09PXIudHlwZShjKSl7ZT0hMDtmb3IoaCBpbiBjKVQoYSxiLGgsY1toXSwhMCxmLGcpfWVsc2UgaWYodm9pZCAwIT09ZCYmKGU9ITAsci5pc0Z1bmN0aW9uKGQpfHwoZz0hMCksaiYmKGc/KGIuY2FsbChhLGQpLGI9bnVsbCk6KGo9YixiPWZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gai5jYWxsKHIoYSksYyl9KSksYikpZm9yKDtoPGk7aCsrKWIoYVtoXSxjLGc/ZDpkLmNhbGwoYVtoXSxoLGIoYVtoXSxjKSkpO3JldHVybiBlP2E6aj9iLmNhbGwoYSk6aT9iKGFbMF0sYyk6Zn0sVT1mdW5jdGlvbihhKXtyZXR1cm4gMT09PWEubm9kZVR5cGV8fDk9PT1hLm5vZGVUeXBlfHwhK2Eubm9kZVR5cGV9O2Z1bmN0aW9uIFYoKXt0aGlzLmV4cGFuZG89ci5leHBhbmRvK1YudWlkKyt9Vi51aWQ9MSxWLnByb3RvdHlwZT17Y2FjaGU6ZnVuY3Rpb24oYSl7dmFyIGI9YVt0aGlzLmV4cGFuZG9dO3JldHVybiBifHwoYj17fSxVKGEpJiYoYS5ub2RlVHlwZT9hW3RoaXMuZXhwYW5kb109YjpPYmplY3QuZGVmaW5lUHJvcGVydHkoYSx0aGlzLmV4cGFuZG8se3ZhbHVlOmIsY29uZmlndXJhYmxlOiEwfSkpKSxifSxzZXQ6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkLGU9dGhpcy5jYWNoZShhKTtpZihcInN0cmluZ1wiPT10eXBlb2YgYillW3IuY2FtZWxDYXNlKGIpXT1jO2Vsc2UgZm9yKGQgaW4gYillW3IuY2FtZWxDYXNlKGQpXT1iW2RdO3JldHVybiBlfSxnZXQ6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdm9pZCAwPT09Yj90aGlzLmNhY2hlKGEpOmFbdGhpcy5leHBhbmRvXSYmYVt0aGlzLmV4cGFuZG9dW3IuY2FtZWxDYXNlKGIpXX0sYWNjZXNzOmZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gdm9pZCAwPT09Ynx8YiYmXCJzdHJpbmdcIj09dHlwZW9mIGImJnZvaWQgMD09PWM/dGhpcy5nZXQoYSxiKToodGhpcy5zZXQoYSxiLGMpLHZvaWQgMCE9PWM/YzpiKX0scmVtb3ZlOmZ1bmN0aW9uKGEsYil7dmFyIGMsZD1hW3RoaXMuZXhwYW5kb107aWYodm9pZCAwIT09ZCl7aWYodm9pZCAwIT09Yil7QXJyYXkuaXNBcnJheShiKT9iPWIubWFwKHIuY2FtZWxDYXNlKTooYj1yLmNhbWVsQ2FzZShiKSxiPWIgaW4gZD9bYl06Yi5tYXRjaChMKXx8W10pLGM9Yi5sZW5ndGg7d2hpbGUoYy0tKWRlbGV0ZSBkW2JbY11dfSh2b2lkIDA9PT1ifHxyLmlzRW1wdHlPYmplY3QoZCkpJiYoYS5ub2RlVHlwZT9hW3RoaXMuZXhwYW5kb109dm9pZCAwOmRlbGV0ZSBhW3RoaXMuZXhwYW5kb10pfX0saGFzRGF0YTpmdW5jdGlvbihhKXt2YXIgYj1hW3RoaXMuZXhwYW5kb107cmV0dXJuIHZvaWQgMCE9PWImJiFyLmlzRW1wdHlPYmplY3QoYil9fTt2YXIgVz1uZXcgVixYPW5ldyBWLFk9L14oPzpcXHtbXFx3XFxXXSpcXH18XFxbW1xcd1xcV10qXFxdKSQvLFo9L1tBLVpdL2c7ZnVuY3Rpb24gJChhKXtyZXR1cm5cInRydWVcIj09PWF8fFwiZmFsc2VcIiE9PWEmJihcIm51bGxcIj09PWE/bnVsbDphPT09K2ErXCJcIj8rYTpZLnRlc3QoYSk/SlNPTi5wYXJzZShhKTphKX1mdW5jdGlvbiBfKGEsYixjKXt2YXIgZDtpZih2b2lkIDA9PT1jJiYxPT09YS5ub2RlVHlwZSlpZihkPVwiZGF0YS1cIitiLnJlcGxhY2UoWixcIi0kJlwiKS50b0xvd2VyQ2FzZSgpLGM9YS5nZXRBdHRyaWJ1dGUoZCksXCJzdHJpbmdcIj09dHlwZW9mIGMpe3RyeXtjPSQoYyl9Y2F0Y2goZSl7fVguc2V0KGEsYixjKX1lbHNlIGM9dm9pZCAwO3JldHVybiBjfXIuZXh0ZW5kKHtoYXNEYXRhOmZ1bmN0aW9uKGEpe3JldHVybiBYLmhhc0RhdGEoYSl8fFcuaGFzRGF0YShhKX0sZGF0YTpmdW5jdGlvbihhLGIsYyl7cmV0dXJuIFguYWNjZXNzKGEsYixjKX0scmVtb3ZlRGF0YTpmdW5jdGlvbihhLGIpe1gucmVtb3ZlKGEsYil9LF9kYXRhOmZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gVy5hY2Nlc3MoYSxiLGMpfSxfcmVtb3ZlRGF0YTpmdW5jdGlvbihhLGIpe1cucmVtb3ZlKGEsYil9fSksci5mbi5leHRlbmQoe2RhdGE6ZnVuY3Rpb24oYSxiKXt2YXIgYyxkLGUsZj10aGlzWzBdLGc9ZiYmZi5hdHRyaWJ1dGVzO2lmKHZvaWQgMD09PWEpe2lmKHRoaXMubGVuZ3RoJiYoZT1YLmdldChmKSwxPT09Zi5ub2RlVHlwZSYmIVcuZ2V0KGYsXCJoYXNEYXRhQXR0cnNcIikpKXtjPWcubGVuZ3RoO3doaWxlKGMtLSlnW2NdJiYoZD1nW2NdLm5hbWUsMD09PWQuaW5kZXhPZihcImRhdGEtXCIpJiYoZD1yLmNhbWVsQ2FzZShkLnNsaWNlKDUpKSxfKGYsZCxlW2RdKSkpO1cuc2V0KGYsXCJoYXNEYXRhQXR0cnNcIiwhMCl9cmV0dXJuIGV9cmV0dXJuXCJvYmplY3RcIj09dHlwZW9mIGE/dGhpcy5lYWNoKGZ1bmN0aW9uKCl7WC5zZXQodGhpcyxhKX0pOlQodGhpcyxmdW5jdGlvbihiKXt2YXIgYztpZihmJiZ2b2lkIDA9PT1iKXtpZihjPVguZ2V0KGYsYSksdm9pZCAwIT09YylyZXR1cm4gYztpZihjPV8oZixhKSx2b2lkIDAhPT1jKXJldHVybiBjfWVsc2UgdGhpcy5lYWNoKGZ1bmN0aW9uKCl7WC5zZXQodGhpcyxhLGIpfSl9LG51bGwsYixhcmd1bWVudHMubGVuZ3RoPjEsbnVsbCwhMCl9LHJlbW92ZURhdGE6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpe1gucmVtb3ZlKHRoaXMsYSl9KX19KSxyLmV4dGVuZCh7cXVldWU6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkO2lmKGEpcmV0dXJuIGI9KGJ8fFwiZnhcIikrXCJxdWV1ZVwiLGQ9Vy5nZXQoYSxiKSxjJiYoIWR8fEFycmF5LmlzQXJyYXkoYyk/ZD1XLmFjY2VzcyhhLGIsci5tYWtlQXJyYXkoYykpOmQucHVzaChjKSksZHx8W119LGRlcXVldWU6ZnVuY3Rpb24oYSxiKXtiPWJ8fFwiZnhcIjt2YXIgYz1yLnF1ZXVlKGEsYiksZD1jLmxlbmd0aCxlPWMuc2hpZnQoKSxmPXIuX3F1ZXVlSG9va3MoYSxiKSxnPWZ1bmN0aW9uKCl7ci5kZXF1ZXVlKGEsYil9O1wiaW5wcm9ncmVzc1wiPT09ZSYmKGU9Yy5zaGlmdCgpLGQtLSksZSYmKFwiZnhcIj09PWImJmMudW5zaGlmdChcImlucHJvZ3Jlc3NcIiksZGVsZXRlIGYuc3RvcCxlLmNhbGwoYSxnLGYpKSwhZCYmZiYmZi5lbXB0eS5maXJlKCl9LF9xdWV1ZUhvb2tzOmZ1bmN0aW9uKGEsYil7dmFyIGM9YitcInF1ZXVlSG9va3NcIjtyZXR1cm4gVy5nZXQoYSxjKXx8Vy5hY2Nlc3MoYSxjLHtlbXB0eTpyLkNhbGxiYWNrcyhcIm9uY2UgbWVtb3J5XCIpLmFkZChmdW5jdGlvbigpe1cucmVtb3ZlKGEsW2IrXCJxdWV1ZVwiLGNdKX0pfSl9fSksci5mbi5leHRlbmQoe3F1ZXVlOmZ1bmN0aW9uKGEsYil7dmFyIGM9MjtyZXR1cm5cInN0cmluZ1wiIT10eXBlb2YgYSYmKGI9YSxhPVwiZnhcIixjLS0pLGFyZ3VtZW50cy5sZW5ndGg8Yz9yLnF1ZXVlKHRoaXNbMF0sYSk6dm9pZCAwPT09Yj90aGlzOnRoaXMuZWFjaChmdW5jdGlvbigpe3ZhciBjPXIucXVldWUodGhpcyxhLGIpO3IuX3F1ZXVlSG9va3ModGhpcyxhKSxcImZ4XCI9PT1hJiZcImlucHJvZ3Jlc3NcIiE9PWNbMF0mJnIuZGVxdWV1ZSh0aGlzLGEpfSl9LGRlcXVldWU6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpe3IuZGVxdWV1ZSh0aGlzLGEpfSl9LGNsZWFyUXVldWU6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMucXVldWUoYXx8XCJmeFwiLFtdKX0scHJvbWlzZTpmdW5jdGlvbihhLGIpe3ZhciBjLGQ9MSxlPXIuRGVmZXJyZWQoKSxmPXRoaXMsZz10aGlzLmxlbmd0aCxoPWZ1bmN0aW9uKCl7LS1kfHxlLnJlc29sdmVXaXRoKGYsW2ZdKX07XCJzdHJpbmdcIiE9dHlwZW9mIGEmJihiPWEsYT12b2lkIDApLGE9YXx8XCJmeFwiO3doaWxlKGctLSljPVcuZ2V0KGZbZ10sYStcInF1ZXVlSG9va3NcIiksYyYmYy5lbXB0eSYmKGQrKyxjLmVtcHR5LmFkZChoKSk7cmV0dXJuIGgoKSxlLnByb21pc2UoYil9fSk7dmFyIGFhPS9bKy1dPyg/OlxcZCpcXC58KVxcZCsoPzpbZUVdWystXT9cXGQrfCkvLnNvdXJjZSxiYT1uZXcgUmVnRXhwKFwiXig/OihbKy1dKT18KShcIithYStcIikoW2EteiVdKikkXCIsXCJpXCIpLGNhPVtcIlRvcFwiLFwiUmlnaHRcIixcIkJvdHRvbVwiLFwiTGVmdFwiXSxkYT1mdW5jdGlvbihhLGIpe3JldHVybiBhPWJ8fGEsXCJub25lXCI9PT1hLnN0eWxlLmRpc3BsYXl8fFwiXCI9PT1hLnN0eWxlLmRpc3BsYXkmJnIuY29udGFpbnMoYS5vd25lckRvY3VtZW50LGEpJiZcIm5vbmVcIj09PXIuY3NzKGEsXCJkaXNwbGF5XCIpfSxlYT1mdW5jdGlvbihhLGIsYyxkKXt2YXIgZSxmLGc9e307Zm9yKGYgaW4gYilnW2ZdPWEuc3R5bGVbZl0sYS5zdHlsZVtmXT1iW2ZdO2U9Yy5hcHBseShhLGR8fFtdKTtmb3IoZiBpbiBiKWEuc3R5bGVbZl09Z1tmXTtyZXR1cm4gZX07ZnVuY3Rpb24gZmEoYSxiLGMsZCl7dmFyIGUsZj0xLGc9MjAsaD1kP2Z1bmN0aW9uKCl7cmV0dXJuIGQuY3VyKCl9OmZ1bmN0aW9uKCl7cmV0dXJuIHIuY3NzKGEsYixcIlwiKX0saT1oKCksaj1jJiZjWzNdfHwoci5jc3NOdW1iZXJbYl0/XCJcIjpcInB4XCIpLGs9KHIuY3NzTnVtYmVyW2JdfHxcInB4XCIhPT1qJiYraSkmJmJhLmV4ZWMoci5jc3MoYSxiKSk7aWYoayYma1szXSE9PWope2o9anx8a1szXSxjPWN8fFtdLGs9K2l8fDE7ZG8gZj1mfHxcIi41XCIsay89ZixyLnN0eWxlKGEsYixrK2opO3doaWxlKGYhPT0oZj1oKCkvaSkmJjEhPT1mJiYtLWcpfXJldHVybiBjJiYoaz0ra3x8K2l8fDAsZT1jWzFdP2srKGNbMV0rMSkqY1syXTorY1syXSxkJiYoZC51bml0PWosZC5zdGFydD1rLGQuZW5kPWUpKSxlfXZhciBnYT17fTtmdW5jdGlvbiBoYShhKXt2YXIgYixjPWEub3duZXJEb2N1bWVudCxkPWEubm9kZU5hbWUsZT1nYVtkXTtyZXR1cm4gZT9lOihiPWMuYm9keS5hcHBlbmRDaGlsZChjLmNyZWF0ZUVsZW1lbnQoZCkpLGU9ci5jc3MoYixcImRpc3BsYXlcIiksYi5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGIpLFwibm9uZVwiPT09ZSYmKGU9XCJibG9ja1wiKSxnYVtkXT1lLGUpfWZ1bmN0aW9uIGlhKGEsYil7Zm9yKHZhciBjLGQsZT1bXSxmPTAsZz1hLmxlbmd0aDtmPGc7ZisrKWQ9YVtmXSxkLnN0eWxlJiYoYz1kLnN0eWxlLmRpc3BsYXksYj8oXCJub25lXCI9PT1jJiYoZVtmXT1XLmdldChkLFwiZGlzcGxheVwiKXx8bnVsbCxlW2ZdfHwoZC5zdHlsZS5kaXNwbGF5PVwiXCIpKSxcIlwiPT09ZC5zdHlsZS5kaXNwbGF5JiZkYShkKSYmKGVbZl09aGEoZCkpKTpcIm5vbmVcIiE9PWMmJihlW2ZdPVwibm9uZVwiLFcuc2V0KGQsXCJkaXNwbGF5XCIsYykpKTtmb3IoZj0wO2Y8ZztmKyspbnVsbCE9ZVtmXSYmKGFbZl0uc3R5bGUuZGlzcGxheT1lW2ZdKTtyZXR1cm4gYX1yLmZuLmV4dGVuZCh7c2hvdzpmdW5jdGlvbigpe3JldHVybiBpYSh0aGlzLCEwKX0saGlkZTpmdW5jdGlvbigpe3JldHVybiBpYSh0aGlzKX0sdG9nZ2xlOmZ1bmN0aW9uKGEpe3JldHVyblwiYm9vbGVhblwiPT10eXBlb2YgYT9hP3RoaXMuc2hvdygpOnRoaXMuaGlkZSgpOnRoaXMuZWFjaChmdW5jdGlvbigpe2RhKHRoaXMpP3IodGhpcykuc2hvdygpOnIodGhpcykuaGlkZSgpfSl9fSk7dmFyIGphPS9eKD86Y2hlY2tib3h8cmFkaW8pJC9pLGthPS88KFthLXpdW15cXC9cXDA+XFx4MjBcXHRcXHJcXG5cXGZdKykvaSxsYT0vXiR8XFwvKD86amF2YXxlY21hKXNjcmlwdC9pLG1hPXtvcHRpb246WzEsXCI8c2VsZWN0IG11bHRpcGxlPSdtdWx0aXBsZSc+XCIsXCI8L3NlbGVjdD5cIl0sdGhlYWQ6WzEsXCI8dGFibGU+XCIsXCI8L3RhYmxlPlwiXSxjb2w6WzIsXCI8dGFibGU+PGNvbGdyb3VwPlwiLFwiPC9jb2xncm91cD48L3RhYmxlPlwiXSx0cjpbMixcIjx0YWJsZT48dGJvZHk+XCIsXCI8L3Rib2R5PjwvdGFibGU+XCJdLHRkOlszLFwiPHRhYmxlPjx0Ym9keT48dHI+XCIsXCI8L3RyPjwvdGJvZHk+PC90YWJsZT5cIl0sX2RlZmF1bHQ6WzAsXCJcIixcIlwiXX07bWEub3B0Z3JvdXA9bWEub3B0aW9uLG1hLnRib2R5PW1hLnRmb290PW1hLmNvbGdyb3VwPW1hLmNhcHRpb249bWEudGhlYWQsbWEudGg9bWEudGQ7ZnVuY3Rpb24gbmEoYSxiKXt2YXIgYztyZXR1cm4gYz1cInVuZGVmaW5lZFwiIT10eXBlb2YgYS5nZXRFbGVtZW50c0J5VGFnTmFtZT9hLmdldEVsZW1lbnRzQnlUYWdOYW1lKGJ8fFwiKlwiKTpcInVuZGVmaW5lZFwiIT10eXBlb2YgYS5xdWVyeVNlbGVjdG9yQWxsP2EucXVlcnlTZWxlY3RvckFsbChifHxcIipcIik6W10sdm9pZCAwPT09Ynx8YiYmQihhLGIpP3IubWVyZ2UoW2FdLGMpOmN9ZnVuY3Rpb24gb2EoYSxiKXtmb3IodmFyIGM9MCxkPWEubGVuZ3RoO2M8ZDtjKyspVy5zZXQoYVtjXSxcImdsb2JhbEV2YWxcIiwhYnx8Vy5nZXQoYltjXSxcImdsb2JhbEV2YWxcIikpfXZhciBwYT0vPHwmIz9cXHcrOy87ZnVuY3Rpb24gcWEoYSxiLGMsZCxlKXtmb3IodmFyIGYsZyxoLGksaixrLGw9Yi5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCksbT1bXSxuPTAsbz1hLmxlbmd0aDtuPG87bisrKWlmKGY9YVtuXSxmfHwwPT09ZilpZihcIm9iamVjdFwiPT09ci50eXBlKGYpKXIubWVyZ2UobSxmLm5vZGVUeXBlP1tmXTpmKTtlbHNlIGlmKHBhLnRlc3QoZikpe2c9Z3x8bC5hcHBlbmRDaGlsZChiLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIikpLGg9KGthLmV4ZWMoZil8fFtcIlwiLFwiXCJdKVsxXS50b0xvd2VyQ2FzZSgpLGk9bWFbaF18fG1hLl9kZWZhdWx0LGcuaW5uZXJIVE1MPWlbMV0rci5odG1sUHJlZmlsdGVyKGYpK2lbMl0saz1pWzBdO3doaWxlKGstLSlnPWcubGFzdENoaWxkO3IubWVyZ2UobSxnLmNoaWxkTm9kZXMpLGc9bC5maXJzdENoaWxkLGcudGV4dENvbnRlbnQ9XCJcIn1lbHNlIG0ucHVzaChiLmNyZWF0ZVRleHROb2RlKGYpKTtsLnRleHRDb250ZW50PVwiXCIsbj0wO3doaWxlKGY9bVtuKytdKWlmKGQmJnIuaW5BcnJheShmLGQpPi0xKWUmJmUucHVzaChmKTtlbHNlIGlmKGo9ci5jb250YWlucyhmLm93bmVyRG9jdW1lbnQsZiksZz1uYShsLmFwcGVuZENoaWxkKGYpLFwic2NyaXB0XCIpLGomJm9hKGcpLGMpe2s9MDt3aGlsZShmPWdbaysrXSlsYS50ZXN0KGYudHlwZXx8XCJcIikmJmMucHVzaChmKX1yZXR1cm4gbH0hZnVuY3Rpb24oKXt2YXIgYT1kLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSxiPWEuYXBwZW5kQ2hpbGQoZC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpKSxjPWQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO2Muc2V0QXR0cmlidXRlKFwidHlwZVwiLFwicmFkaW9cIiksYy5zZXRBdHRyaWJ1dGUoXCJjaGVja2VkXCIsXCJjaGVja2VkXCIpLGMuc2V0QXR0cmlidXRlKFwibmFtZVwiLFwidFwiKSxiLmFwcGVuZENoaWxkKGMpLG8uY2hlY2tDbG9uZT1iLmNsb25lTm9kZSghMCkuY2xvbmVOb2RlKCEwKS5sYXN0Q2hpbGQuY2hlY2tlZCxiLmlubmVySFRNTD1cIjx0ZXh0YXJlYT54PC90ZXh0YXJlYT5cIixvLm5vQ2xvbmVDaGVja2VkPSEhYi5jbG9uZU5vZGUoITApLmxhc3RDaGlsZC5kZWZhdWx0VmFsdWV9KCk7dmFyIHJhPWQuZG9jdW1lbnRFbGVtZW50LHNhPS9ea2V5Lyx0YT0vXig/Om1vdXNlfHBvaW50ZXJ8Y29udGV4dG1lbnV8ZHJhZ3xkcm9wKXxjbGljay8sdWE9L14oW14uXSopKD86XFwuKC4rKXwpLztmdW5jdGlvbiB2YSgpe3JldHVybiEwfWZ1bmN0aW9uIHdhKCl7cmV0dXJuITF9ZnVuY3Rpb24geGEoKXt0cnl7cmV0dXJuIGQuYWN0aXZlRWxlbWVudH1jYXRjaChhKXt9fWZ1bmN0aW9uIHlhKGEsYixjLGQsZSxmKXt2YXIgZyxoO2lmKFwib2JqZWN0XCI9PXR5cGVvZiBiKXtcInN0cmluZ1wiIT10eXBlb2YgYyYmKGQ9ZHx8YyxjPXZvaWQgMCk7Zm9yKGggaW4gYil5YShhLGgsYyxkLGJbaF0sZik7cmV0dXJuIGF9aWYobnVsbD09ZCYmbnVsbD09ZT8oZT1jLGQ9Yz12b2lkIDApOm51bGw9PWUmJihcInN0cmluZ1wiPT10eXBlb2YgYz8oZT1kLGQ9dm9pZCAwKTooZT1kLGQ9YyxjPXZvaWQgMCkpLGU9PT0hMSllPXdhO2Vsc2UgaWYoIWUpcmV0dXJuIGE7cmV0dXJuIDE9PT1mJiYoZz1lLGU9ZnVuY3Rpb24oYSl7cmV0dXJuIHIoKS5vZmYoYSksZy5hcHBseSh0aGlzLGFyZ3VtZW50cyl9LGUuZ3VpZD1nLmd1aWR8fChnLmd1aWQ9ci5ndWlkKyspKSxhLmVhY2goZnVuY3Rpb24oKXtyLmV2ZW50LmFkZCh0aGlzLGIsZSxkLGMpfSl9ci5ldmVudD17Z2xvYmFsOnt9LGFkZDpmdW5jdGlvbihhLGIsYyxkLGUpe3ZhciBmLGcsaCxpLGosayxsLG0sbixvLHAscT1XLmdldChhKTtpZihxKXtjLmhhbmRsZXImJihmPWMsYz1mLmhhbmRsZXIsZT1mLnNlbGVjdG9yKSxlJiZyLmZpbmQubWF0Y2hlc1NlbGVjdG9yKHJhLGUpLGMuZ3VpZHx8KGMuZ3VpZD1yLmd1aWQrKyksKGk9cS5ldmVudHMpfHwoaT1xLmV2ZW50cz17fSksKGc9cS5oYW5kbGUpfHwoZz1xLmhhbmRsZT1mdW5jdGlvbihiKXtyZXR1cm5cInVuZGVmaW5lZFwiIT10eXBlb2YgciYmci5ldmVudC50cmlnZ2VyZWQhPT1iLnR5cGU/ci5ldmVudC5kaXNwYXRjaC5hcHBseShhLGFyZ3VtZW50cyk6dm9pZCAwfSksYj0oYnx8XCJcIikubWF0Y2goTCl8fFtcIlwiXSxqPWIubGVuZ3RoO3doaWxlKGotLSloPXVhLmV4ZWMoYltqXSl8fFtdLG49cD1oWzFdLG89KGhbMl18fFwiXCIpLnNwbGl0KFwiLlwiKS5zb3J0KCksbiYmKGw9ci5ldmVudC5zcGVjaWFsW25dfHx7fSxuPShlP2wuZGVsZWdhdGVUeXBlOmwuYmluZFR5cGUpfHxuLGw9ci5ldmVudC5zcGVjaWFsW25dfHx7fSxrPXIuZXh0ZW5kKHt0eXBlOm4sb3JpZ1R5cGU6cCxkYXRhOmQsaGFuZGxlcjpjLGd1aWQ6Yy5ndWlkLHNlbGVjdG9yOmUsbmVlZHNDb250ZXh0OmUmJnIuZXhwci5tYXRjaC5uZWVkc0NvbnRleHQudGVzdChlKSxuYW1lc3BhY2U6by5qb2luKFwiLlwiKX0sZiksKG09aVtuXSl8fChtPWlbbl09W10sbS5kZWxlZ2F0ZUNvdW50PTAsbC5zZXR1cCYmbC5zZXR1cC5jYWxsKGEsZCxvLGcpIT09ITF8fGEuYWRkRXZlbnRMaXN0ZW5lciYmYS5hZGRFdmVudExpc3RlbmVyKG4sZykpLGwuYWRkJiYobC5hZGQuY2FsbChhLGspLGsuaGFuZGxlci5ndWlkfHwoay5oYW5kbGVyLmd1aWQ9Yy5ndWlkKSksZT9tLnNwbGljZShtLmRlbGVnYXRlQ291bnQrKywwLGspOm0ucHVzaChrKSxyLmV2ZW50Lmdsb2JhbFtuXT0hMCl9fSxyZW1vdmU6ZnVuY3Rpb24oYSxiLGMsZCxlKXt2YXIgZixnLGgsaSxqLGssbCxtLG4sbyxwLHE9Vy5oYXNEYXRhKGEpJiZXLmdldChhKTtpZihxJiYoaT1xLmV2ZW50cykpe2I9KGJ8fFwiXCIpLm1hdGNoKEwpfHxbXCJcIl0saj1iLmxlbmd0aDt3aGlsZShqLS0paWYoaD11YS5leGVjKGJbal0pfHxbXSxuPXA9aFsxXSxvPShoWzJdfHxcIlwiKS5zcGxpdChcIi5cIikuc29ydCgpLG4pe2w9ci5ldmVudC5zcGVjaWFsW25dfHx7fSxuPShkP2wuZGVsZWdhdGVUeXBlOmwuYmluZFR5cGUpfHxuLG09aVtuXXx8W10saD1oWzJdJiZuZXcgUmVnRXhwKFwiKF58XFxcXC4pXCIrby5qb2luKFwiXFxcXC4oPzouKlxcXFwufClcIikrXCIoXFxcXC58JClcIiksZz1mPW0ubGVuZ3RoO3doaWxlKGYtLSlrPW1bZl0sIWUmJnAhPT1rLm9yaWdUeXBlfHxjJiZjLmd1aWQhPT1rLmd1aWR8fGgmJiFoLnRlc3Qoay5uYW1lc3BhY2UpfHxkJiZkIT09ay5zZWxlY3RvciYmKFwiKipcIiE9PWR8fCFrLnNlbGVjdG9yKXx8KG0uc3BsaWNlKGYsMSksay5zZWxlY3RvciYmbS5kZWxlZ2F0ZUNvdW50LS0sbC5yZW1vdmUmJmwucmVtb3ZlLmNhbGwoYSxrKSk7ZyYmIW0ubGVuZ3RoJiYobC50ZWFyZG93biYmbC50ZWFyZG93bi5jYWxsKGEsbyxxLmhhbmRsZSkhPT0hMXx8ci5yZW1vdmVFdmVudChhLG4scS5oYW5kbGUpLGRlbGV0ZSBpW25dKX1lbHNlIGZvcihuIGluIGkpci5ldmVudC5yZW1vdmUoYSxuK2Jbal0sYyxkLCEwKTtyLmlzRW1wdHlPYmplY3QoaSkmJlcucmVtb3ZlKGEsXCJoYW5kbGUgZXZlbnRzXCIpfX0sZGlzcGF0Y2g6ZnVuY3Rpb24oYSl7dmFyIGI9ci5ldmVudC5maXgoYSksYyxkLGUsZixnLGgsaT1uZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCksaj0oVy5nZXQodGhpcyxcImV2ZW50c1wiKXx8e30pW2IudHlwZV18fFtdLGs9ci5ldmVudC5zcGVjaWFsW2IudHlwZV18fHt9O2ZvcihpWzBdPWIsYz0xO2M8YXJndW1lbnRzLmxlbmd0aDtjKyspaVtjXT1hcmd1bWVudHNbY107aWYoYi5kZWxlZ2F0ZVRhcmdldD10aGlzLCFrLnByZURpc3BhdGNofHxrLnByZURpc3BhdGNoLmNhbGwodGhpcyxiKSE9PSExKXtoPXIuZXZlbnQuaGFuZGxlcnMuY2FsbCh0aGlzLGIsaiksYz0wO3doaWxlKChmPWhbYysrXSkmJiFiLmlzUHJvcGFnYXRpb25TdG9wcGVkKCkpe2IuY3VycmVudFRhcmdldD1mLmVsZW0sZD0wO3doaWxlKChnPWYuaGFuZGxlcnNbZCsrXSkmJiFiLmlzSW1tZWRpYXRlUHJvcGFnYXRpb25TdG9wcGVkKCkpYi5ybmFtZXNwYWNlJiYhYi5ybmFtZXNwYWNlLnRlc3QoZy5uYW1lc3BhY2UpfHwoYi5oYW5kbGVPYmo9ZyxiLmRhdGE9Zy5kYXRhLGU9KChyLmV2ZW50LnNwZWNpYWxbZy5vcmlnVHlwZV18fHt9KS5oYW5kbGV8fGcuaGFuZGxlcikuYXBwbHkoZi5lbGVtLGkpLHZvaWQgMCE9PWUmJihiLnJlc3VsdD1lKT09PSExJiYoYi5wcmV2ZW50RGVmYXVsdCgpLGIuc3RvcFByb3BhZ2F0aW9uKCkpKX1yZXR1cm4gay5wb3N0RGlzcGF0Y2gmJmsucG9zdERpc3BhdGNoLmNhbGwodGhpcyxiKSxiLnJlc3VsdH19LGhhbmRsZXJzOmZ1bmN0aW9uKGEsYil7dmFyIGMsZCxlLGYsZyxoPVtdLGk9Yi5kZWxlZ2F0ZUNvdW50LGo9YS50YXJnZXQ7aWYoaSYmai5ub2RlVHlwZSYmIShcImNsaWNrXCI9PT1hLnR5cGUmJmEuYnV0dG9uPj0xKSlmb3IoO2ohPT10aGlzO2o9ai5wYXJlbnROb2RlfHx0aGlzKWlmKDE9PT1qLm5vZGVUeXBlJiYoXCJjbGlja1wiIT09YS50eXBlfHxqLmRpc2FibGVkIT09ITApKXtmb3IoZj1bXSxnPXt9LGM9MDtjPGk7YysrKWQ9YltjXSxlPWQuc2VsZWN0b3IrXCIgXCIsdm9pZCAwPT09Z1tlXSYmKGdbZV09ZC5uZWVkc0NvbnRleHQ/cihlLHRoaXMpLmluZGV4KGopPi0xOnIuZmluZChlLHRoaXMsbnVsbCxbal0pLmxlbmd0aCksZ1tlXSYmZi5wdXNoKGQpO2YubGVuZ3RoJiZoLnB1c2goe2VsZW06aixoYW5kbGVyczpmfSl9cmV0dXJuIGo9dGhpcyxpPGIubGVuZ3RoJiZoLnB1c2goe2VsZW06aixoYW5kbGVyczpiLnNsaWNlKGkpfSksaH0sYWRkUHJvcDpmdW5jdGlvbihhLGIpe09iamVjdC5kZWZpbmVQcm9wZXJ0eShyLkV2ZW50LnByb3RvdHlwZSxhLHtlbnVtZXJhYmxlOiEwLGNvbmZpZ3VyYWJsZTohMCxnZXQ6ci5pc0Z1bmN0aW9uKGIpP2Z1bmN0aW9uKCl7aWYodGhpcy5vcmlnaW5hbEV2ZW50KXJldHVybiBiKHRoaXMub3JpZ2luYWxFdmVudCl9OmZ1bmN0aW9uKCl7aWYodGhpcy5vcmlnaW5hbEV2ZW50KXJldHVybiB0aGlzLm9yaWdpbmFsRXZlbnRbYV19LHNldDpmdW5jdGlvbihiKXtPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcyxhLHtlbnVtZXJhYmxlOiEwLGNvbmZpZ3VyYWJsZTohMCx3cml0YWJsZTohMCx2YWx1ZTpifSl9fSl9LGZpeDpmdW5jdGlvbihhKXtyZXR1cm4gYVtyLmV4cGFuZG9dP2E6bmV3IHIuRXZlbnQoYSl9LHNwZWNpYWw6e2xvYWQ6e25vQnViYmxlOiEwfSxmb2N1czp7dHJpZ2dlcjpmdW5jdGlvbigpe2lmKHRoaXMhPT14YSgpJiZ0aGlzLmZvY3VzKXJldHVybiB0aGlzLmZvY3VzKCksITF9LGRlbGVnYXRlVHlwZTpcImZvY3VzaW5cIn0sYmx1cjp7dHJpZ2dlcjpmdW5jdGlvbigpe2lmKHRoaXM9PT14YSgpJiZ0aGlzLmJsdXIpcmV0dXJuIHRoaXMuYmx1cigpLCExfSxkZWxlZ2F0ZVR5cGU6XCJmb2N1c291dFwifSxjbGljazp7dHJpZ2dlcjpmdW5jdGlvbigpe2lmKFwiY2hlY2tib3hcIj09PXRoaXMudHlwZSYmdGhpcy5jbGljayYmQih0aGlzLFwiaW5wdXRcIikpcmV0dXJuIHRoaXMuY2xpY2soKSwhMX0sX2RlZmF1bHQ6ZnVuY3Rpb24oYSl7cmV0dXJuIEIoYS50YXJnZXQsXCJhXCIpfX0sYmVmb3JldW5sb2FkOntwb3N0RGlzcGF0Y2g6ZnVuY3Rpb24oYSl7dm9pZCAwIT09YS5yZXN1bHQmJmEub3JpZ2luYWxFdmVudCYmKGEub3JpZ2luYWxFdmVudC5yZXR1cm5WYWx1ZT1hLnJlc3VsdCl9fX19LHIucmVtb3ZlRXZlbnQ9ZnVuY3Rpb24oYSxiLGMpe2EucmVtb3ZlRXZlbnRMaXN0ZW5lciYmYS5yZW1vdmVFdmVudExpc3RlbmVyKGIsYyl9LHIuRXZlbnQ9ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcyBpbnN0YW5jZW9mIHIuRXZlbnQ/KGEmJmEudHlwZT8odGhpcy5vcmlnaW5hbEV2ZW50PWEsdGhpcy50eXBlPWEudHlwZSx0aGlzLmlzRGVmYXVsdFByZXZlbnRlZD1hLmRlZmF1bHRQcmV2ZW50ZWR8fHZvaWQgMD09PWEuZGVmYXVsdFByZXZlbnRlZCYmYS5yZXR1cm5WYWx1ZT09PSExP3ZhOndhLHRoaXMudGFyZ2V0PWEudGFyZ2V0JiYzPT09YS50YXJnZXQubm9kZVR5cGU/YS50YXJnZXQucGFyZW50Tm9kZTphLnRhcmdldCx0aGlzLmN1cnJlbnRUYXJnZXQ9YS5jdXJyZW50VGFyZ2V0LHRoaXMucmVsYXRlZFRhcmdldD1hLnJlbGF0ZWRUYXJnZXQpOnRoaXMudHlwZT1hLGImJnIuZXh0ZW5kKHRoaXMsYiksdGhpcy50aW1lU3RhbXA9YSYmYS50aW1lU3RhbXB8fHIubm93KCksdm9pZCh0aGlzW3IuZXhwYW5kb109ITApKTpuZXcgci5FdmVudChhLGIpfSxyLkV2ZW50LnByb3RvdHlwZT17Y29uc3RydWN0b3I6ci5FdmVudCxpc0RlZmF1bHRQcmV2ZW50ZWQ6d2EsaXNQcm9wYWdhdGlvblN0b3BwZWQ6d2EsaXNJbW1lZGlhdGVQcm9wYWdhdGlvblN0b3BwZWQ6d2EsaXNTaW11bGF0ZWQ6ITEscHJldmVudERlZmF1bHQ6ZnVuY3Rpb24oKXt2YXIgYT10aGlzLm9yaWdpbmFsRXZlbnQ7dGhpcy5pc0RlZmF1bHRQcmV2ZW50ZWQ9dmEsYSYmIXRoaXMuaXNTaW11bGF0ZWQmJmEucHJldmVudERlZmF1bHQoKX0sc3RvcFByb3BhZ2F0aW9uOmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5vcmlnaW5hbEV2ZW50O3RoaXMuaXNQcm9wYWdhdGlvblN0b3BwZWQ9dmEsYSYmIXRoaXMuaXNTaW11bGF0ZWQmJmEuc3RvcFByb3BhZ2F0aW9uKCl9LHN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbjpmdW5jdGlvbigpe3ZhciBhPXRoaXMub3JpZ2luYWxFdmVudDt0aGlzLmlzSW1tZWRpYXRlUHJvcGFnYXRpb25TdG9wcGVkPXZhLGEmJiF0aGlzLmlzU2ltdWxhdGVkJiZhLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpLHRoaXMuc3RvcFByb3BhZ2F0aW9uKCl9fSxyLmVhY2goe2FsdEtleTohMCxidWJibGVzOiEwLGNhbmNlbGFibGU6ITAsY2hhbmdlZFRvdWNoZXM6ITAsY3RybEtleTohMCxkZXRhaWw6ITAsZXZlbnRQaGFzZTohMCxtZXRhS2V5OiEwLHBhZ2VYOiEwLHBhZ2VZOiEwLHNoaWZ0S2V5OiEwLHZpZXc6ITAsXCJjaGFyXCI6ITAsY2hhckNvZGU6ITAsa2V5OiEwLGtleUNvZGU6ITAsYnV0dG9uOiEwLGJ1dHRvbnM6ITAsY2xpZW50WDohMCxjbGllbnRZOiEwLG9mZnNldFg6ITAsb2Zmc2V0WTohMCxwb2ludGVySWQ6ITAscG9pbnRlclR5cGU6ITAsc2NyZWVuWDohMCxzY3JlZW5ZOiEwLHRhcmdldFRvdWNoZXM6ITAsdG9FbGVtZW50OiEwLHRvdWNoZXM6ITAsd2hpY2g6ZnVuY3Rpb24oYSl7dmFyIGI9YS5idXR0b247cmV0dXJuIG51bGw9PWEud2hpY2gmJnNhLnRlc3QoYS50eXBlKT9udWxsIT1hLmNoYXJDb2RlP2EuY2hhckNvZGU6YS5rZXlDb2RlOiFhLndoaWNoJiZ2b2lkIDAhPT1iJiZ0YS50ZXN0KGEudHlwZSk/MSZiPzE6MiZiPzM6NCZiPzI6MDphLndoaWNofX0sci5ldmVudC5hZGRQcm9wKSxyLmVhY2goe21vdXNlZW50ZXI6XCJtb3VzZW92ZXJcIixtb3VzZWxlYXZlOlwibW91c2VvdXRcIixwb2ludGVyZW50ZXI6XCJwb2ludGVyb3ZlclwiLHBvaW50ZXJsZWF2ZTpcInBvaW50ZXJvdXRcIn0sZnVuY3Rpb24oYSxiKXtyLmV2ZW50LnNwZWNpYWxbYV09e2RlbGVnYXRlVHlwZTpiLGJpbmRUeXBlOmIsaGFuZGxlOmZ1bmN0aW9uKGEpe3ZhciBjLGQ9dGhpcyxlPWEucmVsYXRlZFRhcmdldCxmPWEuaGFuZGxlT2JqO3JldHVybiBlJiYoZT09PWR8fHIuY29udGFpbnMoZCxlKSl8fChhLnR5cGU9Zi5vcmlnVHlwZSxjPWYuaGFuZGxlci5hcHBseSh0aGlzLGFyZ3VtZW50cyksYS50eXBlPWIpLGN9fX0pLHIuZm4uZXh0ZW5kKHtvbjpmdW5jdGlvbihhLGIsYyxkKXtyZXR1cm4geWEodGhpcyxhLGIsYyxkKX0sb25lOmZ1bmN0aW9uKGEsYixjLGQpe3JldHVybiB5YSh0aGlzLGEsYixjLGQsMSl9LG9mZjpmdW5jdGlvbihhLGIsYyl7dmFyIGQsZTtpZihhJiZhLnByZXZlbnREZWZhdWx0JiZhLmhhbmRsZU9iailyZXR1cm4gZD1hLmhhbmRsZU9iaixyKGEuZGVsZWdhdGVUYXJnZXQpLm9mZihkLm5hbWVzcGFjZT9kLm9yaWdUeXBlK1wiLlwiK2QubmFtZXNwYWNlOmQub3JpZ1R5cGUsZC5zZWxlY3RvcixkLmhhbmRsZXIpLHRoaXM7aWYoXCJvYmplY3RcIj09dHlwZW9mIGEpe2ZvcihlIGluIGEpdGhpcy5vZmYoZSxiLGFbZV0pO3JldHVybiB0aGlzfXJldHVybiBiIT09ITEmJlwiZnVuY3Rpb25cIiE9dHlwZW9mIGJ8fChjPWIsYj12b2lkIDApLGM9PT0hMSYmKGM9d2EpLHRoaXMuZWFjaChmdW5jdGlvbigpe3IuZXZlbnQucmVtb3ZlKHRoaXMsYSxjLGIpfSl9fSk7dmFyIHphPS88KD8hYXJlYXxicnxjb2x8ZW1iZWR8aHJ8aW1nfGlucHV0fGxpbmt8bWV0YXxwYXJhbSkoKFthLXpdW15cXC9cXDA+XFx4MjBcXHRcXHJcXG5cXGZdKilbXj5dKilcXC8+L2dpLEFhPS88c2NyaXB0fDxzdHlsZXw8bGluay9pLEJhPS9jaGVja2VkXFxzKig/OltePV18PVxccyouY2hlY2tlZC4pL2ksQ2E9L150cnVlXFwvKC4qKS8sRGE9L15cXHMqPCEoPzpcXFtDREFUQVxcW3wtLSl8KD86XFxdXFxdfC0tKT5cXHMqJC9nO2Z1bmN0aW9uIEVhKGEsYil7cmV0dXJuIEIoYSxcInRhYmxlXCIpJiZCKDExIT09Yi5ub2RlVHlwZT9iOmIuZmlyc3RDaGlsZCxcInRyXCIpP3IoXCI+dGJvZHlcIixhKVswXXx8YTphfWZ1bmN0aW9uIEZhKGEpe3JldHVybiBhLnR5cGU9KG51bGwhPT1hLmdldEF0dHJpYnV0ZShcInR5cGVcIikpK1wiL1wiK2EudHlwZSxhfWZ1bmN0aW9uIEdhKGEpe3ZhciBiPUNhLmV4ZWMoYS50eXBlKTtyZXR1cm4gYj9hLnR5cGU9YlsxXTphLnJlbW92ZUF0dHJpYnV0ZShcInR5cGVcIiksYX1mdW5jdGlvbiBIYShhLGIpe3ZhciBjLGQsZSxmLGcsaCxpLGo7aWYoMT09PWIubm9kZVR5cGUpe2lmKFcuaGFzRGF0YShhKSYmKGY9Vy5hY2Nlc3MoYSksZz1XLnNldChiLGYpLGo9Zi5ldmVudHMpKXtkZWxldGUgZy5oYW5kbGUsZy5ldmVudHM9e307Zm9yKGUgaW4gailmb3IoYz0wLGQ9altlXS5sZW5ndGg7YzxkO2MrKylyLmV2ZW50LmFkZChiLGUsaltlXVtjXSl9WC5oYXNEYXRhKGEpJiYoaD1YLmFjY2VzcyhhKSxpPXIuZXh0ZW5kKHt9LGgpLFguc2V0KGIsaSkpfX1mdW5jdGlvbiBJYShhLGIpe3ZhciBjPWIubm9kZU5hbWUudG9Mb3dlckNhc2UoKTtcImlucHV0XCI9PT1jJiZqYS50ZXN0KGEudHlwZSk/Yi5jaGVja2VkPWEuY2hlY2tlZDpcImlucHV0XCIhPT1jJiZcInRleHRhcmVhXCIhPT1jfHwoYi5kZWZhdWx0VmFsdWU9YS5kZWZhdWx0VmFsdWUpfWZ1bmN0aW9uIEphKGEsYixjLGQpe2I9Zy5hcHBseShbXSxiKTt2YXIgZSxmLGgsaSxqLGssbD0wLG09YS5sZW5ndGgsbj1tLTEscT1iWzBdLHM9ci5pc0Z1bmN0aW9uKHEpO2lmKHN8fG0+MSYmXCJzdHJpbmdcIj09dHlwZW9mIHEmJiFvLmNoZWNrQ2xvbmUmJkJhLnRlc3QocSkpcmV0dXJuIGEuZWFjaChmdW5jdGlvbihlKXt2YXIgZj1hLmVxKGUpO3MmJihiWzBdPXEuY2FsbCh0aGlzLGUsZi5odG1sKCkpKSxKYShmLGIsYyxkKX0pO2lmKG0mJihlPXFhKGIsYVswXS5vd25lckRvY3VtZW50LCExLGEsZCksZj1lLmZpcnN0Q2hpbGQsMT09PWUuY2hpbGROb2Rlcy5sZW5ndGgmJihlPWYpLGZ8fGQpKXtmb3IoaD1yLm1hcChuYShlLFwic2NyaXB0XCIpLEZhKSxpPWgubGVuZ3RoO2w8bTtsKyspaj1lLGwhPT1uJiYoaj1yLmNsb25lKGosITAsITApLGkmJnIubWVyZ2UoaCxuYShqLFwic2NyaXB0XCIpKSksYy5jYWxsKGFbbF0saixsKTtpZihpKWZvcihrPWhbaC5sZW5ndGgtMV0ub3duZXJEb2N1bWVudCxyLm1hcChoLEdhKSxsPTA7bDxpO2wrKylqPWhbbF0sbGEudGVzdChqLnR5cGV8fFwiXCIpJiYhVy5hY2Nlc3MoaixcImdsb2JhbEV2YWxcIikmJnIuY29udGFpbnMoayxqKSYmKGouc3JjP3IuX2V2YWxVcmwmJnIuX2V2YWxVcmwoai5zcmMpOnAoai50ZXh0Q29udGVudC5yZXBsYWNlKERhLFwiXCIpLGspKX1yZXR1cm4gYX1mdW5jdGlvbiBLYShhLGIsYyl7Zm9yKHZhciBkLGU9Yj9yLmZpbHRlcihiLGEpOmEsZj0wO251bGwhPShkPWVbZl0pO2YrKyljfHwxIT09ZC5ub2RlVHlwZXx8ci5jbGVhbkRhdGEobmEoZCkpLGQucGFyZW50Tm9kZSYmKGMmJnIuY29udGFpbnMoZC5vd25lckRvY3VtZW50LGQpJiZvYShuYShkLFwic2NyaXB0XCIpKSxkLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZCkpO3JldHVybiBhfXIuZXh0ZW5kKHtodG1sUHJlZmlsdGVyOmZ1bmN0aW9uKGEpe3JldHVybiBhLnJlcGxhY2UoemEsXCI8JDE+PC8kMj5cIil9LGNsb25lOmZ1bmN0aW9uKGEsYixjKXt2YXIgZCxlLGYsZyxoPWEuY2xvbmVOb2RlKCEwKSxpPXIuY29udGFpbnMoYS5vd25lckRvY3VtZW50LGEpO2lmKCEoby5ub0Nsb25lQ2hlY2tlZHx8MSE9PWEubm9kZVR5cGUmJjExIT09YS5ub2RlVHlwZXx8ci5pc1hNTERvYyhhKSkpZm9yKGc9bmEoaCksZj1uYShhKSxkPTAsZT1mLmxlbmd0aDtkPGU7ZCsrKUlhKGZbZF0sZ1tkXSk7aWYoYilpZihjKWZvcihmPWZ8fG5hKGEpLGc9Z3x8bmEoaCksZD0wLGU9Zi5sZW5ndGg7ZDxlO2QrKylIYShmW2RdLGdbZF0pO2Vsc2UgSGEoYSxoKTtyZXR1cm4gZz1uYShoLFwic2NyaXB0XCIpLGcubGVuZ3RoPjAmJm9hKGcsIWkmJm5hKGEsXCJzY3JpcHRcIikpLGh9LGNsZWFuRGF0YTpmdW5jdGlvbihhKXtmb3IodmFyIGIsYyxkLGU9ci5ldmVudC5zcGVjaWFsLGY9MDt2b2lkIDAhPT0oYz1hW2ZdKTtmKyspaWYoVShjKSl7aWYoYj1jW1cuZXhwYW5kb10pe2lmKGIuZXZlbnRzKWZvcihkIGluIGIuZXZlbnRzKWVbZF0/ci5ldmVudC5yZW1vdmUoYyxkKTpyLnJlbW92ZUV2ZW50KGMsZCxiLmhhbmRsZSk7Y1tXLmV4cGFuZG9dPXZvaWQgMH1jW1guZXhwYW5kb10mJihjW1guZXhwYW5kb109dm9pZCAwKX19fSksci5mbi5leHRlbmQoe2RldGFjaDpmdW5jdGlvbihhKXtyZXR1cm4gS2EodGhpcyxhLCEwKX0scmVtb3ZlOmZ1bmN0aW9uKGEpe3JldHVybiBLYSh0aGlzLGEpfSx0ZXh0OmZ1bmN0aW9uKGEpe3JldHVybiBUKHRoaXMsZnVuY3Rpb24oYSl7cmV0dXJuIHZvaWQgMD09PWE/ci50ZXh0KHRoaXMpOnRoaXMuZW1wdHkoKS5lYWNoKGZ1bmN0aW9uKCl7MSE9PXRoaXMubm9kZVR5cGUmJjExIT09dGhpcy5ub2RlVHlwZSYmOSE9PXRoaXMubm9kZVR5cGV8fCh0aGlzLnRleHRDb250ZW50PWEpfSl9LG51bGwsYSxhcmd1bWVudHMubGVuZ3RoKX0sYXBwZW5kOmZ1bmN0aW9uKCl7cmV0dXJuIEphKHRoaXMsYXJndW1lbnRzLGZ1bmN0aW9uKGEpe2lmKDE9PT10aGlzLm5vZGVUeXBlfHwxMT09PXRoaXMubm9kZVR5cGV8fDk9PT10aGlzLm5vZGVUeXBlKXt2YXIgYj1FYSh0aGlzLGEpO2IuYXBwZW5kQ2hpbGQoYSl9fSl9LHByZXBlbmQ6ZnVuY3Rpb24oKXtyZXR1cm4gSmEodGhpcyxhcmd1bWVudHMsZnVuY3Rpb24oYSl7aWYoMT09PXRoaXMubm9kZVR5cGV8fDExPT09dGhpcy5ub2RlVHlwZXx8OT09PXRoaXMubm9kZVR5cGUpe3ZhciBiPUVhKHRoaXMsYSk7Yi5pbnNlcnRCZWZvcmUoYSxiLmZpcnN0Q2hpbGQpfX0pfSxiZWZvcmU6ZnVuY3Rpb24oKXtyZXR1cm4gSmEodGhpcyxhcmd1bWVudHMsZnVuY3Rpb24oYSl7dGhpcy5wYXJlbnROb2RlJiZ0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGEsdGhpcyl9KX0sYWZ0ZXI6ZnVuY3Rpb24oKXtyZXR1cm4gSmEodGhpcyxhcmd1bWVudHMsZnVuY3Rpb24oYSl7dGhpcy5wYXJlbnROb2RlJiZ0aGlzLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGEsdGhpcy5uZXh0U2libGluZyl9KX0sZW1wdHk6ZnVuY3Rpb24oKXtmb3IodmFyIGEsYj0wO251bGwhPShhPXRoaXNbYl0pO2IrKykxPT09YS5ub2RlVHlwZSYmKHIuY2xlYW5EYXRhKG5hKGEsITEpKSxhLnRleHRDb250ZW50PVwiXCIpO3JldHVybiB0aGlzfSxjbG9uZTpmdW5jdGlvbihhLGIpe3JldHVybiBhPW51bGwhPWEmJmEsYj1udWxsPT1iP2E6Yix0aGlzLm1hcChmdW5jdGlvbigpe3JldHVybiByLmNsb25lKHRoaXMsYSxiKX0pfSxodG1sOmZ1bmN0aW9uKGEpe3JldHVybiBUKHRoaXMsZnVuY3Rpb24oYSl7dmFyIGI9dGhpc1swXXx8e30sYz0wLGQ9dGhpcy5sZW5ndGg7aWYodm9pZCAwPT09YSYmMT09PWIubm9kZVR5cGUpcmV0dXJuIGIuaW5uZXJIVE1MO2lmKFwic3RyaW5nXCI9PXR5cGVvZiBhJiYhQWEudGVzdChhKSYmIW1hWyhrYS5leGVjKGEpfHxbXCJcIixcIlwiXSlbMV0udG9Mb3dlckNhc2UoKV0pe2E9ci5odG1sUHJlZmlsdGVyKGEpO3RyeXtmb3IoO2M8ZDtjKyspYj10aGlzW2NdfHx7fSwxPT09Yi5ub2RlVHlwZSYmKHIuY2xlYW5EYXRhKG5hKGIsITEpKSxiLmlubmVySFRNTD1hKTtiPTB9Y2F0Y2goZSl7fX1iJiZ0aGlzLmVtcHR5KCkuYXBwZW5kKGEpfSxudWxsLGEsYXJndW1lbnRzLmxlbmd0aCl9LHJlcGxhY2VXaXRoOmZ1bmN0aW9uKCl7dmFyIGE9W107cmV0dXJuIEphKHRoaXMsYXJndW1lbnRzLGZ1bmN0aW9uKGIpe3ZhciBjPXRoaXMucGFyZW50Tm9kZTtyLmluQXJyYXkodGhpcyxhKTwwJiYoci5jbGVhbkRhdGEobmEodGhpcykpLGMmJmMucmVwbGFjZUNoaWxkKGIsdGhpcykpfSxhKX19KSxyLmVhY2goe2FwcGVuZFRvOlwiYXBwZW5kXCIscHJlcGVuZFRvOlwicHJlcGVuZFwiLGluc2VydEJlZm9yZTpcImJlZm9yZVwiLGluc2VydEFmdGVyOlwiYWZ0ZXJcIixyZXBsYWNlQWxsOlwicmVwbGFjZVdpdGhcIn0sZnVuY3Rpb24oYSxiKXtyLmZuW2FdPWZ1bmN0aW9uKGEpe2Zvcih2YXIgYyxkPVtdLGU9cihhKSxmPWUubGVuZ3RoLTEsZz0wO2c8PWY7ZysrKWM9Zz09PWY/dGhpczp0aGlzLmNsb25lKCEwKSxyKGVbZ10pW2JdKGMpLGguYXBwbHkoZCxjLmdldCgpKTtyZXR1cm4gdGhpcy5wdXNoU3RhY2soZCl9fSk7dmFyIExhPS9ebWFyZ2luLyxNYT1uZXcgUmVnRXhwKFwiXihcIithYStcIikoPyFweClbYS16JV0rJFwiLFwiaVwiKSxOYT1mdW5jdGlvbihiKXt2YXIgYz1iLm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXc7cmV0dXJuIGMmJmMub3BlbmVyfHwoYz1hKSxjLmdldENvbXB1dGVkU3R5bGUoYil9OyFmdW5jdGlvbigpe2Z1bmN0aW9uIGIoKXtpZihpKXtpLnN0eWxlLmNzc1RleHQ9XCJib3gtc2l6aW5nOmJvcmRlci1ib3g7cG9zaXRpb246cmVsYXRpdmU7ZGlzcGxheTpibG9jazttYXJnaW46YXV0bztib3JkZXI6MXB4O3BhZGRpbmc6MXB4O3RvcDoxJTt3aWR0aDo1MCVcIixpLmlubmVySFRNTD1cIlwiLHJhLmFwcGVuZENoaWxkKGgpO3ZhciBiPWEuZ2V0Q29tcHV0ZWRTdHlsZShpKTtjPVwiMSVcIiE9PWIudG9wLGc9XCIycHhcIj09PWIubWFyZ2luTGVmdCxlPVwiNHB4XCI9PT1iLndpZHRoLGkuc3R5bGUubWFyZ2luUmlnaHQ9XCI1MCVcIixmPVwiNHB4XCI9PT1iLm1hcmdpblJpZ2h0LHJhLnJlbW92ZUNoaWxkKGgpLGk9bnVsbH19dmFyIGMsZSxmLGcsaD1kLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksaT1kLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7aS5zdHlsZSYmKGkuc3R5bGUuYmFja2dyb3VuZENsaXA9XCJjb250ZW50LWJveFwiLGkuY2xvbmVOb2RlKCEwKS5zdHlsZS5iYWNrZ3JvdW5kQ2xpcD1cIlwiLG8uY2xlYXJDbG9uZVN0eWxlPVwiY29udGVudC1ib3hcIj09PWkuc3R5bGUuYmFja2dyb3VuZENsaXAsaC5zdHlsZS5jc3NUZXh0PVwiYm9yZGVyOjA7d2lkdGg6OHB4O2hlaWdodDowO3RvcDowO2xlZnQ6LTk5OTlweDtwYWRkaW5nOjA7bWFyZ2luLXRvcDoxcHg7cG9zaXRpb246YWJzb2x1dGVcIixoLmFwcGVuZENoaWxkKGkpLHIuZXh0ZW5kKG8se3BpeGVsUG9zaXRpb246ZnVuY3Rpb24oKXtyZXR1cm4gYigpLGN9LGJveFNpemluZ1JlbGlhYmxlOmZ1bmN0aW9uKCl7cmV0dXJuIGIoKSxlfSxwaXhlbE1hcmdpblJpZ2h0OmZ1bmN0aW9uKCl7cmV0dXJuIGIoKSxmfSxyZWxpYWJsZU1hcmdpbkxlZnQ6ZnVuY3Rpb24oKXtyZXR1cm4gYigpLGd9fSkpfSgpO2Z1bmN0aW9uIE9hKGEsYixjKXt2YXIgZCxlLGYsZyxoPWEuc3R5bGU7cmV0dXJuIGM9Y3x8TmEoYSksYyYmKGc9Yy5nZXRQcm9wZXJ0eVZhbHVlKGIpfHxjW2JdLFwiXCIhPT1nfHxyLmNvbnRhaW5zKGEub3duZXJEb2N1bWVudCxhKXx8KGc9ci5zdHlsZShhLGIpKSwhby5waXhlbE1hcmdpblJpZ2h0KCkmJk1hLnRlc3QoZykmJkxhLnRlc3QoYikmJihkPWgud2lkdGgsZT1oLm1pbldpZHRoLGY9aC5tYXhXaWR0aCxoLm1pbldpZHRoPWgubWF4V2lkdGg9aC53aWR0aD1nLGc9Yy53aWR0aCxoLndpZHRoPWQsaC5taW5XaWR0aD1lLGgubWF4V2lkdGg9ZikpLHZvaWQgMCE9PWc/ZytcIlwiOmd9ZnVuY3Rpb24gUGEoYSxiKXtyZXR1cm57Z2V0OmZ1bmN0aW9uKCl7cmV0dXJuIGEoKT92b2lkIGRlbGV0ZSB0aGlzLmdldDoodGhpcy5nZXQ9YikuYXBwbHkodGhpcyxhcmd1bWVudHMpfX19dmFyIFFhPS9eKG5vbmV8dGFibGUoPyEtY1tlYV0pLispLyxSYT0vXi0tLyxTYT17cG9zaXRpb246XCJhYnNvbHV0ZVwiLHZpc2liaWxpdHk6XCJoaWRkZW5cIixkaXNwbGF5OlwiYmxvY2tcIn0sVGE9e2xldHRlclNwYWNpbmc6XCIwXCIsZm9udFdlaWdodDpcIjQwMFwifSxVYT1bXCJXZWJraXRcIixcIk1velwiLFwibXNcIl0sVmE9ZC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLnN0eWxlO2Z1bmN0aW9uIFdhKGEpe2lmKGEgaW4gVmEpcmV0dXJuIGE7dmFyIGI9YVswXS50b1VwcGVyQ2FzZSgpK2Euc2xpY2UoMSksYz1VYS5sZW5ndGg7d2hpbGUoYy0tKWlmKGE9VWFbY10rYixhIGluIFZhKXJldHVybiBhfWZ1bmN0aW9uIFhhKGEpe3ZhciBiPXIuY3NzUHJvcHNbYV07cmV0dXJuIGJ8fChiPXIuY3NzUHJvcHNbYV09V2EoYSl8fGEpLGJ9ZnVuY3Rpb24gWWEoYSxiLGMpe3ZhciBkPWJhLmV4ZWMoYik7cmV0dXJuIGQ/TWF0aC5tYXgoMCxkWzJdLShjfHwwKSkrKGRbM118fFwicHhcIik6Yn1mdW5jdGlvbiBaYShhLGIsYyxkLGUpe3ZhciBmLGc9MDtmb3IoZj1jPT09KGQ/XCJib3JkZXJcIjpcImNvbnRlbnRcIik/NDpcIndpZHRoXCI9PT1iPzE6MDtmPDQ7Zis9MilcIm1hcmdpblwiPT09YyYmKGcrPXIuY3NzKGEsYytjYVtmXSwhMCxlKSksZD8oXCJjb250ZW50XCI9PT1jJiYoZy09ci5jc3MoYSxcInBhZGRpbmdcIitjYVtmXSwhMCxlKSksXCJtYXJnaW5cIiE9PWMmJihnLT1yLmNzcyhhLFwiYm9yZGVyXCIrY2FbZl0rXCJXaWR0aFwiLCEwLGUpKSk6KGcrPXIuY3NzKGEsXCJwYWRkaW5nXCIrY2FbZl0sITAsZSksXCJwYWRkaW5nXCIhPT1jJiYoZys9ci5jc3MoYSxcImJvcmRlclwiK2NhW2ZdK1wiV2lkdGhcIiwhMCxlKSkpO3JldHVybiBnfWZ1bmN0aW9uICRhKGEsYixjKXt2YXIgZCxlPU5hKGEpLGY9T2EoYSxiLGUpLGc9XCJib3JkZXItYm94XCI9PT1yLmNzcyhhLFwiYm94U2l6aW5nXCIsITEsZSk7cmV0dXJuIE1hLnRlc3QoZik/ZjooZD1nJiYoby5ib3hTaXppbmdSZWxpYWJsZSgpfHxmPT09YS5zdHlsZVtiXSksXCJhdXRvXCI9PT1mJiYoZj1hW1wib2Zmc2V0XCIrYlswXS50b1VwcGVyQ2FzZSgpK2Iuc2xpY2UoMSldKSxmPXBhcnNlRmxvYXQoZil8fDAsZitaYShhLGIsY3x8KGc/XCJib3JkZXJcIjpcImNvbnRlbnRcIiksZCxlKStcInB4XCIpfXIuZXh0ZW5kKHtjc3NIb29rczp7b3BhY2l0eTp7Z2V0OmZ1bmN0aW9uKGEsYil7aWYoYil7dmFyIGM9T2EoYSxcIm9wYWNpdHlcIik7cmV0dXJuXCJcIj09PWM/XCIxXCI6Y319fX0sY3NzTnVtYmVyOnthbmltYXRpb25JdGVyYXRpb25Db3VudDohMCxjb2x1bW5Db3VudDohMCxmaWxsT3BhY2l0eTohMCxmbGV4R3JvdzohMCxmbGV4U2hyaW5rOiEwLGZvbnRXZWlnaHQ6ITAsbGluZUhlaWdodDohMCxvcGFjaXR5OiEwLG9yZGVyOiEwLG9ycGhhbnM6ITAsd2lkb3dzOiEwLHpJbmRleDohMCx6b29tOiEwfSxjc3NQcm9wczp7XCJmbG9hdFwiOlwiY3NzRmxvYXRcIn0sc3R5bGU6ZnVuY3Rpb24oYSxiLGMsZCl7aWYoYSYmMyE9PWEubm9kZVR5cGUmJjghPT1hLm5vZGVUeXBlJiZhLnN0eWxlKXt2YXIgZSxmLGcsaD1yLmNhbWVsQ2FzZShiKSxpPVJhLnRlc3QoYiksaj1hLnN0eWxlO3JldHVybiBpfHwoYj1YYShoKSksZz1yLmNzc0hvb2tzW2JdfHxyLmNzc0hvb2tzW2hdLHZvaWQgMD09PWM/ZyYmXCJnZXRcImluIGcmJnZvaWQgMCE9PShlPWcuZ2V0KGEsITEsZCkpP2U6altiXTooZj10eXBlb2YgYyxcInN0cmluZ1wiPT09ZiYmKGU9YmEuZXhlYyhjKSkmJmVbMV0mJihjPWZhKGEsYixlKSxmPVwibnVtYmVyXCIpLG51bGwhPWMmJmM9PT1jJiYoXCJudW1iZXJcIj09PWYmJihjKz1lJiZlWzNdfHwoci5jc3NOdW1iZXJbaF0/XCJcIjpcInB4XCIpKSxvLmNsZWFyQ2xvbmVTdHlsZXx8XCJcIiE9PWN8fDAhPT1iLmluZGV4T2YoXCJiYWNrZ3JvdW5kXCIpfHwoaltiXT1cImluaGVyaXRcIiksZyYmXCJzZXRcImluIGcmJnZvaWQgMD09PShjPWcuc2V0KGEsYyxkKSl8fChpP2ouc2V0UHJvcGVydHkoYixjKTpqW2JdPWMpKSx2b2lkIDApfX0sY3NzOmZ1bmN0aW9uKGEsYixjLGQpe3ZhciBlLGYsZyxoPXIuY2FtZWxDYXNlKGIpLGk9UmEudGVzdChiKTtyZXR1cm4gaXx8KGI9WGEoaCkpLGc9ci5jc3NIb29rc1tiXXx8ci5jc3NIb29rc1toXSxnJiZcImdldFwiaW4gZyYmKGU9Zy5nZXQoYSwhMCxjKSksdm9pZCAwPT09ZSYmKGU9T2EoYSxiLGQpKSxcIm5vcm1hbFwiPT09ZSYmYiBpbiBUYSYmKGU9VGFbYl0pLFwiXCI9PT1jfHxjPyhmPXBhcnNlRmxvYXQoZSksYz09PSEwfHxpc0Zpbml0ZShmKT9mfHwwOmUpOmV9fSksci5lYWNoKFtcImhlaWdodFwiLFwid2lkdGhcIl0sZnVuY3Rpb24oYSxiKXtyLmNzc0hvb2tzW2JdPXtnZXQ6ZnVuY3Rpb24oYSxjLGQpe2lmKGMpcmV0dXJuIVFhLnRlc3Qoci5jc3MoYSxcImRpc3BsYXlcIikpfHxhLmdldENsaWVudFJlY3RzKCkubGVuZ3RoJiZhLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLndpZHRoPyRhKGEsYixkKTplYShhLFNhLGZ1bmN0aW9uKCl7cmV0dXJuICRhKGEsYixkKX0pfSxzZXQ6ZnVuY3Rpb24oYSxjLGQpe3ZhciBlLGY9ZCYmTmEoYSksZz1kJiZaYShhLGIsZCxcImJvcmRlci1ib3hcIj09PXIuY3NzKGEsXCJib3hTaXppbmdcIiwhMSxmKSxmKTtyZXR1cm4gZyYmKGU9YmEuZXhlYyhjKSkmJlwicHhcIiE9PShlWzNdfHxcInB4XCIpJiYoYS5zdHlsZVtiXT1jLGM9ci5jc3MoYSxiKSksWWEoYSxjLGcpfX19KSxyLmNzc0hvb2tzLm1hcmdpbkxlZnQ9UGEoby5yZWxpYWJsZU1hcmdpbkxlZnQsZnVuY3Rpb24oYSxiKXtpZihiKXJldHVybihwYXJzZUZsb2F0KE9hKGEsXCJtYXJnaW5MZWZ0XCIpKXx8YS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0LWVhKGEse21hcmdpbkxlZnQ6MH0sZnVuY3Rpb24oKXtyZXR1cm4gYS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5sZWZ0fSkpK1wicHhcIn0pLHIuZWFjaCh7bWFyZ2luOlwiXCIscGFkZGluZzpcIlwiLGJvcmRlcjpcIldpZHRoXCJ9LGZ1bmN0aW9uKGEsYil7ci5jc3NIb29rc1thK2JdPXtleHBhbmQ6ZnVuY3Rpb24oYyl7Zm9yKHZhciBkPTAsZT17fSxmPVwic3RyaW5nXCI9PXR5cGVvZiBjP2Muc3BsaXQoXCIgXCIpOltjXTtkPDQ7ZCsrKWVbYStjYVtkXStiXT1mW2RdfHxmW2QtMl18fGZbMF07cmV0dXJuIGV9fSxMYS50ZXN0KGEpfHwoci5jc3NIb29rc1thK2JdLnNldD1ZYSl9KSxyLmZuLmV4dGVuZCh7Y3NzOmZ1bmN0aW9uKGEsYil7cmV0dXJuIFQodGhpcyxmdW5jdGlvbihhLGIsYyl7dmFyIGQsZSxmPXt9LGc9MDtpZihBcnJheS5pc0FycmF5KGIpKXtmb3IoZD1OYShhKSxlPWIubGVuZ3RoO2c8ZTtnKyspZltiW2ddXT1yLmNzcyhhLGJbZ10sITEsZCk7cmV0dXJuIGZ9cmV0dXJuIHZvaWQgMCE9PWM/ci5zdHlsZShhLGIsYyk6ci5jc3MoYSxiKX0sYSxiLGFyZ3VtZW50cy5sZW5ndGg+MSl9fSk7ZnVuY3Rpb24gX2EoYSxiLGMsZCxlKXtyZXR1cm4gbmV3IF9hLnByb3RvdHlwZS5pbml0KGEsYixjLGQsZSl9ci5Ud2Vlbj1fYSxfYS5wcm90b3R5cGU9e2NvbnN0cnVjdG9yOl9hLGluaXQ6ZnVuY3Rpb24oYSxiLGMsZCxlLGYpe3RoaXMuZWxlbT1hLHRoaXMucHJvcD1jLHRoaXMuZWFzaW5nPWV8fHIuZWFzaW5nLl9kZWZhdWx0LHRoaXMub3B0aW9ucz1iLHRoaXMuc3RhcnQ9dGhpcy5ub3c9dGhpcy5jdXIoKSx0aGlzLmVuZD1kLHRoaXMudW5pdD1mfHwoci5jc3NOdW1iZXJbY10/XCJcIjpcInB4XCIpfSxjdXI6ZnVuY3Rpb24oKXt2YXIgYT1fYS5wcm9wSG9va3NbdGhpcy5wcm9wXTtyZXR1cm4gYSYmYS5nZXQ/YS5nZXQodGhpcyk6X2EucHJvcEhvb2tzLl9kZWZhdWx0LmdldCh0aGlzKX0scnVuOmZ1bmN0aW9uKGEpe3ZhciBiLGM9X2EucHJvcEhvb2tzW3RoaXMucHJvcF07cmV0dXJuIHRoaXMub3B0aW9ucy5kdXJhdGlvbj90aGlzLnBvcz1iPXIuZWFzaW5nW3RoaXMuZWFzaW5nXShhLHRoaXMub3B0aW9ucy5kdXJhdGlvbiphLDAsMSx0aGlzLm9wdGlvbnMuZHVyYXRpb24pOnRoaXMucG9zPWI9YSx0aGlzLm5vdz0odGhpcy5lbmQtdGhpcy5zdGFydCkqYit0aGlzLnN0YXJ0LHRoaXMub3B0aW9ucy5zdGVwJiZ0aGlzLm9wdGlvbnMuc3RlcC5jYWxsKHRoaXMuZWxlbSx0aGlzLm5vdyx0aGlzKSxjJiZjLnNldD9jLnNldCh0aGlzKTpfYS5wcm9wSG9va3MuX2RlZmF1bHQuc2V0KHRoaXMpLHRoaXN9fSxfYS5wcm90b3R5cGUuaW5pdC5wcm90b3R5cGU9X2EucHJvdG90eXBlLF9hLnByb3BIb29rcz17X2RlZmF1bHQ6e2dldDpmdW5jdGlvbihhKXt2YXIgYjtyZXR1cm4gMSE9PWEuZWxlbS5ub2RlVHlwZXx8bnVsbCE9YS5lbGVtW2EucHJvcF0mJm51bGw9PWEuZWxlbS5zdHlsZVthLnByb3BdP2EuZWxlbVthLnByb3BdOihiPXIuY3NzKGEuZWxlbSxhLnByb3AsXCJcIiksYiYmXCJhdXRvXCIhPT1iP2I6MCl9LHNldDpmdW5jdGlvbihhKXtyLmZ4LnN0ZXBbYS5wcm9wXT9yLmZ4LnN0ZXBbYS5wcm9wXShhKToxIT09YS5lbGVtLm5vZGVUeXBlfHxudWxsPT1hLmVsZW0uc3R5bGVbci5jc3NQcm9wc1thLnByb3BdXSYmIXIuY3NzSG9va3NbYS5wcm9wXT9hLmVsZW1bYS5wcm9wXT1hLm5vdzpyLnN0eWxlKGEuZWxlbSxhLnByb3AsYS5ub3crYS51bml0KX19fSxfYS5wcm9wSG9va3Muc2Nyb2xsVG9wPV9hLnByb3BIb29rcy5zY3JvbGxMZWZ0PXtzZXQ6ZnVuY3Rpb24oYSl7YS5lbGVtLm5vZGVUeXBlJiZhLmVsZW0ucGFyZW50Tm9kZSYmKGEuZWxlbVthLnByb3BdPWEubm93KX19LHIuZWFzaW5nPXtsaW5lYXI6ZnVuY3Rpb24oYSl7cmV0dXJuIGF9LHN3aW5nOmZ1bmN0aW9uKGEpe3JldHVybi41LU1hdGguY29zKGEqTWF0aC5QSSkvMn0sX2RlZmF1bHQ6XCJzd2luZ1wifSxyLmZ4PV9hLnByb3RvdHlwZS5pbml0LHIuZnguc3RlcD17fTt2YXIgYWIsYmIsY2I9L14oPzp0b2dnbGV8c2hvd3xoaWRlKSQvLGRiPS9xdWV1ZUhvb2tzJC87ZnVuY3Rpb24gZWIoKXtiYiYmKGQuaGlkZGVuPT09ITEmJmEucmVxdWVzdEFuaW1hdGlvbkZyYW1lP2EucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGViKTphLnNldFRpbWVvdXQoZWIsci5meC5pbnRlcnZhbCksci5meC50aWNrKCkpfWZ1bmN0aW9uIGZiKCl7cmV0dXJuIGEuc2V0VGltZW91dChmdW5jdGlvbigpe2FiPXZvaWQgMH0pLGFiPXIubm93KCl9ZnVuY3Rpb24gZ2IoYSxiKXt2YXIgYyxkPTAsZT17aGVpZ2h0OmF9O2ZvcihiPWI/MTowO2Q8NDtkKz0yLWIpYz1jYVtkXSxlW1wibWFyZ2luXCIrY109ZVtcInBhZGRpbmdcIitjXT1hO3JldHVybiBiJiYoZS5vcGFjaXR5PWUud2lkdGg9YSksZX1mdW5jdGlvbiBoYihhLGIsYyl7Zm9yKHZhciBkLGU9KGtiLnR3ZWVuZXJzW2JdfHxbXSkuY29uY2F0KGtiLnR3ZWVuZXJzW1wiKlwiXSksZj0wLGc9ZS5sZW5ndGg7ZjxnO2YrKylpZihkPWVbZl0uY2FsbChjLGIsYSkpcmV0dXJuIGR9ZnVuY3Rpb24gaWIoYSxiLGMpe3ZhciBkLGUsZixnLGgsaSxqLGssbD1cIndpZHRoXCJpbiBifHxcImhlaWdodFwiaW4gYixtPXRoaXMsbj17fSxvPWEuc3R5bGUscD1hLm5vZGVUeXBlJiZkYShhKSxxPVcuZ2V0KGEsXCJmeHNob3dcIik7Yy5xdWV1ZXx8KGc9ci5fcXVldWVIb29rcyhhLFwiZnhcIiksbnVsbD09Zy51bnF1ZXVlZCYmKGcudW5xdWV1ZWQ9MCxoPWcuZW1wdHkuZmlyZSxnLmVtcHR5LmZpcmU9ZnVuY3Rpb24oKXtnLnVucXVldWVkfHxoKCl9KSxnLnVucXVldWVkKyssbS5hbHdheXMoZnVuY3Rpb24oKXttLmFsd2F5cyhmdW5jdGlvbigpe2cudW5xdWV1ZWQtLSxyLnF1ZXVlKGEsXCJmeFwiKS5sZW5ndGh8fGcuZW1wdHkuZmlyZSgpfSl9KSk7Zm9yKGQgaW4gYilpZihlPWJbZF0sY2IudGVzdChlKSl7aWYoZGVsZXRlIGJbZF0sZj1mfHxcInRvZ2dsZVwiPT09ZSxlPT09KHA/XCJoaWRlXCI6XCJzaG93XCIpKXtpZihcInNob3dcIiE9PWV8fCFxfHx2b2lkIDA9PT1xW2RdKWNvbnRpbnVlO3A9ITB9bltkXT1xJiZxW2RdfHxyLnN0eWxlKGEsZCl9aWYoaT0hci5pc0VtcHR5T2JqZWN0KGIpLGl8fCFyLmlzRW1wdHlPYmplY3Qobikpe2wmJjE9PT1hLm5vZGVUeXBlJiYoYy5vdmVyZmxvdz1bby5vdmVyZmxvdyxvLm92ZXJmbG93WCxvLm92ZXJmbG93WV0saj1xJiZxLmRpc3BsYXksbnVsbD09aiYmKGo9Vy5nZXQoYSxcImRpc3BsYXlcIikpLGs9ci5jc3MoYSxcImRpc3BsYXlcIiksXCJub25lXCI9PT1rJiYoaj9rPWo6KGlhKFthXSwhMCksaj1hLnN0eWxlLmRpc3BsYXl8fGosaz1yLmNzcyhhLFwiZGlzcGxheVwiKSxpYShbYV0pKSksKFwiaW5saW5lXCI9PT1rfHxcImlubGluZS1ibG9ja1wiPT09ayYmbnVsbCE9aikmJlwibm9uZVwiPT09ci5jc3MoYSxcImZsb2F0XCIpJiYoaXx8KG0uZG9uZShmdW5jdGlvbigpe28uZGlzcGxheT1qfSksbnVsbD09aiYmKGs9by5kaXNwbGF5LGo9XCJub25lXCI9PT1rP1wiXCI6aykpLG8uZGlzcGxheT1cImlubGluZS1ibG9ja1wiKSksYy5vdmVyZmxvdyYmKG8ub3ZlcmZsb3c9XCJoaWRkZW5cIixtLmFsd2F5cyhmdW5jdGlvbigpe28ub3ZlcmZsb3c9Yy5vdmVyZmxvd1swXSxvLm92ZXJmbG93WD1jLm92ZXJmbG93WzFdLG8ub3ZlcmZsb3dZPWMub3ZlcmZsb3dbMl19KSksaT0hMTtmb3IoZCBpbiBuKWl8fChxP1wiaGlkZGVuXCJpbiBxJiYocD1xLmhpZGRlbik6cT1XLmFjY2VzcyhhLFwiZnhzaG93XCIse2Rpc3BsYXk6an0pLGYmJihxLmhpZGRlbj0hcCkscCYmaWEoW2FdLCEwKSxtLmRvbmUoZnVuY3Rpb24oKXtwfHxpYShbYV0pLFcucmVtb3ZlKGEsXCJmeHNob3dcIik7Zm9yKGQgaW4gbilyLnN0eWxlKGEsZCxuW2RdKX0pKSxpPWhiKHA/cVtkXTowLGQsbSksZCBpbiBxfHwocVtkXT1pLnN0YXJ0LHAmJihpLmVuZD1pLnN0YXJ0LGkuc3RhcnQ9MCkpfX1mdW5jdGlvbiBqYihhLGIpe3ZhciBjLGQsZSxmLGc7Zm9yKGMgaW4gYSlpZihkPXIuY2FtZWxDYXNlKGMpLGU9YltkXSxmPWFbY10sQXJyYXkuaXNBcnJheShmKSYmKGU9ZlsxXSxmPWFbY109ZlswXSksYyE9PWQmJihhW2RdPWYsZGVsZXRlIGFbY10pLGc9ci5jc3NIb29rc1tkXSxnJiZcImV4cGFuZFwiaW4gZyl7Zj1nLmV4cGFuZChmKSxkZWxldGUgYVtkXTtmb3IoYyBpbiBmKWMgaW4gYXx8KGFbY109ZltjXSxiW2NdPWUpfWVsc2UgYltkXT1lfWZ1bmN0aW9uIGtiKGEsYixjKXt2YXIgZCxlLGY9MCxnPWtiLnByZWZpbHRlcnMubGVuZ3RoLGg9ci5EZWZlcnJlZCgpLmFsd2F5cyhmdW5jdGlvbigpe2RlbGV0ZSBpLmVsZW19KSxpPWZ1bmN0aW9uKCl7aWYoZSlyZXR1cm4hMTtmb3IodmFyIGI9YWJ8fGZiKCksYz1NYXRoLm1heCgwLGouc3RhcnRUaW1lK2ouZHVyYXRpb24tYiksZD1jL2ouZHVyYXRpb258fDAsZj0xLWQsZz0wLGk9ai50d2VlbnMubGVuZ3RoO2c8aTtnKyspai50d2VlbnNbZ10ucnVuKGYpO3JldHVybiBoLm5vdGlmeVdpdGgoYSxbaixmLGNdKSxmPDEmJmk/YzooaXx8aC5ub3RpZnlXaXRoKGEsW2osMSwwXSksaC5yZXNvbHZlV2l0aChhLFtqXSksITEpfSxqPWgucHJvbWlzZSh7ZWxlbTphLHByb3BzOnIuZXh0ZW5kKHt9LGIpLG9wdHM6ci5leHRlbmQoITAse3NwZWNpYWxFYXNpbmc6e30sZWFzaW5nOnIuZWFzaW5nLl9kZWZhdWx0fSxjKSxvcmlnaW5hbFByb3BlcnRpZXM6YixvcmlnaW5hbE9wdGlvbnM6YyxzdGFydFRpbWU6YWJ8fGZiKCksZHVyYXRpb246Yy5kdXJhdGlvbix0d2VlbnM6W10sY3JlYXRlVHdlZW46ZnVuY3Rpb24oYixjKXt2YXIgZD1yLlR3ZWVuKGEsai5vcHRzLGIsYyxqLm9wdHMuc3BlY2lhbEVhc2luZ1tiXXx8ai5vcHRzLmVhc2luZyk7cmV0dXJuIGoudHdlZW5zLnB1c2goZCksZH0sc3RvcDpmdW5jdGlvbihiKXt2YXIgYz0wLGQ9Yj9qLnR3ZWVucy5sZW5ndGg6MDtpZihlKXJldHVybiB0aGlzO2ZvcihlPSEwO2M8ZDtjKyspai50d2VlbnNbY10ucnVuKDEpO3JldHVybiBiPyhoLm5vdGlmeVdpdGgoYSxbaiwxLDBdKSxoLnJlc29sdmVXaXRoKGEsW2osYl0pKTpoLnJlamVjdFdpdGgoYSxbaixiXSksdGhpc319KSxrPWoucHJvcHM7Zm9yKGpiKGssai5vcHRzLnNwZWNpYWxFYXNpbmcpO2Y8ZztmKyspaWYoZD1rYi5wcmVmaWx0ZXJzW2ZdLmNhbGwoaixhLGssai5vcHRzKSlyZXR1cm4gci5pc0Z1bmN0aW9uKGQuc3RvcCkmJihyLl9xdWV1ZUhvb2tzKGouZWxlbSxqLm9wdHMucXVldWUpLnN0b3A9ci5wcm94eShkLnN0b3AsZCkpLGQ7cmV0dXJuIHIubWFwKGssaGIsaiksci5pc0Z1bmN0aW9uKGoub3B0cy5zdGFydCkmJmoub3B0cy5zdGFydC5jYWxsKGEsaiksai5wcm9ncmVzcyhqLm9wdHMucHJvZ3Jlc3MpLmRvbmUoai5vcHRzLmRvbmUsai5vcHRzLmNvbXBsZXRlKS5mYWlsKGoub3B0cy5mYWlsKS5hbHdheXMoai5vcHRzLmFsd2F5cyksci5meC50aW1lcihyLmV4dGVuZChpLHtlbGVtOmEsYW5pbTpqLHF1ZXVlOmoub3B0cy5xdWV1ZX0pKSxqfXIuQW5pbWF0aW9uPXIuZXh0ZW5kKGtiLHt0d2VlbmVyczp7XCIqXCI6W2Z1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5jcmVhdGVUd2VlbihhLGIpO3JldHVybiBmYShjLmVsZW0sYSxiYS5leGVjKGIpLGMpLGN9XX0sdHdlZW5lcjpmdW5jdGlvbihhLGIpe3IuaXNGdW5jdGlvbihhKT8oYj1hLGE9W1wiKlwiXSk6YT1hLm1hdGNoKEwpO2Zvcih2YXIgYyxkPTAsZT1hLmxlbmd0aDtkPGU7ZCsrKWM9YVtkXSxrYi50d2VlbmVyc1tjXT1rYi50d2VlbmVyc1tjXXx8W10sa2IudHdlZW5lcnNbY10udW5zaGlmdChiKX0scHJlZmlsdGVyczpbaWJdLHByZWZpbHRlcjpmdW5jdGlvbihhLGIpe2I/a2IucHJlZmlsdGVycy51bnNoaWZ0KGEpOmtiLnByZWZpbHRlcnMucHVzaChhKX19KSxyLnNwZWVkPWZ1bmN0aW9uKGEsYixjKXt2YXIgZD1hJiZcIm9iamVjdFwiPT10eXBlb2YgYT9yLmV4dGVuZCh7fSxhKTp7Y29tcGxldGU6Y3x8IWMmJmJ8fHIuaXNGdW5jdGlvbihhKSYmYSxkdXJhdGlvbjphLGVhc2luZzpjJiZifHxiJiYhci5pc0Z1bmN0aW9uKGIpJiZifTtyZXR1cm4gci5meC5vZmY/ZC5kdXJhdGlvbj0wOlwibnVtYmVyXCIhPXR5cGVvZiBkLmR1cmF0aW9uJiYoZC5kdXJhdGlvbiBpbiByLmZ4LnNwZWVkcz9kLmR1cmF0aW9uPXIuZnguc3BlZWRzW2QuZHVyYXRpb25dOmQuZHVyYXRpb249ci5meC5zcGVlZHMuX2RlZmF1bHQpLG51bGwhPWQucXVldWUmJmQucXVldWUhPT0hMHx8KGQucXVldWU9XCJmeFwiKSxkLm9sZD1kLmNvbXBsZXRlLGQuY29tcGxldGU9ZnVuY3Rpb24oKXtyLmlzRnVuY3Rpb24oZC5vbGQpJiZkLm9sZC5jYWxsKHRoaXMpLGQucXVldWUmJnIuZGVxdWV1ZSh0aGlzLGQucXVldWUpfSxkfSxyLmZuLmV4dGVuZCh7ZmFkZVRvOmZ1bmN0aW9uKGEsYixjLGQpe3JldHVybiB0aGlzLmZpbHRlcihkYSkuY3NzKFwib3BhY2l0eVwiLDApLnNob3coKS5lbmQoKS5hbmltYXRlKHtvcGFjaXR5OmJ9LGEsYyxkKX0sYW5pbWF0ZTpmdW5jdGlvbihhLGIsYyxkKXt2YXIgZT1yLmlzRW1wdHlPYmplY3QoYSksZj1yLnNwZWVkKGIsYyxkKSxnPWZ1bmN0aW9uKCl7dmFyIGI9a2IodGhpcyxyLmV4dGVuZCh7fSxhKSxmKTsoZXx8Vy5nZXQodGhpcyxcImZpbmlzaFwiKSkmJmIuc3RvcCghMCl9O3JldHVybiBnLmZpbmlzaD1nLGV8fGYucXVldWU9PT0hMT90aGlzLmVhY2goZyk6dGhpcy5xdWV1ZShmLnF1ZXVlLGcpfSxzdG9wOmZ1bmN0aW9uKGEsYixjKXt2YXIgZD1mdW5jdGlvbihhKXt2YXIgYj1hLnN0b3A7ZGVsZXRlIGEuc3RvcCxiKGMpfTtyZXR1cm5cInN0cmluZ1wiIT10eXBlb2YgYSYmKGM9YixiPWEsYT12b2lkIDApLGImJmEhPT0hMSYmdGhpcy5xdWV1ZShhfHxcImZ4XCIsW10pLHRoaXMuZWFjaChmdW5jdGlvbigpe3ZhciBiPSEwLGU9bnVsbCE9YSYmYStcInF1ZXVlSG9va3NcIixmPXIudGltZXJzLGc9Vy5nZXQodGhpcyk7aWYoZSlnW2VdJiZnW2VdLnN0b3AmJmQoZ1tlXSk7ZWxzZSBmb3IoZSBpbiBnKWdbZV0mJmdbZV0uc3RvcCYmZGIudGVzdChlKSYmZChnW2VdKTtmb3IoZT1mLmxlbmd0aDtlLS07KWZbZV0uZWxlbSE9PXRoaXN8fG51bGwhPWEmJmZbZV0ucXVldWUhPT1hfHwoZltlXS5hbmltLnN0b3AoYyksYj0hMSxmLnNwbGljZShlLDEpKTshYiYmY3x8ci5kZXF1ZXVlKHRoaXMsYSl9KX0sZmluaXNoOmZ1bmN0aW9uKGEpe3JldHVybiBhIT09ITEmJihhPWF8fFwiZnhcIiksdGhpcy5lYWNoKGZ1bmN0aW9uKCl7dmFyIGIsYz1XLmdldCh0aGlzKSxkPWNbYStcInF1ZXVlXCJdLGU9Y1thK1wicXVldWVIb29rc1wiXSxmPXIudGltZXJzLGc9ZD9kLmxlbmd0aDowO2ZvcihjLmZpbmlzaD0hMCxyLnF1ZXVlKHRoaXMsYSxbXSksZSYmZS5zdG9wJiZlLnN0b3AuY2FsbCh0aGlzLCEwKSxiPWYubGVuZ3RoO2ItLTspZltiXS5lbGVtPT09dGhpcyYmZltiXS5xdWV1ZT09PWEmJihmW2JdLmFuaW0uc3RvcCghMCksZi5zcGxpY2UoYiwxKSk7Zm9yKGI9MDtiPGc7YisrKWRbYl0mJmRbYl0uZmluaXNoJiZkW2JdLmZpbmlzaC5jYWxsKHRoaXMpO2RlbGV0ZSBjLmZpbmlzaH0pfX0pLHIuZWFjaChbXCJ0b2dnbGVcIixcInNob3dcIixcImhpZGVcIl0sZnVuY3Rpb24oYSxiKXt2YXIgYz1yLmZuW2JdO3IuZm5bYl09ZnVuY3Rpb24oYSxkLGUpe3JldHVybiBudWxsPT1hfHxcImJvb2xlYW5cIj09dHlwZW9mIGE/Yy5hcHBseSh0aGlzLGFyZ3VtZW50cyk6dGhpcy5hbmltYXRlKGdiKGIsITApLGEsZCxlKX19KSxyLmVhY2goe3NsaWRlRG93bjpnYihcInNob3dcIiksc2xpZGVVcDpnYihcImhpZGVcIiksc2xpZGVUb2dnbGU6Z2IoXCJ0b2dnbGVcIiksZmFkZUluOntvcGFjaXR5Olwic2hvd1wifSxmYWRlT3V0OntvcGFjaXR5OlwiaGlkZVwifSxmYWRlVG9nZ2xlOntvcGFjaXR5OlwidG9nZ2xlXCJ9fSxmdW5jdGlvbihhLGIpe3IuZm5bYV09ZnVuY3Rpb24oYSxjLGQpe3JldHVybiB0aGlzLmFuaW1hdGUoYixhLGMsZCl9fSksci50aW1lcnM9W10sci5meC50aWNrPWZ1bmN0aW9uKCl7dmFyIGEsYj0wLGM9ci50aW1lcnM7Zm9yKGFiPXIubm93KCk7YjxjLmxlbmd0aDtiKyspYT1jW2JdLGEoKXx8Y1tiXSE9PWF8fGMuc3BsaWNlKGItLSwxKTtjLmxlbmd0aHx8ci5meC5zdG9wKCksYWI9dm9pZCAwfSxyLmZ4LnRpbWVyPWZ1bmN0aW9uKGEpe3IudGltZXJzLnB1c2goYSksci5meC5zdGFydCgpfSxyLmZ4LmludGVydmFsPTEzLHIuZnguc3RhcnQ9ZnVuY3Rpb24oKXtiYnx8KGJiPSEwLGViKCkpfSxyLmZ4LnN0b3A9ZnVuY3Rpb24oKXtiYj1udWxsfSxyLmZ4LnNwZWVkcz17c2xvdzo2MDAsZmFzdDoyMDAsX2RlZmF1bHQ6NDAwfSxyLmZuLmRlbGF5PWZ1bmN0aW9uKGIsYyl7cmV0dXJuIGI9ci5meD9yLmZ4LnNwZWVkc1tiXXx8YjpiLGM9Y3x8XCJmeFwiLHRoaXMucXVldWUoYyxmdW5jdGlvbihjLGQpe3ZhciBlPWEuc2V0VGltZW91dChjLGIpO2Quc3RvcD1mdW5jdGlvbigpe2EuY2xlYXJUaW1lb3V0KGUpfX0pfSxmdW5jdGlvbigpe3ZhciBhPWQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpLGI9ZC5jcmVhdGVFbGVtZW50KFwic2VsZWN0XCIpLGM9Yi5hcHBlbmRDaGlsZChkLmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIikpO2EudHlwZT1cImNoZWNrYm94XCIsby5jaGVja09uPVwiXCIhPT1hLnZhbHVlLG8ub3B0U2VsZWN0ZWQ9Yy5zZWxlY3RlZCxhPWQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpLGEudmFsdWU9XCJ0XCIsYS50eXBlPVwicmFkaW9cIixvLnJhZGlvVmFsdWU9XCJ0XCI9PT1hLnZhbHVlfSgpO3ZhciBsYixtYj1yLmV4cHIuYXR0ckhhbmRsZTtyLmZuLmV4dGVuZCh7YXR0cjpmdW5jdGlvbihhLGIpe3JldHVybiBUKHRoaXMsci5hdHRyLGEsYixhcmd1bWVudHMubGVuZ3RoPjEpfSxyZW1vdmVBdHRyOmZ1bmN0aW9uKGEpe3JldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKXtyLnJlbW92ZUF0dHIodGhpcyxhKX0pfX0pLHIuZXh0ZW5kKHthdHRyOmZ1bmN0aW9uKGEsYixjKXt2YXIgZCxlLGY9YS5ub2RlVHlwZTtpZigzIT09ZiYmOCE9PWYmJjIhPT1mKXJldHVyblwidW5kZWZpbmVkXCI9PXR5cGVvZiBhLmdldEF0dHJpYnV0ZT9yLnByb3AoYSxiLGMpOigxPT09ZiYmci5pc1hNTERvYyhhKXx8KGU9ci5hdHRySG9va3NbYi50b0xvd2VyQ2FzZSgpXXx8KHIuZXhwci5tYXRjaC5ib29sLnRlc3QoYik/bGI6dm9pZCAwKSksdm9pZCAwIT09Yz9udWxsPT09Yz92b2lkIHIucmVtb3ZlQXR0cihhLGIpOmUmJlwic2V0XCJpbiBlJiZ2b2lkIDAhPT0oZD1lLnNldChhLGMsYikpP2Q6KGEuc2V0QXR0cmlidXRlKGIsYytcIlwiKSxjKTplJiZcImdldFwiaW4gZSYmbnVsbCE9PShkPWUuZ2V0KGEsYikpP2Q6KGQ9ci5maW5kLmF0dHIoYSxiKSxcbm51bGw9PWQ/dm9pZCAwOmQpKX0sYXR0ckhvb2tzOnt0eXBlOntzZXQ6ZnVuY3Rpb24oYSxiKXtpZighby5yYWRpb1ZhbHVlJiZcInJhZGlvXCI9PT1iJiZCKGEsXCJpbnB1dFwiKSl7dmFyIGM9YS52YWx1ZTtyZXR1cm4gYS5zZXRBdHRyaWJ1dGUoXCJ0eXBlXCIsYiksYyYmKGEudmFsdWU9YyksYn19fX0scmVtb3ZlQXR0cjpmdW5jdGlvbihhLGIpe3ZhciBjLGQ9MCxlPWImJmIubWF0Y2goTCk7aWYoZSYmMT09PWEubm9kZVR5cGUpd2hpbGUoYz1lW2QrK10pYS5yZW1vdmVBdHRyaWJ1dGUoYyl9fSksbGI9e3NldDpmdW5jdGlvbihhLGIsYyl7cmV0dXJuIGI9PT0hMT9yLnJlbW92ZUF0dHIoYSxjKTphLnNldEF0dHJpYnV0ZShjLGMpLGN9fSxyLmVhY2goci5leHByLm1hdGNoLmJvb2wuc291cmNlLm1hdGNoKC9cXHcrL2cpLGZ1bmN0aW9uKGEsYil7dmFyIGM9bWJbYl18fHIuZmluZC5hdHRyO21iW2JdPWZ1bmN0aW9uKGEsYixkKXt2YXIgZSxmLGc9Yi50b0xvd2VyQ2FzZSgpO3JldHVybiBkfHwoZj1tYltnXSxtYltnXT1lLGU9bnVsbCE9YyhhLGIsZCk/ZzpudWxsLG1iW2ddPWYpLGV9fSk7dmFyIG5iPS9eKD86aW5wdXR8c2VsZWN0fHRleHRhcmVhfGJ1dHRvbikkL2ksb2I9L14oPzphfGFyZWEpJC9pO3IuZm4uZXh0ZW5kKHtwcm9wOmZ1bmN0aW9uKGEsYil7cmV0dXJuIFQodGhpcyxyLnByb3AsYSxiLGFyZ3VtZW50cy5sZW5ndGg+MSl9LHJlbW92ZVByb3A6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbigpe2RlbGV0ZSB0aGlzW3IucHJvcEZpeFthXXx8YV19KX19KSxyLmV4dGVuZCh7cHJvcDpmdW5jdGlvbihhLGIsYyl7dmFyIGQsZSxmPWEubm9kZVR5cGU7aWYoMyE9PWYmJjghPT1mJiYyIT09ZilyZXR1cm4gMT09PWYmJnIuaXNYTUxEb2MoYSl8fChiPXIucHJvcEZpeFtiXXx8YixlPXIucHJvcEhvb2tzW2JdKSx2b2lkIDAhPT1jP2UmJlwic2V0XCJpbiBlJiZ2b2lkIDAhPT0oZD1lLnNldChhLGMsYikpP2Q6YVtiXT1jOmUmJlwiZ2V0XCJpbiBlJiZudWxsIT09KGQ9ZS5nZXQoYSxiKSk/ZDphW2JdfSxwcm9wSG9va3M6e3RhYkluZGV4OntnZXQ6ZnVuY3Rpb24oYSl7dmFyIGI9ci5maW5kLmF0dHIoYSxcInRhYmluZGV4XCIpO3JldHVybiBiP3BhcnNlSW50KGIsMTApOm5iLnRlc3QoYS5ub2RlTmFtZSl8fG9iLnRlc3QoYS5ub2RlTmFtZSkmJmEuaHJlZj8wOi0xfX19LHByb3BGaXg6e1wiZm9yXCI6XCJodG1sRm9yXCIsXCJjbGFzc1wiOlwiY2xhc3NOYW1lXCJ9fSksby5vcHRTZWxlY3RlZHx8KHIucHJvcEhvb2tzLnNlbGVjdGVkPXtnZXQ6ZnVuY3Rpb24oYSl7dmFyIGI9YS5wYXJlbnROb2RlO3JldHVybiBiJiZiLnBhcmVudE5vZGUmJmIucGFyZW50Tm9kZS5zZWxlY3RlZEluZGV4LG51bGx9LHNldDpmdW5jdGlvbihhKXt2YXIgYj1hLnBhcmVudE5vZGU7YiYmKGIuc2VsZWN0ZWRJbmRleCxiLnBhcmVudE5vZGUmJmIucGFyZW50Tm9kZS5zZWxlY3RlZEluZGV4KX19KSxyLmVhY2goW1widGFiSW5kZXhcIixcInJlYWRPbmx5XCIsXCJtYXhMZW5ndGhcIixcImNlbGxTcGFjaW5nXCIsXCJjZWxsUGFkZGluZ1wiLFwicm93U3BhblwiLFwiY29sU3BhblwiLFwidXNlTWFwXCIsXCJmcmFtZUJvcmRlclwiLFwiY29udGVudEVkaXRhYmxlXCJdLGZ1bmN0aW9uKCl7ci5wcm9wRml4W3RoaXMudG9Mb3dlckNhc2UoKV09dGhpc30pO2Z1bmN0aW9uIHBiKGEpe3ZhciBiPWEubWF0Y2goTCl8fFtdO3JldHVybiBiLmpvaW4oXCIgXCIpfWZ1bmN0aW9uIHFiKGEpe3JldHVybiBhLmdldEF0dHJpYnV0ZSYmYS5nZXRBdHRyaWJ1dGUoXCJjbGFzc1wiKXx8XCJcIn1yLmZuLmV4dGVuZCh7YWRkQ2xhc3M6ZnVuY3Rpb24oYSl7dmFyIGIsYyxkLGUsZixnLGgsaT0wO2lmKHIuaXNGdW5jdGlvbihhKSlyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKGIpe3IodGhpcykuYWRkQ2xhc3MoYS5jYWxsKHRoaXMsYixxYih0aGlzKSkpfSk7aWYoXCJzdHJpbmdcIj09dHlwZW9mIGEmJmEpe2I9YS5tYXRjaChMKXx8W107d2hpbGUoYz10aGlzW2krK10paWYoZT1xYihjKSxkPTE9PT1jLm5vZGVUeXBlJiZcIiBcIitwYihlKStcIiBcIil7Zz0wO3doaWxlKGY9YltnKytdKWQuaW5kZXhPZihcIiBcIitmK1wiIFwiKTwwJiYoZCs9ZitcIiBcIik7aD1wYihkKSxlIT09aCYmYy5zZXRBdHRyaWJ1dGUoXCJjbGFzc1wiLGgpfX1yZXR1cm4gdGhpc30scmVtb3ZlQ2xhc3M6ZnVuY3Rpb24oYSl7dmFyIGIsYyxkLGUsZixnLGgsaT0wO2lmKHIuaXNGdW5jdGlvbihhKSlyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKGIpe3IodGhpcykucmVtb3ZlQ2xhc3MoYS5jYWxsKHRoaXMsYixxYih0aGlzKSkpfSk7aWYoIWFyZ3VtZW50cy5sZW5ndGgpcmV0dXJuIHRoaXMuYXR0cihcImNsYXNzXCIsXCJcIik7aWYoXCJzdHJpbmdcIj09dHlwZW9mIGEmJmEpe2I9YS5tYXRjaChMKXx8W107d2hpbGUoYz10aGlzW2krK10paWYoZT1xYihjKSxkPTE9PT1jLm5vZGVUeXBlJiZcIiBcIitwYihlKStcIiBcIil7Zz0wO3doaWxlKGY9YltnKytdKXdoaWxlKGQuaW5kZXhPZihcIiBcIitmK1wiIFwiKT4tMSlkPWQucmVwbGFjZShcIiBcIitmK1wiIFwiLFwiIFwiKTtoPXBiKGQpLGUhPT1oJiZjLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsaCl9fXJldHVybiB0aGlzfSx0b2dnbGVDbGFzczpmdW5jdGlvbihhLGIpe3ZhciBjPXR5cGVvZiBhO3JldHVyblwiYm9vbGVhblwiPT10eXBlb2YgYiYmXCJzdHJpbmdcIj09PWM/Yj90aGlzLmFkZENsYXNzKGEpOnRoaXMucmVtb3ZlQ2xhc3MoYSk6ci5pc0Z1bmN0aW9uKGEpP3RoaXMuZWFjaChmdW5jdGlvbihjKXtyKHRoaXMpLnRvZ2dsZUNsYXNzKGEuY2FsbCh0aGlzLGMscWIodGhpcyksYiksYil9KTp0aGlzLmVhY2goZnVuY3Rpb24oKXt2YXIgYixkLGUsZjtpZihcInN0cmluZ1wiPT09Yyl7ZD0wLGU9cih0aGlzKSxmPWEubWF0Y2goTCl8fFtdO3doaWxlKGI9ZltkKytdKWUuaGFzQ2xhc3MoYik/ZS5yZW1vdmVDbGFzcyhiKTplLmFkZENsYXNzKGIpfWVsc2Ugdm9pZCAwIT09YSYmXCJib29sZWFuXCIhPT1jfHwoYj1xYih0aGlzKSxiJiZXLnNldCh0aGlzLFwiX19jbGFzc05hbWVfX1wiLGIpLHRoaXMuc2V0QXR0cmlidXRlJiZ0aGlzLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsYnx8YT09PSExP1wiXCI6Vy5nZXQodGhpcyxcIl9fY2xhc3NOYW1lX19cIil8fFwiXCIpKX0pfSxoYXNDbGFzczpmdW5jdGlvbihhKXt2YXIgYixjLGQ9MDtiPVwiIFwiK2ErXCIgXCI7d2hpbGUoYz10aGlzW2QrK10paWYoMT09PWMubm9kZVR5cGUmJihcIiBcIitwYihxYihjKSkrXCIgXCIpLmluZGV4T2YoYik+LTEpcmV0dXJuITA7cmV0dXJuITF9fSk7dmFyIHJiPS9cXHIvZztyLmZuLmV4dGVuZCh7dmFsOmZ1bmN0aW9uKGEpe3ZhciBiLGMsZCxlPXRoaXNbMF07e2lmKGFyZ3VtZW50cy5sZW5ndGgpcmV0dXJuIGQ9ci5pc0Z1bmN0aW9uKGEpLHRoaXMuZWFjaChmdW5jdGlvbihjKXt2YXIgZTsxPT09dGhpcy5ub2RlVHlwZSYmKGU9ZD9hLmNhbGwodGhpcyxjLHIodGhpcykudmFsKCkpOmEsbnVsbD09ZT9lPVwiXCI6XCJudW1iZXJcIj09dHlwZW9mIGU/ZSs9XCJcIjpBcnJheS5pc0FycmF5KGUpJiYoZT1yLm1hcChlLGZ1bmN0aW9uKGEpe3JldHVybiBudWxsPT1hP1wiXCI6YStcIlwifSkpLGI9ci52YWxIb29rc1t0aGlzLnR5cGVdfHxyLnZhbEhvb2tzW3RoaXMubm9kZU5hbWUudG9Mb3dlckNhc2UoKV0sYiYmXCJzZXRcImluIGImJnZvaWQgMCE9PWIuc2V0KHRoaXMsZSxcInZhbHVlXCIpfHwodGhpcy52YWx1ZT1lKSl9KTtpZihlKXJldHVybiBiPXIudmFsSG9va3NbZS50eXBlXXx8ci52YWxIb29rc1tlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCldLGImJlwiZ2V0XCJpbiBiJiZ2b2lkIDAhPT0oYz1iLmdldChlLFwidmFsdWVcIikpP2M6KGM9ZS52YWx1ZSxcInN0cmluZ1wiPT10eXBlb2YgYz9jLnJlcGxhY2UocmIsXCJcIik6bnVsbD09Yz9cIlwiOmMpfX19KSxyLmV4dGVuZCh7dmFsSG9va3M6e29wdGlvbjp7Z2V0OmZ1bmN0aW9uKGEpe3ZhciBiPXIuZmluZC5hdHRyKGEsXCJ2YWx1ZVwiKTtyZXR1cm4gbnVsbCE9Yj9iOnBiKHIudGV4dChhKSl9fSxzZWxlY3Q6e2dldDpmdW5jdGlvbihhKXt2YXIgYixjLGQsZT1hLm9wdGlvbnMsZj1hLnNlbGVjdGVkSW5kZXgsZz1cInNlbGVjdC1vbmVcIj09PWEudHlwZSxoPWc/bnVsbDpbXSxpPWc/ZisxOmUubGVuZ3RoO2ZvcihkPWY8MD9pOmc/ZjowO2Q8aTtkKyspaWYoYz1lW2RdLChjLnNlbGVjdGVkfHxkPT09ZikmJiFjLmRpc2FibGVkJiYoIWMucGFyZW50Tm9kZS5kaXNhYmxlZHx8IUIoYy5wYXJlbnROb2RlLFwib3B0Z3JvdXBcIikpKXtpZihiPXIoYykudmFsKCksZylyZXR1cm4gYjtoLnB1c2goYil9cmV0dXJuIGh9LHNldDpmdW5jdGlvbihhLGIpe3ZhciBjLGQsZT1hLm9wdGlvbnMsZj1yLm1ha2VBcnJheShiKSxnPWUubGVuZ3RoO3doaWxlKGctLSlkPWVbZ10sKGQuc2VsZWN0ZWQ9ci5pbkFycmF5KHIudmFsSG9va3Mub3B0aW9uLmdldChkKSxmKT4tMSkmJihjPSEwKTtyZXR1cm4gY3x8KGEuc2VsZWN0ZWRJbmRleD0tMSksZn19fX0pLHIuZWFjaChbXCJyYWRpb1wiLFwiY2hlY2tib3hcIl0sZnVuY3Rpb24oKXtyLnZhbEhvb2tzW3RoaXNdPXtzZXQ6ZnVuY3Rpb24oYSxiKXtpZihBcnJheS5pc0FycmF5KGIpKXJldHVybiBhLmNoZWNrZWQ9ci5pbkFycmF5KHIoYSkudmFsKCksYik+LTF9fSxvLmNoZWNrT258fChyLnZhbEhvb2tzW3RoaXNdLmdldD1mdW5jdGlvbihhKXtyZXR1cm4gbnVsbD09PWEuZ2V0QXR0cmlidXRlKFwidmFsdWVcIik/XCJvblwiOmEudmFsdWV9KX0pO3ZhciBzYj0vXig/OmZvY3VzaW5mb2N1c3xmb2N1c291dGJsdXIpJC87ci5leHRlbmQoci5ldmVudCx7dHJpZ2dlcjpmdW5jdGlvbihiLGMsZSxmKXt2YXIgZyxoLGksaixrLG0sbixvPVtlfHxkXSxwPWwuY2FsbChiLFwidHlwZVwiKT9iLnR5cGU6YixxPWwuY2FsbChiLFwibmFtZXNwYWNlXCIpP2IubmFtZXNwYWNlLnNwbGl0KFwiLlwiKTpbXTtpZihoPWk9ZT1lfHxkLDMhPT1lLm5vZGVUeXBlJiY4IT09ZS5ub2RlVHlwZSYmIXNiLnRlc3QocCtyLmV2ZW50LnRyaWdnZXJlZCkmJihwLmluZGV4T2YoXCIuXCIpPi0xJiYocT1wLnNwbGl0KFwiLlwiKSxwPXEuc2hpZnQoKSxxLnNvcnQoKSksaz1wLmluZGV4T2YoXCI6XCIpPDAmJlwib25cIitwLGI9YltyLmV4cGFuZG9dP2I6bmV3IHIuRXZlbnQocCxcIm9iamVjdFwiPT10eXBlb2YgYiYmYiksYi5pc1RyaWdnZXI9Zj8yOjMsYi5uYW1lc3BhY2U9cS5qb2luKFwiLlwiKSxiLnJuYW1lc3BhY2U9Yi5uYW1lc3BhY2U/bmV3IFJlZ0V4cChcIihefFxcXFwuKVwiK3Euam9pbihcIlxcXFwuKD86LipcXFxcLnwpXCIpK1wiKFxcXFwufCQpXCIpOm51bGwsYi5yZXN1bHQ9dm9pZCAwLGIudGFyZ2V0fHwoYi50YXJnZXQ9ZSksYz1udWxsPT1jP1tiXTpyLm1ha2VBcnJheShjLFtiXSksbj1yLmV2ZW50LnNwZWNpYWxbcF18fHt9LGZ8fCFuLnRyaWdnZXJ8fG4udHJpZ2dlci5hcHBseShlLGMpIT09ITEpKXtpZighZiYmIW4ubm9CdWJibGUmJiFyLmlzV2luZG93KGUpKXtmb3Ioaj1uLmRlbGVnYXRlVHlwZXx8cCxzYi50ZXN0KGorcCl8fChoPWgucGFyZW50Tm9kZSk7aDtoPWgucGFyZW50Tm9kZSlvLnB1c2goaCksaT1oO2k9PT0oZS5vd25lckRvY3VtZW50fHxkKSYmby5wdXNoKGkuZGVmYXVsdFZpZXd8fGkucGFyZW50V2luZG93fHxhKX1nPTA7d2hpbGUoKGg9b1tnKytdKSYmIWIuaXNQcm9wYWdhdGlvblN0b3BwZWQoKSliLnR5cGU9Zz4xP2o6bi5iaW5kVHlwZXx8cCxtPShXLmdldChoLFwiZXZlbnRzXCIpfHx7fSlbYi50eXBlXSYmVy5nZXQoaCxcImhhbmRsZVwiKSxtJiZtLmFwcGx5KGgsYyksbT1rJiZoW2tdLG0mJm0uYXBwbHkmJlUoaCkmJihiLnJlc3VsdD1tLmFwcGx5KGgsYyksYi5yZXN1bHQ9PT0hMSYmYi5wcmV2ZW50RGVmYXVsdCgpKTtyZXR1cm4gYi50eXBlPXAsZnx8Yi5pc0RlZmF1bHRQcmV2ZW50ZWQoKXx8bi5fZGVmYXVsdCYmbi5fZGVmYXVsdC5hcHBseShvLnBvcCgpLGMpIT09ITF8fCFVKGUpfHxrJiZyLmlzRnVuY3Rpb24oZVtwXSkmJiFyLmlzV2luZG93KGUpJiYoaT1lW2tdLGkmJihlW2tdPW51bGwpLHIuZXZlbnQudHJpZ2dlcmVkPXAsZVtwXSgpLHIuZXZlbnQudHJpZ2dlcmVkPXZvaWQgMCxpJiYoZVtrXT1pKSksYi5yZXN1bHR9fSxzaW11bGF0ZTpmdW5jdGlvbihhLGIsYyl7dmFyIGQ9ci5leHRlbmQobmV3IHIuRXZlbnQsYyx7dHlwZTphLGlzU2ltdWxhdGVkOiEwfSk7ci5ldmVudC50cmlnZ2VyKGQsbnVsbCxiKX19KSxyLmZuLmV4dGVuZCh7dHJpZ2dlcjpmdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLmVhY2goZnVuY3Rpb24oKXtyLmV2ZW50LnRyaWdnZXIoYSxiLHRoaXMpfSl9LHRyaWdnZXJIYW5kbGVyOmZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpc1swXTtpZihjKXJldHVybiByLmV2ZW50LnRyaWdnZXIoYSxiLGMsITApfX0pLHIuZWFjaChcImJsdXIgZm9jdXMgZm9jdXNpbiBmb2N1c291dCByZXNpemUgc2Nyb2xsIGNsaWNrIGRibGNsaWNrIG1vdXNlZG93biBtb3VzZXVwIG1vdXNlbW92ZSBtb3VzZW92ZXIgbW91c2VvdXQgbW91c2VlbnRlciBtb3VzZWxlYXZlIGNoYW5nZSBzZWxlY3Qgc3VibWl0IGtleWRvd24ga2V5cHJlc3Mga2V5dXAgY29udGV4dG1lbnVcIi5zcGxpdChcIiBcIiksZnVuY3Rpb24oYSxiKXtyLmZuW2JdPWZ1bmN0aW9uKGEsYyl7cmV0dXJuIGFyZ3VtZW50cy5sZW5ndGg+MD90aGlzLm9uKGIsbnVsbCxhLGMpOnRoaXMudHJpZ2dlcihiKX19KSxyLmZuLmV4dGVuZCh7aG92ZXI6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gdGhpcy5tb3VzZWVudGVyKGEpLm1vdXNlbGVhdmUoYnx8YSl9fSksby5mb2N1c2luPVwib25mb2N1c2luXCJpbiBhLG8uZm9jdXNpbnx8ci5lYWNoKHtmb2N1czpcImZvY3VzaW5cIixibHVyOlwiZm9jdXNvdXRcIn0sZnVuY3Rpb24oYSxiKXt2YXIgYz1mdW5jdGlvbihhKXtyLmV2ZW50LnNpbXVsYXRlKGIsYS50YXJnZXQsci5ldmVudC5maXgoYSkpfTtyLmV2ZW50LnNwZWNpYWxbYl09e3NldHVwOmZ1bmN0aW9uKCl7dmFyIGQ9dGhpcy5vd25lckRvY3VtZW50fHx0aGlzLGU9Vy5hY2Nlc3MoZCxiKTtlfHxkLmFkZEV2ZW50TGlzdGVuZXIoYSxjLCEwKSxXLmFjY2VzcyhkLGIsKGV8fDApKzEpfSx0ZWFyZG93bjpmdW5jdGlvbigpe3ZhciBkPXRoaXMub3duZXJEb2N1bWVudHx8dGhpcyxlPVcuYWNjZXNzKGQsYiktMTtlP1cuYWNjZXNzKGQsYixlKTooZC5yZW1vdmVFdmVudExpc3RlbmVyKGEsYywhMCksVy5yZW1vdmUoZCxiKSl9fX0pO3ZhciB0Yj1hLmxvY2F0aW9uLHViPXIubm93KCksdmI9L1xcPy87ci5wYXJzZVhNTD1mdW5jdGlvbihiKXt2YXIgYztpZighYnx8XCJzdHJpbmdcIiE9dHlwZW9mIGIpcmV0dXJuIG51bGw7dHJ5e2M9KG5ldyBhLkRPTVBhcnNlcikucGFyc2VGcm9tU3RyaW5nKGIsXCJ0ZXh0L3htbFwiKX1jYXRjaChkKXtjPXZvaWQgMH1yZXR1cm4gYyYmIWMuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJwYXJzZXJlcnJvclwiKS5sZW5ndGh8fHIuZXJyb3IoXCJJbnZhbGlkIFhNTDogXCIrYiksY307dmFyIHdiPS9cXFtcXF0kLyx4Yj0vXFxyP1xcbi9nLHliPS9eKD86c3VibWl0fGJ1dHRvbnxpbWFnZXxyZXNldHxmaWxlKSQvaSx6Yj0vXig/OmlucHV0fHNlbGVjdHx0ZXh0YXJlYXxrZXlnZW4pL2k7ZnVuY3Rpb24gQWIoYSxiLGMsZCl7dmFyIGU7aWYoQXJyYXkuaXNBcnJheShiKSlyLmVhY2goYixmdW5jdGlvbihiLGUpe2N8fHdiLnRlc3QoYSk/ZChhLGUpOkFiKGErXCJbXCIrKFwib2JqZWN0XCI9PXR5cGVvZiBlJiZudWxsIT1lP2I6XCJcIikrXCJdXCIsZSxjLGQpfSk7ZWxzZSBpZihjfHxcIm9iamVjdFwiIT09ci50eXBlKGIpKWQoYSxiKTtlbHNlIGZvcihlIGluIGIpQWIoYStcIltcIitlK1wiXVwiLGJbZV0sYyxkKX1yLnBhcmFtPWZ1bmN0aW9uKGEsYil7dmFyIGMsZD1bXSxlPWZ1bmN0aW9uKGEsYil7dmFyIGM9ci5pc0Z1bmN0aW9uKGIpP2IoKTpiO2RbZC5sZW5ndGhdPWVuY29kZVVSSUNvbXBvbmVudChhKStcIj1cIitlbmNvZGVVUklDb21wb25lbnQobnVsbD09Yz9cIlwiOmMpfTtpZihBcnJheS5pc0FycmF5KGEpfHxhLmpxdWVyeSYmIXIuaXNQbGFpbk9iamVjdChhKSlyLmVhY2goYSxmdW5jdGlvbigpe2UodGhpcy5uYW1lLHRoaXMudmFsdWUpfSk7ZWxzZSBmb3IoYyBpbiBhKUFiKGMsYVtjXSxiLGUpO3JldHVybiBkLmpvaW4oXCImXCIpfSxyLmZuLmV4dGVuZCh7c2VyaWFsaXplOmZ1bmN0aW9uKCl7cmV0dXJuIHIucGFyYW0odGhpcy5zZXJpYWxpemVBcnJheSgpKX0sc2VyaWFsaXplQXJyYXk6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24oKXt2YXIgYT1yLnByb3AodGhpcyxcImVsZW1lbnRzXCIpO3JldHVybiBhP3IubWFrZUFycmF5KGEpOnRoaXN9KS5maWx0ZXIoZnVuY3Rpb24oKXt2YXIgYT10aGlzLnR5cGU7cmV0dXJuIHRoaXMubmFtZSYmIXIodGhpcykuaXMoXCI6ZGlzYWJsZWRcIikmJnpiLnRlc3QodGhpcy5ub2RlTmFtZSkmJiF5Yi50ZXN0KGEpJiYodGhpcy5jaGVja2VkfHwhamEudGVzdChhKSl9KS5tYXAoZnVuY3Rpb24oYSxiKXt2YXIgYz1yKHRoaXMpLnZhbCgpO3JldHVybiBudWxsPT1jP251bGw6QXJyYXkuaXNBcnJheShjKT9yLm1hcChjLGZ1bmN0aW9uKGEpe3JldHVybntuYW1lOmIubmFtZSx2YWx1ZTphLnJlcGxhY2UoeGIsXCJcXHJcXG5cIil9fSk6e25hbWU6Yi5uYW1lLHZhbHVlOmMucmVwbGFjZSh4YixcIlxcclxcblwiKX19KS5nZXQoKX19KTt2YXIgQmI9LyUyMC9nLENiPS8jLiokLyxEYj0vKFs/Jl0pXz1bXiZdKi8sRWI9L14oLio/KTpbIFxcdF0qKFteXFxyXFxuXSopJC9nbSxGYj0vXig/OmFib3V0fGFwcHxhcHAtc3RvcmFnZXwuKy1leHRlbnNpb258ZmlsZXxyZXN8d2lkZ2V0KTokLyxHYj0vXig/OkdFVHxIRUFEKSQvLEhiPS9eXFwvXFwvLyxJYj17fSxKYj17fSxLYj1cIiovXCIuY29uY2F0KFwiKlwiKSxMYj1kLmNyZWF0ZUVsZW1lbnQoXCJhXCIpO0xiLmhyZWY9dGIuaHJlZjtmdW5jdGlvbiBNYihhKXtyZXR1cm4gZnVuY3Rpb24oYixjKXtcInN0cmluZ1wiIT10eXBlb2YgYiYmKGM9YixiPVwiKlwiKTt2YXIgZCxlPTAsZj1iLnRvTG93ZXJDYXNlKCkubWF0Y2goTCl8fFtdO2lmKHIuaXNGdW5jdGlvbihjKSl3aGlsZShkPWZbZSsrXSlcIitcIj09PWRbMF0/KGQ9ZC5zbGljZSgxKXx8XCIqXCIsKGFbZF09YVtkXXx8W10pLnVuc2hpZnQoYykpOihhW2RdPWFbZF18fFtdKS5wdXNoKGMpfX1mdW5jdGlvbiBOYihhLGIsYyxkKXt2YXIgZT17fSxmPWE9PT1KYjtmdW5jdGlvbiBnKGgpe3ZhciBpO3JldHVybiBlW2hdPSEwLHIuZWFjaChhW2hdfHxbXSxmdW5jdGlvbihhLGgpe3ZhciBqPWgoYixjLGQpO3JldHVyblwic3RyaW5nXCIhPXR5cGVvZiBqfHxmfHxlW2pdP2Y/IShpPWopOnZvaWQgMDooYi5kYXRhVHlwZXMudW5zaGlmdChqKSxnKGopLCExKX0pLGl9cmV0dXJuIGcoYi5kYXRhVHlwZXNbMF0pfHwhZVtcIipcIl0mJmcoXCIqXCIpfWZ1bmN0aW9uIE9iKGEsYil7dmFyIGMsZCxlPXIuYWpheFNldHRpbmdzLmZsYXRPcHRpb25zfHx7fTtmb3IoYyBpbiBiKXZvaWQgMCE9PWJbY10mJigoZVtjXT9hOmR8fChkPXt9KSlbY109YltjXSk7cmV0dXJuIGQmJnIuZXh0ZW5kKCEwLGEsZCksYX1mdW5jdGlvbiBQYihhLGIsYyl7dmFyIGQsZSxmLGcsaD1hLmNvbnRlbnRzLGk9YS5kYXRhVHlwZXM7d2hpbGUoXCIqXCI9PT1pWzBdKWkuc2hpZnQoKSx2b2lkIDA9PT1kJiYoZD1hLm1pbWVUeXBlfHxiLmdldFJlc3BvbnNlSGVhZGVyKFwiQ29udGVudC1UeXBlXCIpKTtpZihkKWZvcihlIGluIGgpaWYoaFtlXSYmaFtlXS50ZXN0KGQpKXtpLnVuc2hpZnQoZSk7YnJlYWt9aWYoaVswXWluIGMpZj1pWzBdO2Vsc2V7Zm9yKGUgaW4gYyl7aWYoIWlbMF18fGEuY29udmVydGVyc1tlK1wiIFwiK2lbMF1dKXtmPWU7YnJlYWt9Z3x8KGc9ZSl9Zj1mfHxnfWlmKGYpcmV0dXJuIGYhPT1pWzBdJiZpLnVuc2hpZnQoZiksY1tmXX1mdW5jdGlvbiBRYihhLGIsYyxkKXt2YXIgZSxmLGcsaCxpLGo9e30saz1hLmRhdGFUeXBlcy5zbGljZSgpO2lmKGtbMV0pZm9yKGcgaW4gYS5jb252ZXJ0ZXJzKWpbZy50b0xvd2VyQ2FzZSgpXT1hLmNvbnZlcnRlcnNbZ107Zj1rLnNoaWZ0KCk7d2hpbGUoZilpZihhLnJlc3BvbnNlRmllbGRzW2ZdJiYoY1thLnJlc3BvbnNlRmllbGRzW2ZdXT1iKSwhaSYmZCYmYS5kYXRhRmlsdGVyJiYoYj1hLmRhdGFGaWx0ZXIoYixhLmRhdGFUeXBlKSksaT1mLGY9ay5zaGlmdCgpKWlmKFwiKlwiPT09ZilmPWk7ZWxzZSBpZihcIipcIiE9PWkmJmkhPT1mKXtpZihnPWpbaStcIiBcIitmXXx8altcIiogXCIrZl0sIWcpZm9yKGUgaW4gailpZihoPWUuc3BsaXQoXCIgXCIpLGhbMV09PT1mJiYoZz1qW2krXCIgXCIraFswXV18fGpbXCIqIFwiK2hbMF1dKSl7Zz09PSEwP2c9altlXTpqW2VdIT09ITAmJihmPWhbMF0say51bnNoaWZ0KGhbMV0pKTticmVha31pZihnIT09ITApaWYoZyYmYVtcInRocm93c1wiXSliPWcoYik7ZWxzZSB0cnl7Yj1nKGIpfWNhdGNoKGwpe3JldHVybntzdGF0ZTpcInBhcnNlcmVycm9yXCIsZXJyb3I6Zz9sOlwiTm8gY29udmVyc2lvbiBmcm9tIFwiK2krXCIgdG8gXCIrZn19fXJldHVybntzdGF0ZTpcInN1Y2Nlc3NcIixkYXRhOmJ9fXIuZXh0ZW5kKHthY3RpdmU6MCxsYXN0TW9kaWZpZWQ6e30sZXRhZzp7fSxhamF4U2V0dGluZ3M6e3VybDp0Yi5ocmVmLHR5cGU6XCJHRVRcIixpc0xvY2FsOkZiLnRlc3QodGIucHJvdG9jb2wpLGdsb2JhbDohMCxwcm9jZXNzRGF0YTohMCxhc3luYzohMCxjb250ZW50VHlwZTpcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDsgY2hhcnNldD1VVEYtOFwiLGFjY2VwdHM6e1wiKlwiOktiLHRleHQ6XCJ0ZXh0L3BsYWluXCIsaHRtbDpcInRleHQvaHRtbFwiLHhtbDpcImFwcGxpY2F0aW9uL3htbCwgdGV4dC94bWxcIixqc29uOlwiYXBwbGljYXRpb24vanNvbiwgdGV4dC9qYXZhc2NyaXB0XCJ9LGNvbnRlbnRzOnt4bWw6L1xcYnhtbFxcYi8saHRtbDovXFxiaHRtbC8sanNvbjovXFxianNvblxcYi99LHJlc3BvbnNlRmllbGRzOnt4bWw6XCJyZXNwb25zZVhNTFwiLHRleHQ6XCJyZXNwb25zZVRleHRcIixqc29uOlwicmVzcG9uc2VKU09OXCJ9LGNvbnZlcnRlcnM6e1wiKiB0ZXh0XCI6U3RyaW5nLFwidGV4dCBodG1sXCI6ITAsXCJ0ZXh0IGpzb25cIjpKU09OLnBhcnNlLFwidGV4dCB4bWxcIjpyLnBhcnNlWE1MfSxmbGF0T3B0aW9uczp7dXJsOiEwLGNvbnRleHQ6ITB9fSxhamF4U2V0dXA6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gYj9PYihPYihhLHIuYWpheFNldHRpbmdzKSxiKTpPYihyLmFqYXhTZXR0aW5ncyxhKX0sYWpheFByZWZpbHRlcjpNYihJYiksYWpheFRyYW5zcG9ydDpNYihKYiksYWpheDpmdW5jdGlvbihiLGMpe1wib2JqZWN0XCI9PXR5cGVvZiBiJiYoYz1iLGI9dm9pZCAwKSxjPWN8fHt9O3ZhciBlLGYsZyxoLGksaixrLGwsbSxuLG89ci5hamF4U2V0dXAoe30sYykscD1vLmNvbnRleHR8fG8scT1vLmNvbnRleHQmJihwLm5vZGVUeXBlfHxwLmpxdWVyeSk/cihwKTpyLmV2ZW50LHM9ci5EZWZlcnJlZCgpLHQ9ci5DYWxsYmFja3MoXCJvbmNlIG1lbW9yeVwiKSx1PW8uc3RhdHVzQ29kZXx8e30sdj17fSx3PXt9LHg9XCJjYW5jZWxlZFwiLHk9e3JlYWR5U3RhdGU6MCxnZXRSZXNwb25zZUhlYWRlcjpmdW5jdGlvbihhKXt2YXIgYjtpZihrKXtpZighaCl7aD17fTt3aGlsZShiPUViLmV4ZWMoZykpaFtiWzFdLnRvTG93ZXJDYXNlKCldPWJbMl19Yj1oW2EudG9Mb3dlckNhc2UoKV19cmV0dXJuIG51bGw9PWI/bnVsbDpifSxnZXRBbGxSZXNwb25zZUhlYWRlcnM6ZnVuY3Rpb24oKXtyZXR1cm4gaz9nOm51bGx9LHNldFJlcXVlc3RIZWFkZXI6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gbnVsbD09ayYmKGE9d1thLnRvTG93ZXJDYXNlKCldPXdbYS50b0xvd2VyQ2FzZSgpXXx8YSx2W2FdPWIpLHRoaXN9LG92ZXJyaWRlTWltZVR5cGU6ZnVuY3Rpb24oYSl7cmV0dXJuIG51bGw9PWsmJihvLm1pbWVUeXBlPWEpLHRoaXN9LHN0YXR1c0NvZGU6ZnVuY3Rpb24oYSl7dmFyIGI7aWYoYSlpZihrKXkuYWx3YXlzKGFbeS5zdGF0dXNdKTtlbHNlIGZvcihiIGluIGEpdVtiXT1bdVtiXSxhW2JdXTtyZXR1cm4gdGhpc30sYWJvcnQ6ZnVuY3Rpb24oYSl7dmFyIGI9YXx8eDtyZXR1cm4gZSYmZS5hYm9ydChiKSxBKDAsYiksdGhpc319O2lmKHMucHJvbWlzZSh5KSxvLnVybD0oKGJ8fG8udXJsfHx0Yi5ocmVmKStcIlwiKS5yZXBsYWNlKEhiLHRiLnByb3RvY29sK1wiLy9cIiksby50eXBlPWMubWV0aG9kfHxjLnR5cGV8fG8ubWV0aG9kfHxvLnR5cGUsby5kYXRhVHlwZXM9KG8uZGF0YVR5cGV8fFwiKlwiKS50b0xvd2VyQ2FzZSgpLm1hdGNoKEwpfHxbXCJcIl0sbnVsbD09by5jcm9zc0RvbWFpbil7aj1kLmNyZWF0ZUVsZW1lbnQoXCJhXCIpO3RyeXtqLmhyZWY9by51cmwsai5ocmVmPWouaHJlZixvLmNyb3NzRG9tYWluPUxiLnByb3RvY29sK1wiLy9cIitMYi5ob3N0IT1qLnByb3RvY29sK1wiLy9cIitqLmhvc3R9Y2F0Y2goeil7by5jcm9zc0RvbWFpbj0hMH19aWYoby5kYXRhJiZvLnByb2Nlc3NEYXRhJiZcInN0cmluZ1wiIT10eXBlb2Ygby5kYXRhJiYoby5kYXRhPXIucGFyYW0oby5kYXRhLG8udHJhZGl0aW9uYWwpKSxOYihJYixvLGMseSksaylyZXR1cm4geTtsPXIuZXZlbnQmJm8uZ2xvYmFsLGwmJjA9PT1yLmFjdGl2ZSsrJiZyLmV2ZW50LnRyaWdnZXIoXCJhamF4U3RhcnRcIiksby50eXBlPW8udHlwZS50b1VwcGVyQ2FzZSgpLG8uaGFzQ29udGVudD0hR2IudGVzdChvLnR5cGUpLGY9by51cmwucmVwbGFjZShDYixcIlwiKSxvLmhhc0NvbnRlbnQ/by5kYXRhJiZvLnByb2Nlc3NEYXRhJiYwPT09KG8uY29udGVudFR5cGV8fFwiXCIpLmluZGV4T2YoXCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIikmJihvLmRhdGE9by5kYXRhLnJlcGxhY2UoQmIsXCIrXCIpKToobj1vLnVybC5zbGljZShmLmxlbmd0aCksby5kYXRhJiYoZis9KHZiLnRlc3QoZik/XCImXCI6XCI/XCIpK28uZGF0YSxkZWxldGUgby5kYXRhKSxvLmNhY2hlPT09ITEmJihmPWYucmVwbGFjZShEYixcIiQxXCIpLG49KHZiLnRlc3QoZik/XCImXCI6XCI/XCIpK1wiXz1cIit1YisrICtuKSxvLnVybD1mK24pLG8uaWZNb2RpZmllZCYmKHIubGFzdE1vZGlmaWVkW2ZdJiZ5LnNldFJlcXVlc3RIZWFkZXIoXCJJZi1Nb2RpZmllZC1TaW5jZVwiLHIubGFzdE1vZGlmaWVkW2ZdKSxyLmV0YWdbZl0mJnkuc2V0UmVxdWVzdEhlYWRlcihcIklmLU5vbmUtTWF0Y2hcIixyLmV0YWdbZl0pKSwoby5kYXRhJiZvLmhhc0NvbnRlbnQmJm8uY29udGVudFR5cGUhPT0hMXx8Yy5jb250ZW50VHlwZSkmJnkuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLG8uY29udGVudFR5cGUpLHkuc2V0UmVxdWVzdEhlYWRlcihcIkFjY2VwdFwiLG8uZGF0YVR5cGVzWzBdJiZvLmFjY2VwdHNbby5kYXRhVHlwZXNbMF1dP28uYWNjZXB0c1tvLmRhdGFUeXBlc1swXV0rKFwiKlwiIT09by5kYXRhVHlwZXNbMF0/XCIsIFwiK0tiK1wiOyBxPTAuMDFcIjpcIlwiKTpvLmFjY2VwdHNbXCIqXCJdKTtmb3IobSBpbiBvLmhlYWRlcnMpeS5zZXRSZXF1ZXN0SGVhZGVyKG0sby5oZWFkZXJzW21dKTtpZihvLmJlZm9yZVNlbmQmJihvLmJlZm9yZVNlbmQuY2FsbChwLHksbyk9PT0hMXx8aykpcmV0dXJuIHkuYWJvcnQoKTtpZih4PVwiYWJvcnRcIix0LmFkZChvLmNvbXBsZXRlKSx5LmRvbmUoby5zdWNjZXNzKSx5LmZhaWwoby5lcnJvciksZT1OYihKYixvLGMseSkpe2lmKHkucmVhZHlTdGF0ZT0xLGwmJnEudHJpZ2dlcihcImFqYXhTZW5kXCIsW3ksb10pLGspcmV0dXJuIHk7by5hc3luYyYmby50aW1lb3V0PjAmJihpPWEuc2V0VGltZW91dChmdW5jdGlvbigpe3kuYWJvcnQoXCJ0aW1lb3V0XCIpfSxvLnRpbWVvdXQpKTt0cnl7az0hMSxlLnNlbmQodixBKX1jYXRjaCh6KXtpZihrKXRocm93IHo7QSgtMSx6KX19ZWxzZSBBKC0xLFwiTm8gVHJhbnNwb3J0XCIpO2Z1bmN0aW9uIEEoYixjLGQsaCl7dmFyIGosbSxuLHYsdyx4PWM7a3x8KGs9ITAsaSYmYS5jbGVhclRpbWVvdXQoaSksZT12b2lkIDAsZz1ofHxcIlwiLHkucmVhZHlTdGF0ZT1iPjA/NDowLGo9Yj49MjAwJiZiPDMwMHx8MzA0PT09YixkJiYodj1QYihvLHksZCkpLHY9UWIobyx2LHksaiksaj8oby5pZk1vZGlmaWVkJiYodz15LmdldFJlc3BvbnNlSGVhZGVyKFwiTGFzdC1Nb2RpZmllZFwiKSx3JiYoci5sYXN0TW9kaWZpZWRbZl09dyksdz15LmdldFJlc3BvbnNlSGVhZGVyKFwiZXRhZ1wiKSx3JiYoci5ldGFnW2ZdPXcpKSwyMDQ9PT1ifHxcIkhFQURcIj09PW8udHlwZT94PVwibm9jb250ZW50XCI6MzA0PT09Yj94PVwibm90bW9kaWZpZWRcIjooeD12LnN0YXRlLG09di5kYXRhLG49di5lcnJvcixqPSFuKSk6KG49eCwhYiYmeHx8KHg9XCJlcnJvclwiLGI8MCYmKGI9MCkpKSx5LnN0YXR1cz1iLHkuc3RhdHVzVGV4dD0oY3x8eCkrXCJcIixqP3MucmVzb2x2ZVdpdGgocCxbbSx4LHldKTpzLnJlamVjdFdpdGgocCxbeSx4LG5dKSx5LnN0YXR1c0NvZGUodSksdT12b2lkIDAsbCYmcS50cmlnZ2VyKGo/XCJhamF4U3VjY2Vzc1wiOlwiYWpheEVycm9yXCIsW3ksbyxqP206bl0pLHQuZmlyZVdpdGgocCxbeSx4XSksbCYmKHEudHJpZ2dlcihcImFqYXhDb21wbGV0ZVwiLFt5LG9dKSwtLXIuYWN0aXZlfHxyLmV2ZW50LnRyaWdnZXIoXCJhamF4U3RvcFwiKSkpfXJldHVybiB5fSxnZXRKU09OOmZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gci5nZXQoYSxiLGMsXCJqc29uXCIpfSxnZXRTY3JpcHQ6ZnVuY3Rpb24oYSxiKXtyZXR1cm4gci5nZXQoYSx2b2lkIDAsYixcInNjcmlwdFwiKX19KSxyLmVhY2goW1wiZ2V0XCIsXCJwb3N0XCJdLGZ1bmN0aW9uKGEsYil7cltiXT1mdW5jdGlvbihhLGMsZCxlKXtyZXR1cm4gci5pc0Z1bmN0aW9uKGMpJiYoZT1lfHxkLGQ9YyxjPXZvaWQgMCksci5hamF4KHIuZXh0ZW5kKHt1cmw6YSx0eXBlOmIsZGF0YVR5cGU6ZSxkYXRhOmMsc3VjY2VzczpkfSxyLmlzUGxhaW5PYmplY3QoYSkmJmEpKX19KSxyLl9ldmFsVXJsPWZ1bmN0aW9uKGEpe3JldHVybiByLmFqYXgoe3VybDphLHR5cGU6XCJHRVRcIixkYXRhVHlwZTpcInNjcmlwdFwiLGNhY2hlOiEwLGFzeW5jOiExLGdsb2JhbDohMSxcInRocm93c1wiOiEwfSl9LHIuZm4uZXh0ZW5kKHt3cmFwQWxsOmZ1bmN0aW9uKGEpe3ZhciBiO3JldHVybiB0aGlzWzBdJiYoci5pc0Z1bmN0aW9uKGEpJiYoYT1hLmNhbGwodGhpc1swXSkpLGI9cihhLHRoaXNbMF0ub3duZXJEb2N1bWVudCkuZXEoMCkuY2xvbmUoITApLHRoaXNbMF0ucGFyZW50Tm9kZSYmYi5pbnNlcnRCZWZvcmUodGhpc1swXSksYi5tYXAoZnVuY3Rpb24oKXt2YXIgYT10aGlzO3doaWxlKGEuZmlyc3RFbGVtZW50Q2hpbGQpYT1hLmZpcnN0RWxlbWVudENoaWxkO3JldHVybiBhfSkuYXBwZW5kKHRoaXMpKSx0aGlzfSx3cmFwSW5uZXI6ZnVuY3Rpb24oYSl7cmV0dXJuIHIuaXNGdW5jdGlvbihhKT90aGlzLmVhY2goZnVuY3Rpb24oYil7cih0aGlzKS53cmFwSW5uZXIoYS5jYWxsKHRoaXMsYikpfSk6dGhpcy5lYWNoKGZ1bmN0aW9uKCl7dmFyIGI9cih0aGlzKSxjPWIuY29udGVudHMoKTtjLmxlbmd0aD9jLndyYXBBbGwoYSk6Yi5hcHBlbmQoYSl9KX0sd3JhcDpmdW5jdGlvbihhKXt2YXIgYj1yLmlzRnVuY3Rpb24oYSk7cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbihjKXtyKHRoaXMpLndyYXBBbGwoYj9hLmNhbGwodGhpcyxjKTphKX0pfSx1bndyYXA6ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMucGFyZW50KGEpLm5vdChcImJvZHlcIikuZWFjaChmdW5jdGlvbigpe3IodGhpcykucmVwbGFjZVdpdGgodGhpcy5jaGlsZE5vZGVzKX0pLHRoaXN9fSksci5leHByLnBzZXVkb3MuaGlkZGVuPWZ1bmN0aW9uKGEpe3JldHVybiFyLmV4cHIucHNldWRvcy52aXNpYmxlKGEpfSxyLmV4cHIucHNldWRvcy52aXNpYmxlPWZ1bmN0aW9uKGEpe3JldHVybiEhKGEub2Zmc2V0V2lkdGh8fGEub2Zmc2V0SGVpZ2h0fHxhLmdldENsaWVudFJlY3RzKCkubGVuZ3RoKX0sci5hamF4U2V0dGluZ3MueGhyPWZ1bmN0aW9uKCl7dHJ5e3JldHVybiBuZXcgYS5YTUxIdHRwUmVxdWVzdH1jYXRjaChiKXt9fTt2YXIgUmI9ezA6MjAwLDEyMjM6MjA0fSxTYj1yLmFqYXhTZXR0aW5ncy54aHIoKTtvLmNvcnM9ISFTYiYmXCJ3aXRoQ3JlZGVudGlhbHNcImluIFNiLG8uYWpheD1TYj0hIVNiLHIuYWpheFRyYW5zcG9ydChmdW5jdGlvbihiKXt2YXIgYyxkO2lmKG8uY29yc3x8U2ImJiFiLmNyb3NzRG9tYWluKXJldHVybntzZW5kOmZ1bmN0aW9uKGUsZil7dmFyIGcsaD1iLnhocigpO2lmKGgub3BlbihiLnR5cGUsYi51cmwsYi5hc3luYyxiLnVzZXJuYW1lLGIucGFzc3dvcmQpLGIueGhyRmllbGRzKWZvcihnIGluIGIueGhyRmllbGRzKWhbZ109Yi54aHJGaWVsZHNbZ107Yi5taW1lVHlwZSYmaC5vdmVycmlkZU1pbWVUeXBlJiZoLm92ZXJyaWRlTWltZVR5cGUoYi5taW1lVHlwZSksYi5jcm9zc0RvbWFpbnx8ZVtcIlgtUmVxdWVzdGVkLVdpdGhcIl18fChlW1wiWC1SZXF1ZXN0ZWQtV2l0aFwiXT1cIlhNTEh0dHBSZXF1ZXN0XCIpO2ZvcihnIGluIGUpaC5zZXRSZXF1ZXN0SGVhZGVyKGcsZVtnXSk7Yz1mdW5jdGlvbihhKXtyZXR1cm4gZnVuY3Rpb24oKXtjJiYoYz1kPWgub25sb2FkPWgub25lcnJvcj1oLm9uYWJvcnQ9aC5vbnJlYWR5c3RhdGVjaGFuZ2U9bnVsbCxcImFib3J0XCI9PT1hP2guYWJvcnQoKTpcImVycm9yXCI9PT1hP1wibnVtYmVyXCIhPXR5cGVvZiBoLnN0YXR1cz9mKDAsXCJlcnJvclwiKTpmKGguc3RhdHVzLGguc3RhdHVzVGV4dCk6ZihSYltoLnN0YXR1c118fGguc3RhdHVzLGguc3RhdHVzVGV4dCxcInRleHRcIiE9PShoLnJlc3BvbnNlVHlwZXx8XCJ0ZXh0XCIpfHxcInN0cmluZ1wiIT10eXBlb2YgaC5yZXNwb25zZVRleHQ/e2JpbmFyeTpoLnJlc3BvbnNlfTp7dGV4dDpoLnJlc3BvbnNlVGV4dH0saC5nZXRBbGxSZXNwb25zZUhlYWRlcnMoKSkpfX0saC5vbmxvYWQ9YygpLGQ9aC5vbmVycm9yPWMoXCJlcnJvclwiKSx2b2lkIDAhPT1oLm9uYWJvcnQ/aC5vbmFib3J0PWQ6aC5vbnJlYWR5c3RhdGVjaGFuZ2U9ZnVuY3Rpb24oKXs0PT09aC5yZWFkeVN0YXRlJiZhLnNldFRpbWVvdXQoZnVuY3Rpb24oKXtjJiZkKCl9KX0sYz1jKFwiYWJvcnRcIik7dHJ5e2guc2VuZChiLmhhc0NvbnRlbnQmJmIuZGF0YXx8bnVsbCl9Y2F0Y2goaSl7aWYoYyl0aHJvdyBpfX0sYWJvcnQ6ZnVuY3Rpb24oKXtjJiZjKCl9fX0pLHIuYWpheFByZWZpbHRlcihmdW5jdGlvbihhKXthLmNyb3NzRG9tYWluJiYoYS5jb250ZW50cy5zY3JpcHQ9ITEpfSksci5hamF4U2V0dXAoe2FjY2VwdHM6e3NjcmlwdDpcInRleHQvamF2YXNjcmlwdCwgYXBwbGljYXRpb24vamF2YXNjcmlwdCwgYXBwbGljYXRpb24vZWNtYXNjcmlwdCwgYXBwbGljYXRpb24veC1lY21hc2NyaXB0XCJ9LGNvbnRlbnRzOntzY3JpcHQ6L1xcYig/OmphdmF8ZWNtYSlzY3JpcHRcXGIvfSxjb252ZXJ0ZXJzOntcInRleHQgc2NyaXB0XCI6ZnVuY3Rpb24oYSl7cmV0dXJuIHIuZ2xvYmFsRXZhbChhKSxhfX19KSxyLmFqYXhQcmVmaWx0ZXIoXCJzY3JpcHRcIixmdW5jdGlvbihhKXt2b2lkIDA9PT1hLmNhY2hlJiYoYS5jYWNoZT0hMSksYS5jcm9zc0RvbWFpbiYmKGEudHlwZT1cIkdFVFwiKX0pLHIuYWpheFRyYW5zcG9ydChcInNjcmlwdFwiLGZ1bmN0aW9uKGEpe2lmKGEuY3Jvc3NEb21haW4pe3ZhciBiLGM7cmV0dXJue3NlbmQ6ZnVuY3Rpb24oZSxmKXtiPXIoXCI8c2NyaXB0PlwiKS5wcm9wKHtjaGFyc2V0OmEuc2NyaXB0Q2hhcnNldCxzcmM6YS51cmx9KS5vbihcImxvYWQgZXJyb3JcIixjPWZ1bmN0aW9uKGEpe2IucmVtb3ZlKCksYz1udWxsLGEmJmYoXCJlcnJvclwiPT09YS50eXBlPzQwNDoyMDAsYS50eXBlKX0pLGQuaGVhZC5hcHBlbmRDaGlsZChiWzBdKX0sYWJvcnQ6ZnVuY3Rpb24oKXtjJiZjKCl9fX19KTt2YXIgVGI9W10sVWI9Lyg9KVxcPyg/PSZ8JCl8XFw/XFw/LztyLmFqYXhTZXR1cCh7anNvbnA6XCJjYWxsYmFja1wiLGpzb25wQ2FsbGJhY2s6ZnVuY3Rpb24oKXt2YXIgYT1UYi5wb3AoKXx8ci5leHBhbmRvK1wiX1wiK3ViKys7cmV0dXJuIHRoaXNbYV09ITAsYX19KSxyLmFqYXhQcmVmaWx0ZXIoXCJqc29uIGpzb25wXCIsZnVuY3Rpb24oYixjLGQpe3ZhciBlLGYsZyxoPWIuanNvbnAhPT0hMSYmKFViLnRlc3QoYi51cmwpP1widXJsXCI6XCJzdHJpbmdcIj09dHlwZW9mIGIuZGF0YSYmMD09PShiLmNvbnRlbnRUeXBlfHxcIlwiKS5pbmRleE9mKFwiYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkXCIpJiZVYi50ZXN0KGIuZGF0YSkmJlwiZGF0YVwiKTtpZihofHxcImpzb25wXCI9PT1iLmRhdGFUeXBlc1swXSlyZXR1cm4gZT1iLmpzb25wQ2FsbGJhY2s9ci5pc0Z1bmN0aW9uKGIuanNvbnBDYWxsYmFjayk/Yi5qc29ucENhbGxiYWNrKCk6Yi5qc29ucENhbGxiYWNrLGg/YltoXT1iW2hdLnJlcGxhY2UoVWIsXCIkMVwiK2UpOmIuanNvbnAhPT0hMSYmKGIudXJsKz0odmIudGVzdChiLnVybCk/XCImXCI6XCI/XCIpK2IuanNvbnArXCI9XCIrZSksYi5jb252ZXJ0ZXJzW1wic2NyaXB0IGpzb25cIl09ZnVuY3Rpb24oKXtyZXR1cm4gZ3x8ci5lcnJvcihlK1wiIHdhcyBub3QgY2FsbGVkXCIpLGdbMF19LGIuZGF0YVR5cGVzWzBdPVwianNvblwiLGY9YVtlXSxhW2VdPWZ1bmN0aW9uKCl7Zz1hcmd1bWVudHN9LGQuYWx3YXlzKGZ1bmN0aW9uKCl7dm9pZCAwPT09Zj9yKGEpLnJlbW92ZVByb3AoZSk6YVtlXT1mLGJbZV0mJihiLmpzb25wQ2FsbGJhY2s9Yy5qc29ucENhbGxiYWNrLFRiLnB1c2goZSkpLGcmJnIuaXNGdW5jdGlvbihmKSYmZihnWzBdKSxnPWY9dm9pZCAwfSksXCJzY3JpcHRcIn0pLG8uY3JlYXRlSFRNTERvY3VtZW50PWZ1bmN0aW9uKCl7dmFyIGE9ZC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQoXCJcIikuYm9keTtyZXR1cm4gYS5pbm5lckhUTUw9XCI8Zm9ybT48L2Zvcm0+PGZvcm0+PC9mb3JtPlwiLDI9PT1hLmNoaWxkTm9kZXMubGVuZ3RofSgpLHIucGFyc2VIVE1MPWZ1bmN0aW9uKGEsYixjKXtpZihcInN0cmluZ1wiIT10eXBlb2YgYSlyZXR1cm5bXTtcImJvb2xlYW5cIj09dHlwZW9mIGImJihjPWIsYj0hMSk7dmFyIGUsZixnO3JldHVybiBifHwoby5jcmVhdGVIVE1MRG9jdW1lbnQ/KGI9ZC5pbXBsZW1lbnRhdGlvbi5jcmVhdGVIVE1MRG9jdW1lbnQoXCJcIiksZT1iLmNyZWF0ZUVsZW1lbnQoXCJiYXNlXCIpLGUuaHJlZj1kLmxvY2F0aW9uLmhyZWYsYi5oZWFkLmFwcGVuZENoaWxkKGUpKTpiPWQpLGY9Qy5leGVjKGEpLGc9IWMmJltdLGY/W2IuY3JlYXRlRWxlbWVudChmWzFdKV06KGY9cWEoW2FdLGIsZyksZyYmZy5sZW5ndGgmJnIoZykucmVtb3ZlKCksci5tZXJnZShbXSxmLmNoaWxkTm9kZXMpKX0sci5mbi5sb2FkPWZ1bmN0aW9uKGEsYixjKXt2YXIgZCxlLGYsZz10aGlzLGg9YS5pbmRleE9mKFwiIFwiKTtyZXR1cm4gaD4tMSYmKGQ9cGIoYS5zbGljZShoKSksYT1hLnNsaWNlKDAsaCkpLHIuaXNGdW5jdGlvbihiKT8oYz1iLGI9dm9pZCAwKTpiJiZcIm9iamVjdFwiPT10eXBlb2YgYiYmKGU9XCJQT1NUXCIpLGcubGVuZ3RoPjAmJnIuYWpheCh7dXJsOmEsdHlwZTplfHxcIkdFVFwiLGRhdGFUeXBlOlwiaHRtbFwiLGRhdGE6Yn0pLmRvbmUoZnVuY3Rpb24oYSl7Zj1hcmd1bWVudHMsZy5odG1sKGQ/cihcIjxkaXY+XCIpLmFwcGVuZChyLnBhcnNlSFRNTChhKSkuZmluZChkKTphKX0pLmFsd2F5cyhjJiZmdW5jdGlvbihhLGIpe2cuZWFjaChmdW5jdGlvbigpe2MuYXBwbHkodGhpcyxmfHxbYS5yZXNwb25zZVRleHQsYixhXSl9KX0pLHRoaXN9LHIuZWFjaChbXCJhamF4U3RhcnRcIixcImFqYXhTdG9wXCIsXCJhamF4Q29tcGxldGVcIixcImFqYXhFcnJvclwiLFwiYWpheFN1Y2Nlc3NcIixcImFqYXhTZW5kXCJdLGZ1bmN0aW9uKGEsYil7ci5mbltiXT1mdW5jdGlvbihhKXtyZXR1cm4gdGhpcy5vbihiLGEpfX0pLHIuZXhwci5wc2V1ZG9zLmFuaW1hdGVkPWZ1bmN0aW9uKGEpe3JldHVybiByLmdyZXAoci50aW1lcnMsZnVuY3Rpb24oYil7cmV0dXJuIGE9PT1iLmVsZW19KS5sZW5ndGh9LHIub2Zmc2V0PXtzZXRPZmZzZXQ6ZnVuY3Rpb24oYSxiLGMpe3ZhciBkLGUsZixnLGgsaSxqLGs9ci5jc3MoYSxcInBvc2l0aW9uXCIpLGw9cihhKSxtPXt9O1wic3RhdGljXCI9PT1rJiYoYS5zdHlsZS5wb3NpdGlvbj1cInJlbGF0aXZlXCIpLGg9bC5vZmZzZXQoKSxmPXIuY3NzKGEsXCJ0b3BcIiksaT1yLmNzcyhhLFwibGVmdFwiKSxqPShcImFic29sdXRlXCI9PT1rfHxcImZpeGVkXCI9PT1rKSYmKGYraSkuaW5kZXhPZihcImF1dG9cIik+LTEsaj8oZD1sLnBvc2l0aW9uKCksZz1kLnRvcCxlPWQubGVmdCk6KGc9cGFyc2VGbG9hdChmKXx8MCxlPXBhcnNlRmxvYXQoaSl8fDApLHIuaXNGdW5jdGlvbihiKSYmKGI9Yi5jYWxsKGEsYyxyLmV4dGVuZCh7fSxoKSkpLG51bGwhPWIudG9wJiYobS50b3A9Yi50b3AtaC50b3ArZyksbnVsbCE9Yi5sZWZ0JiYobS5sZWZ0PWIubGVmdC1oLmxlZnQrZSksXCJ1c2luZ1wiaW4gYj9iLnVzaW5nLmNhbGwoYSxtKTpsLmNzcyhtKX19LHIuZm4uZXh0ZW5kKHtvZmZzZXQ6ZnVuY3Rpb24oYSl7aWYoYXJndW1lbnRzLmxlbmd0aClyZXR1cm4gdm9pZCAwPT09YT90aGlzOnRoaXMuZWFjaChmdW5jdGlvbihiKXtyLm9mZnNldC5zZXRPZmZzZXQodGhpcyxhLGIpfSk7dmFyIGIsYyxkLGUsZj10aGlzWzBdO2lmKGYpcmV0dXJuIGYuZ2V0Q2xpZW50UmVjdHMoKS5sZW5ndGg/KGQ9Zi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxiPWYub3duZXJEb2N1bWVudCxjPWIuZG9jdW1lbnRFbGVtZW50LGU9Yi5kZWZhdWx0Vmlldyx7dG9wOmQudG9wK2UucGFnZVlPZmZzZXQtYy5jbGllbnRUb3AsbGVmdDpkLmxlZnQrZS5wYWdlWE9mZnNldC1jLmNsaWVudExlZnR9KTp7dG9wOjAsbGVmdDowfX0scG9zaXRpb246ZnVuY3Rpb24oKXtpZih0aGlzWzBdKXt2YXIgYSxiLGM9dGhpc1swXSxkPXt0b3A6MCxsZWZ0OjB9O3JldHVyblwiZml4ZWRcIj09PXIuY3NzKGMsXCJwb3NpdGlvblwiKT9iPWMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk6KGE9dGhpcy5vZmZzZXRQYXJlbnQoKSxiPXRoaXMub2Zmc2V0KCksQihhWzBdLFwiaHRtbFwiKXx8KGQ9YS5vZmZzZXQoKSksZD17dG9wOmQudG9wK3IuY3NzKGFbMF0sXCJib3JkZXJUb3BXaWR0aFwiLCEwKSxsZWZ0OmQubGVmdCtyLmNzcyhhWzBdLFwiYm9yZGVyTGVmdFdpZHRoXCIsITApfSkse3RvcDpiLnRvcC1kLnRvcC1yLmNzcyhjLFwibWFyZ2luVG9wXCIsITApLGxlZnQ6Yi5sZWZ0LWQubGVmdC1yLmNzcyhjLFwibWFyZ2luTGVmdFwiLCEwKX19fSxvZmZzZXRQYXJlbnQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5tYXAoZnVuY3Rpb24oKXt2YXIgYT10aGlzLm9mZnNldFBhcmVudDt3aGlsZShhJiZcInN0YXRpY1wiPT09ci5jc3MoYSxcInBvc2l0aW9uXCIpKWE9YS5vZmZzZXRQYXJlbnQ7cmV0dXJuIGF8fHJhfSl9fSksci5lYWNoKHtzY3JvbGxMZWZ0OlwicGFnZVhPZmZzZXRcIixzY3JvbGxUb3A6XCJwYWdlWU9mZnNldFwifSxmdW5jdGlvbihhLGIpe3ZhciBjPVwicGFnZVlPZmZzZXRcIj09PWI7ci5mblthXT1mdW5jdGlvbihkKXtyZXR1cm4gVCh0aGlzLGZ1bmN0aW9uKGEsZCxlKXt2YXIgZjtyZXR1cm4gci5pc1dpbmRvdyhhKT9mPWE6OT09PWEubm9kZVR5cGUmJihmPWEuZGVmYXVsdFZpZXcpLHZvaWQgMD09PWU/Zj9mW2JdOmFbZF06dm9pZChmP2Yuc2Nyb2xsVG8oYz9mLnBhZ2VYT2Zmc2V0OmUsYz9lOmYucGFnZVlPZmZzZXQpOmFbZF09ZSl9LGEsZCxhcmd1bWVudHMubGVuZ3RoKX19KSxyLmVhY2goW1widG9wXCIsXCJsZWZ0XCJdLGZ1bmN0aW9uKGEsYil7ci5jc3NIb29rc1tiXT1QYShvLnBpeGVsUG9zaXRpb24sZnVuY3Rpb24oYSxjKXtpZihjKXJldHVybiBjPU9hKGEsYiksTWEudGVzdChjKT9yKGEpLnBvc2l0aW9uKClbYl0rXCJweFwiOmN9KX0pLHIuZWFjaCh7SGVpZ2h0OlwiaGVpZ2h0XCIsV2lkdGg6XCJ3aWR0aFwifSxmdW5jdGlvbihhLGIpe3IuZWFjaCh7cGFkZGluZzpcImlubmVyXCIrYSxjb250ZW50OmIsXCJcIjpcIm91dGVyXCIrYX0sZnVuY3Rpb24oYyxkKXtyLmZuW2RdPWZ1bmN0aW9uKGUsZil7dmFyIGc9YXJndW1lbnRzLmxlbmd0aCYmKGN8fFwiYm9vbGVhblwiIT10eXBlb2YgZSksaD1jfHwoZT09PSEwfHxmPT09ITA/XCJtYXJnaW5cIjpcImJvcmRlclwiKTtyZXR1cm4gVCh0aGlzLGZ1bmN0aW9uKGIsYyxlKXt2YXIgZjtyZXR1cm4gci5pc1dpbmRvdyhiKT8wPT09ZC5pbmRleE9mKFwib3V0ZXJcIik/YltcImlubmVyXCIrYV06Yi5kb2N1bWVudC5kb2N1bWVudEVsZW1lbnRbXCJjbGllbnRcIithXTo5PT09Yi5ub2RlVHlwZT8oZj1iLmRvY3VtZW50RWxlbWVudCxNYXRoLm1heChiLmJvZHlbXCJzY3JvbGxcIithXSxmW1wic2Nyb2xsXCIrYV0sYi5ib2R5W1wib2Zmc2V0XCIrYV0sZltcIm9mZnNldFwiK2FdLGZbXCJjbGllbnRcIithXSkpOnZvaWQgMD09PWU/ci5jc3MoYixjLGgpOnIuc3R5bGUoYixjLGUsaCl9LGIsZz9lOnZvaWQgMCxnKX19KX0pLHIuZm4uZXh0ZW5kKHtiaW5kOmZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gdGhpcy5vbihhLG51bGwsYixjKX0sdW5iaW5kOmZ1bmN0aW9uKGEsYil7cmV0dXJuIHRoaXMub2ZmKGEsbnVsbCxiKX0sZGVsZWdhdGU6ZnVuY3Rpb24oYSxiLGMsZCl7cmV0dXJuIHRoaXMub24oYixhLGMsZCl9LHVuZGVsZWdhdGU6ZnVuY3Rpb24oYSxiLGMpe3JldHVybiAxPT09YXJndW1lbnRzLmxlbmd0aD90aGlzLm9mZihhLFwiKipcIik6dGhpcy5vZmYoYixhfHxcIioqXCIsYyl9fSksci5ob2xkUmVhZHk9ZnVuY3Rpb24oYSl7YT9yLnJlYWR5V2FpdCsrOnIucmVhZHkoITApfSxyLmlzQXJyYXk9QXJyYXkuaXNBcnJheSxyLnBhcnNlSlNPTj1KU09OLnBhcnNlLHIubm9kZU5hbWU9QixcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQmJmRlZmluZShcImpxdWVyeVwiLFtdLGZ1bmN0aW9uKCl7cmV0dXJuIHJ9KTt2YXIgVmI9YS5qUXVlcnksV2I9YS4kO3JldHVybiByLm5vQ29uZmxpY3Q9ZnVuY3Rpb24oYil7cmV0dXJuIGEuJD09PXImJihhLiQ9V2IpLGImJmEualF1ZXJ5PT09ciYmKGEualF1ZXJ5PVZiKSxyfSxifHwoYS5qUXVlcnk9YS4kPXIpLHJ9KTtcbiIsIi8vPWluY2x1ZGUgLi4vLi4vYm93ZXJfY29tcG9uZW50cy9zbW9vdGhzY3JvbGwtZm9yLXdlYnNpdGVzL1Ntb290aFNjcm9sbC5qc1xuLy89aW5jbHVkZSAuLi8uLi9ib3dlcl9jb21wb25lbnRzL2pxdWVyeS9kaXN0L2pxdWVyeS5taW4uanNcbi8vXG4vLz1pbmNsdWRlIGpzL2Rpc2FibGUtc2Nyb2xsLmpzXG4vLz1pbmNsdWRlIGpzL2hlYWRlci5qc1xuLy89aW5jbHVkZSBqcy9maXgtaGVpZ2h0LmpzXG4vLz1pbmNsdWRlIGpzL2Nhcm91c2VsLmpzXG4vLz1pbmNsdWRlIGpzL21vZGFsLmpzXG4vLz1pbmNsdWRlIGpzL3Njcm9sbC5qc1xuLy89aW5jbHVkZSBqcy9jb3Vyc2UtbGVzc29uLmpzXG4vLz1pbmNsdWRlIGpzL2hvbWUtc2xpZGVyLmpzXG4vLz1pbmNsdWRlIGpzL2xvYWRlci5qc1xuXG5TbW9vdGhTY3JvbGwoe1xuICBzdGVwU2l6ZTogNTBcbn0pOyIsIiEoZnVuY3Rpb24oJCkge1xuXG4gIHZhciBfc2Nyb2xsYmFycyA9IG51bGw7XG4gIHZhciBfYm9keSA9IG51bGw7XG4gIHZhciBib3JkZXJDb2xvciA9ICcjZmJmMWVmJztcblxuICBmdW5jdGlvbiBnZXRCb2R5KCkge1xuICAgIHJldHVybiBfYm9keSA/IF9ib2R5IDogKF9ib2R5ID0gJChkb2N1bWVudC5ib2R5KSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRTY3JvbGxiYXJzKCkge1xuICAgIGlmIChfc2Nyb2xsYmFycyAhPSBudWxsKSByZXR1cm4gX3Njcm9sbGJhcnM7XG5cbiAgICB2YXIgdGVtcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0RJVicpO1xuXG4gICAgdGVtcC5zdHlsZS52aXNpYmlsaXR5ID0gJ2hpZGRlbic7XG4gICAgdGVtcC5zdHlsZS5vdmVyZmxvd1kgPSAnc2Nyb2xsJztcbiAgICB0ZW1wLnN0eWxlLndpZHRoID0gJzUwcHgnO1xuICAgIHRlbXAuc3R5bGUuaGVpZ2h0ID0gJzUwcHgnO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0ZW1wKTtcbiAgICBfc2Nyb2xsYmFycyA9IHRlbXAub2Zmc2V0V2lkdGggLSB0ZW1wLmNsaWVudFdpZHRoO1xuICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGVtcCk7XG5cbiAgICByZXR1cm4gX3Njcm9sbGJhcnM7XG4gIH1cblxuICBmdW5jdGlvbiBpc1Njcm9sbGJhcnMoKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmJvZHkuc2Nyb2xsSGVpZ2h0ID4gJGJvZHkuaGVpZ2h0KCk7XG4gIH1cblxuICB3aW5kb3cuZml4Qm9keSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBvZmZzZXQgPSBnZXRTY3JvbGxiYXJzKCkgKyAncHgnO1xuXG4gICAgZ2V0Qm9keSgpLmNzcyh7XG4gICAgICBib3JkZXJSaWdodENvbG9yOiBib3JkZXJDb2xvcixcbiAgICAgIGJvcmRlclJpZ2h0U3R5bGU6ICdzb2xpZCcsXG4gICAgICBib3JkZXJSaWdodFdpZHRoOiBvZmZzZXQsXG4gICAgICBvdmVyZmxvdzogJ2hpZGRlbidcbiAgICB9KTtcblxuICAgIHZhciBldmVudCA9IG5ldyAkLkV2ZW50KCdmaXgnKTtcbiAgICBldmVudC5vZmZzZXQgPSBvZmZzZXQ7XG5cbiAgICBnZXRCb2R5KCkudHJpZ2dlcihldmVudCk7XG4gIH07XG5cbiAgd2luZG93LnVuZml4Qm9keSA9IGZ1bmN0aW9uKCkge1xuICAgIGdldEJvZHkoKS5jc3Moe1xuICAgICAgYm9yZGVyUmlnaHRTdHlsZTogJycsXG4gICAgICBib3JkZXJSaWdodENvbG9yOiAnJyxcbiAgICAgIGJvcmRlclJpZ2h0V2lkdGg6ICcnLFxuICAgICAgb3ZlcmZsb3c6ICcnXG4gICAgfSk7XG5cbiAgICBnZXRCb2R5KCkudHJpZ2dlcigndW5maXgnKTtcbiAgfTtcblxufSkod2luZG93LmpRdWVyeSk7IiwiIShmdW5jdGlvbigkKSB7XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgJGhlYWRlciA9ICQoJy5nbG9iYWxfX2hlYWRlcicpO1xuXG4gICAgdmFyIGlzRml4ZWQgPSAkaGVhZGVyLmNzcygncG9zaXRpb24nKSA9PSAnZml4ZWQnO1xuICAgIGlmICghaXNGaXhlZCkgcmV0dXJuO1xuXG4gICAgJChkb2N1bWVudC5ib2R5KVxuXG4gICAgICAub24oJ2ZpeCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgJGhlYWRlci5jc3Moe3BhZGRpbmdSaWdodDogZS5vZmZzZXR9KTtcbiAgICAgIH0pXG5cbiAgICAgIC5vbigndW5maXgnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJGhlYWRlci5jc3Moe3BhZGRpbmdSaWdodDogJyd9KTtcbiAgICAgIH0pO1xuICB9KTtcblxufSkod2luZG93LmpRdWVyeSk7IiwiIShmdW5jdGlvbigkKSB7XG5cbiAgZnVuY3Rpb24gcmVmcmVzaCgpIHtcbiAgICB2YXIgJG5vZGVzID0gJCgnW2RhdGEtZml4LWhlaWdodF0nKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgJG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgJG5vZGUgPSAkbm9kZXMuZXEoaSk7XG4gICAgICB2YXIgJHBhcmVudCA9ICRub2RlLnBhcmVudCgpO1xuICAgICAgXG4gICAgICB2YXIgd2lkdGggPSAkcGFyZW50LndpZHRoKCk7XG4gICAgICB2YXIgaGVpZ2h0ID0gJHBhcmVudC5oZWlnaHQoKTtcblxuICAgICAgJG5vZGUuY3NzKHtcbiAgICAgICAgd2lkdGg6IHdpZHRoICsgJ3B4JyxcbiAgICAgICAgaGVpZ2h0OiBoZWlnaHQgKyAncHgnXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAkKGRvY3VtZW50KS5vbignc3RhcnQnLCByZWZyZXNoKTtcbiAgJCh3aW5kb3cpLm9uKCdyZXNpemUnLCByZWZyZXNoKTtcbn0pKHdpbmRvdy5qUXVlcnkpOyIsIi8vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLy8g0JrQsNGA0YPRgdC10LvRjCDQuNC30L7QsdGA0LDQttC10L3QuNC5LlxuLy8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiEoZnVuY3Rpb24oJCkge1xuXHRpZiAoJCA9PSBudWxsKSByZXR1cm4gY29uc29sZS53YXJuKCdqUXVlcnkgaXMgcmVxdWlyZWQuJyk7XG5cblx0dmFyIGR1cmF0aW9uRGVmYXVsdCA9IDE1MDA7XG5cdHZhciBhdXRvcGxheSA9IDIwMDA7XG5cblx0ZnVuY3Rpb24gZ2V0RHVyYXRpb24oJGNhcm91c2VsKSB7XG5cdFx0dmFyIGR1cmF0aW9uID0gJGNhcm91c2VsLmF0dHIoJ2RhdGEtZHVyYXRpb24nKSAqIDE7XG5cdFx0XG5cdFx0cmV0dXJuIGR1cmF0aW9uICYmICFpc05hTihkdXJhdGlvbilcblx0XHRcdD8gZHVyYXRpb25cblx0XHRcdDogZHVyYXRpb25EZWZhdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gc2V0Q2xhc3MoJG5vZGUsIG5hbWUsIGR1cmF0aW9uKSB7XG5cdFx0dmFyIGRlZmVyID0gbmV3ICQuRGVmZXJyZWQoKTtcblx0XHQkbm9kZS5hZGRDbGFzcyhuYW1lKTtcblxuXHRcdHZhciBvbkZpbmlzaCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0JG5vZGUucmVtb3ZlQ2xhc3MobmFtZSk7XG5cdFx0XHRkZWZlci5yZXNvbHZlKCk7XG5cdFx0fTtcblxuXHRcdHNldFRpbWVvdXQob25GaW5pc2gsIGR1cmF0aW9uKTtcblx0XHRyZXR1cm4gZGVmZXIucHJvbWlzZSgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gd3JhcChpdGVtKSB7XG5cdFx0cmV0dXJuIGl0ZW0gPT0gbnVsbCA/IG51bGwgOiAoaXRlbSBpbnN0YW5jZW9mICQgPyBpdGVtIDogJChpdGVtKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRDYXJvdXNlbChpdGVtLCBhdHRyKSB7XG5cdFx0dmFyIGlkID0gd3JhcChpdGVtKS5hdHRyKGF0dHIpO1xuXHRcdHZhciBjYXJvdXNlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcblx0XHRpZiAoY2Fyb3VzZWwgPT0gbnVsbCkgcmV0dXJuIG51bGw7XG5cblx0XHR2YXIgJGNhcm91c2VsID0gJChjYXJvdXNlbCk7XG5cdFx0cmV0dXJuICRjYXJvdXNlbC5sZW5ndGggPyAkY2Fyb3VzZWwgOiBudWxsO1xuXHR9XG5cblx0dmFyIGNvdW50ID0gMDtcblxuXHRmdW5jdGlvbiBnZXRFbGVtZW50KGlkLCBhdHRyKSB7XG5cdFx0dmFyIHNlbGVjdG9yID0gJ1snICsgYXR0ciArICc9XCInICsgaWQgKyAnXCJdJztcblx0XHR2YXIgJGVsZW1lbnQgPSAkKHNlbGVjdG9yKTtcblx0XHRyZXR1cm4gJGVsZW1lbnQubGVuZ3RoID8gJGVsZW1lbnQgOiBudWxsO1xuXHR9XG5cblx0ZnVuY3Rpb24gdG9Jbm5lcigkY2Fyb3VzZWwsIGluZGV4LCBlZmZlY3QpIHtcblx0XHRpZiAodHlwZW9mKGluZGV4KSA9PT0gJ29iamVjdCcpIGluZGV4ID0gd3JhcChpbmRleCkuaW5kZXgoKTtcblxuXHRcdHZhciBwcm9taXNlID0gJC53aGVuKCk7XG5cblx0XHR2YXIgJHNsaWRlcyA9ICRjYXJvdXNlbC5jaGlsZHJlbigpO1xuXHRcdHZhciAkYWN0aXZlID0gJHNsaWRlcy5maWx0ZXIoJy5hY3RpdmUnKTtcblx0XHQkc2xpZGVzLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblxuXHRcdHZhciAkc2xpZGUgPSAkc2xpZGVzLmVxKGluZGV4KTtcblx0XHQkc2xpZGUuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXG5cdFx0JGNhcm91c2VsLnRyaWdnZXIoJ2NoYW5nZS5jYXJvdXNlbCcsIFskc2xpZGUuaW5kZXgoKV0pO1xuXG5cdFx0dmFyIGR1cmF0aW9uID0gZ2V0RHVyYXRpb24oJGNhcm91c2VsKTtcblxuXHRcdGlmIChlZmZlY3QpIHtcblx0XHRcdHZhciBwQSA9IHNldENsYXNzKCRjYXJvdXNlbCwgZWZmZWN0LCBkdXJhdGlvbik7XG5cdFx0XHR2YXIgcEIgPSBzZXRDbGFzcygkYWN0aXZlLCAnbGVhdmUnLCBkdXJhdGlvbik7XG5cdFx0XHR2YXIgcEMgPSBzZXRDbGFzcygkc2xpZGUsICdlbnRlcicsIGR1cmF0aW9uKTtcblxuXHRcdFx0cHJvbWlzZSA9ICQud2hlbihwQSwgcEIsIHBDKTtcblx0XHR9XG5cblx0XHRzZXRBdXRvcGxheSgkY2Fyb3VzZWwpO1xuXG5cdFx0dmFyIGlkID0gJGNhcm91c2VsLmF0dHIoJ2lkJyk7XG5cdFx0aWYgKGlkID09IG51bGwpIHJldHVybiBwcm9taXNlO1xuXG5cdFx0dmFyICRpbmRleCA9IGdldEVsZW1lbnQoaWQsICdkYXRhLWluZGV4Jyk7XG5cdFx0aWYgKCRpbmRleCkgJGluZGV4LnRleHQoaW5kZXggKyAxKTtcblxuXHRcdHZhciAkZG90cyA9IGdldEVsZW1lbnQoaWQsICdkYXRhLWRvdHMnKTtcblx0XHRpZiAoJGRvdHMgPT0gbnVsbCkgcmV0dXJuIHByb21pc2U7XG5cblx0XHQkZG90cyA9ICRkb3RzLmNoaWxkcmVuKCk7XG5cdFx0JGRvdHMucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdCRkb3RzLmVxKGluZGV4KS5hZGRDbGFzcygnYWN0aXZlJyk7XG5cblx0XHRyZXR1cm4gcHJvbWlzZTtcblx0fVxuXG5cdGZ1bmN0aW9uIHRvKCRjYXJvdXNlbCwgaW5kZXgsIHR5cGUpIHtcblx0XHR2YXIgYXJncyA9ICRjYXJvdXNlbC5kYXRhKCdjYXJvdXNlbEFyZ3MnKTtcblx0XHRcblx0XHRpZiAoYXJncyAhPSBudWxsKSB7XG5cdFx0XHQkY2Fyb3VzZWwuZGF0YSgnY2Fyb3VzZWxBcmdzJywgW2luZGV4LCB0eXBlXSk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIHByb21pc2UgPSB0b0lubmVyKCRjYXJvdXNlbCwgaW5kZXgsIHR5cGUpO1xuXHRcdCRjYXJvdXNlbC5kYXRhKCdjYXJvdXNlbEFyZ3MnLCAwKTtcblxuXHRcdHZhciBoYW5kbGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYXJncyA9ICRjYXJvdXNlbC5kYXRhKCdjYXJvdXNlbEFyZ3MnKTtcblx0XHRcdCRjYXJvdXNlbC5kYXRhKCdjYXJvdXNlbEFyZ3MnLCBudWxsKTtcblx0XHRcdFxuXHRcdFx0aWYgKCFhcmdzKSB7XG5cdFx0XHRcdCRjYXJvdXNlbC50cmlnZ2VyKCdjaGFuZ2VBZnRlci5jYXJvdXNlbCcpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHZhciBwcm9taXNlID0gdG9Jbm5lcigkY2Fyb3VzZWwsIGFyZ3NbMF0sIGFyZ3NbMV0pO1xuXHRcdFx0JGNhcm91c2VsLmRhdGEoJ2Nhcm91c2VsQXJncycsIDApO1xuXHRcdFx0cHJvbWlzZS50aGVuKGhhbmRsZXIpO1xuXHRcdH07XG5cblx0XHRwcm9taXNlLnRoZW4oaGFuZGxlcik7XG5cdH1cblxuXHRmdW5jdGlvbiB0b0xhc3QoJGNhcm91c2VsLCB0eXBlKSB7XG5cdFx0dmFyIGNvdW50ID0gJGNhcm91c2VsLmNoaWxkcmVuKCkubGVuZ3RoO1xuXHRcdHZhciBsYXN0ID0gY291bnQgLSAxO1xuXHRcdHJldHVybiB0bygkY2Fyb3VzZWwsIGxhc3QsIHR5cGUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2VlZCgkY2Fyb3VzZWwsIHR5cGUpIHtcblx0XHR2YXIgJHNsaWRlcyA9ICRjYXJvdXNlbC5jaGlsZHJlbigpO1xuXHRcdHZhciBpbmRleCA9ICRzbGlkZXMuZmlsdGVyKCcuYWN0aXZlJykuaW5kZXgoKTtcblx0XHR2YXIgY291bnQgPSAkc2xpZGVzLmxlbmd0aDtcblxuXHRcdHZhciB2YWx1ZSA9IHR5cGUgPT0gJ25leHQnID8gMSA6IC0xO1xuXHRcdHZhciBuZXh0ID0gaW5kZXggKyB2YWx1ZTtcblxuXHRcdGlmIChuZXh0IDwgMCkgbmV4dCA9IGNvdW50IC0gMTtcblx0XHRpZiAobmV4dCA+PSBjb3VudCkgbmV4dCA9IDA7XG5cblx0XHR0bygkY2Fyb3VzZWwsIG5leHQsIHR5cGUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2V0QXV0b3BsYXkoJGNhcm91c2VsKSB7XG5cdFx0dmFyIHRpbWUgPSAkY2Fyb3VzZWwuYXR0cignZGF0YS1hdXRvcGxheScpO1xuXHRcdGlmICh0aW1lID09IG51bGwpIHJldHVybjtcblxuXHRcdHZhciBwcmV2ID0gJGNhcm91c2VsLmRhdGEoJ2Nhcm91c2VsQXV0b3BsYXknKTtcblx0XHRpZiAocHJldikgY2xlYXJUaW1lb3V0KHByZXYpO1xuXG5cdFx0dmFyIGR1cmF0aW9uID0gZ2V0RHVyYXRpb24oJGNhcm91c2VsKTtcblxuXHRcdHRpbWUgKj0gMTtcblx0XHRpZiAoIXRpbWUgfHwgaXNOYU4odGltZSkpIHRpbWUgPSBhdXRvcGxheTtcblx0XHR0aW1lICs9IGR1cmF0aW9uO1xuXG5cdFx0dmFyIHRpY2sgPSBmdW5jdGlvbigpIHtcblx0XHRcdHNlZWQoJGNhcm91c2VsLCAnbmV4dCcpO1xuXHRcdH07XG5cblx0XHR2YXIgc3RhbXAgPSBzZXRUaW1lb3V0KHRpY2ssIHRpbWUpO1xuXHRcdCRjYXJvdXNlbC5kYXRhKCdjYXJvdXNlbEF1dG9wbGF5Jywgc3RhbXApO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25Eb3RzKGUpIHtcblx0XHR2YXIgJGRvdHMgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdbZGF0YS1kb3RzXScpO1xuXG5cdFx0dmFyICRjYXJvdXNlbCA9IGdldENhcm91c2VsKCRkb3RzLCAnZGF0YS1kb3RzJyk7XHRcdFxuXHRcdGlmICgkY2Fyb3VzZWwgPT0gbnVsbCkgcmV0dXJuO1xuXG5cdFx0dmFyIGVmZmVjdCA9ICRkb3RzLmF0dHIoJ2RhdGEtZWZmZWN0Jyk7XG5cblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dG8oJGNhcm91c2VsLCB0aGlzLCBlZmZlY3QpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25TZWVkKGUsIG5vZGUsIHR5cGUpIHtcblx0XHR2YXIgJGNhcm91c2VsID0gZ2V0Q2Fyb3VzZWwobm9kZSwgJ2RhdGEtJyArIHR5cGUpO1xuXHRcdGlmICgkY2Fyb3VzZWwgPT0gbnVsbCkgcmV0dXJuO1xuXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdHNlZWQoJGNhcm91c2VsLCB0eXBlKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uTmV4dChlKSB7XG5cdFx0cmV0dXJuIG9uU2VlZChlLCB0aGlzLCAnbmV4dCcpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25CYWNrKGUpIHtcblx0XHRyZXR1cm4gb25TZWVkKGUsIHRoaXMsICdiYWNrJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBvblJlYWR5KCkge1xuXHRcdHZhciAkYXV0b3BsYXlzID0gJCgnW2RhdGEtYXV0b3BsYXldJyk7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8ICRhdXRvcGxheXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciAkY2Fyb3VzZWwgPSAkYXV0b3BsYXlzLmVxKGkpO1xuXHRcdFx0c2V0QXV0b3BsYXkoJGNhcm91c2VsKTtcblx0XHR9XG5cdH1cblxuXHQkKGRvY3VtZW50KVxuXHRcdC5vbignY2xpY2snLCAnW2RhdGEtZG90c10gPiAqJywgb25Eb3RzKVxuXHRcdC5vbignY2xpY2snLCAnW2RhdGEtYmFja10nLCBvbkJhY2spXG5cdFx0Lm9uKCdjbGljaycsICdbZGF0YS1uZXh0XScsIG9uTmV4dClcblx0XHQub24oJ3N0YXJ0Jywgb25SZWFkeSk7XG5cblx0d2luZG93LmNhcm91c2VsVG8gPSBmdW5jdGlvbihlbGVtZW50LCBpbmRleCwgZWZmZWN0KSB7XG5cdFx0dmFyIG5vZGUgPSB3cmFwKGVsZW1lbnQpO1xuXHRcdHJldHVybiB0byhub2RlLCBpbmRleCwgZWZmZWN0KTtcblx0fTtcblxuXHR3aW5kb3cuY2Fyb3VzZWxJbmRleCA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcblx0XHR2YXIgaW5kZXggPSB3cmFwKGVsZW1lbnQpLmNoaWxkcmVuKCkuZmlsdGVyKCcuYWN0aXZlJykuaW5kZXgoKTtcblx0XHRyZXR1cm4gaW5kZXg7XG5cdH07XG5cblx0d2luZG93LmNhcm91c2VsVG9MYXN0ID0gZnVuY3Rpb24oZWxlbWVudCwgZWZmZWN0KSB7XG5cdFx0dmFyIG5vZGUgPSB3cmFwKGVsZW1lbnQpO1xuXHRcdHJldHVybiB0b0xhc3Qobm9kZSwgZWZmZWN0KTtcblx0fTtcblxuXHR3aW5kb3cuY2Fyb3VzZWxUb0ZpcnN0ID0gZnVuY3Rpb24oZWxlbWVudCwgZWZmZWN0KSB7XG5cdFx0dmFyIG5vZGUgPSB3cmFwKGVsZW1lbnQpO1xuXHRcdHJldHVybiB0byhub2RlLCAwLCBlZmZlY3QpO1xuXHR9O1xuXG5cdHdpbmRvdy5jYXJvdXNlbENvdW50ID0gZnVuY3Rpb24oZWxlbWVudCkge1xuXHRcdHZhciBub2RlID0gd3JhcChlbGVtZW50KTtcblx0XHRyZXR1cm4gbm9kZS5jaGlsZHJlbigpLmxlbmd0aDtcblx0fTtcblxufSkod2luZG93LmpRdWVyeSk7IiwiLy8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vLyDQnNC+0LTQsNC70YzQvdC+0LUg0L7QutC90L4uXG4vLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIShmdW5jdGlvbigkKSB7XG5cblx0dmFyIGR1cmF0aW9uID0gNTAwO1xuXG5cdHZhciBfc2Nyb2xsYmFycyA9IG51bGw7XG5cdHZhciAkX2JvZHkgPSBudWxsO1xuXG5cdGZ1bmN0aW9uIGdldFNjcm9sbGJhcnMoKSB7XG5cdFx0aWYgKF9zY3JvbGxiYXJzICE9IG51bGwpIHJldHVybiBfc2Nyb2xsYmFycztcblxuXHRcdHZhciB0ZW1wID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnRElWJyk7XG5cblx0XHR0ZW1wLnN0eWxlLnZpc2liaWxpdHkgPSAnaGlkZGVuJztcblx0XHR0ZW1wLnN0eWxlLm92ZXJmbG93WSA9ICdzY3JvbGwnO1xuXHRcdHRlbXAuc3R5bGUud2lkdGggPSAnNTBweCc7XG5cdFx0dGVtcC5zdHlsZS5oZWlnaHQgPSAnNTBweCc7XG5cblx0XHRkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRlbXApO1xuXHRcdF9zY3JvbGxiYXJzID0gdGVtcC5vZmZzZXRXaWR0aCAtIHRlbXAuY2xpZW50V2lkdGg7XG5cdFx0ZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0ZW1wKTtcblxuXHRcdHJldHVybiBfc2Nyb2xsYmFycztcblx0fVxuXG5cdGZ1bmN0aW9uIGlzU2Nyb2xsYmFycygpIHtcblx0XHRyZXR1cm4gZG9jdW1lbnQuYm9keS5zY3JvbGxIZWlnaHQgPiAkKGRvY3VtZW50LmJvZHkpLmhlaWdodCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gdW5maXgoKSB7XG5cdFx0dW5maXhCb2R5KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBmaXgoKSB7XG5cdFx0Zml4Qm9keSgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdCgkbW9kYWwpIHtcblx0XHRpZiAoIWlzU2Nyb2xsYmFycygpKSByZXR1cm47XG5cblx0XHR2YXIgb2Zmc2V0ID0gZ2V0U2Nyb2xsYmFycygpICsgJ3B4Jztcblx0XHRcblx0XHR2YXIgJGNsb3NlID0gJG1vZGFsLmZpbmQoJy5tb2RhbF9fY2xvc2UnKTtcblx0XHQkY2xvc2UuY3NzKCdyaWdodCcsIG9mZnNldCk7XG5cdFx0JG1vZGFsLmNzcygncGFkZGluZy1yaWdodCcsIG9mZnNldCk7XG5cdH1cblxuXHRmdW5jdGlvbiBzaG93KCRtb2RhbCwgY2IpIHtcblx0XHQkbW9kYWwuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdGZpeCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gaGlkZSgkbW9kYWwpIHtcblx0XHQkbW9kYWwucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXHRcdHNldFRpbWVvdXQodW5maXgsIGR1cmF0aW9uKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9wZW4oJG1vZGFsKSB7XG5cdFx0c2hvdygkbW9kYWwpO1xuXHRcdCRtb2RhbC50cmlnZ2VyKCdvcGVuLm1vZGFsJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBjbG9zZSgkbW9kYWwpIHtcblx0XHRoaWRlKCRtb2RhbCk7XG5cdFx0JG1vZGFsLnRyaWdnZXIoJ2Nsb3NlLm1vZGFsJyk7XG5cdH1cblxuXHQkLmZuLm1vZGFsID0gZnVuY3Rpb24oYWN0aW9uKSB7XG5cdFx0aWYgKGFjdGlvbiA9PSBudWxsKSBhY3Rpb24gPSAnb3Blbic7XG5cdFx0XG5cdFx0aWYgKGFjdGlvbiA9PSAnb3BlbicpIG9wZW4odGhpcyk7XG5cdFx0aWYgKGFjdGlvbiA9PSAnY2xvc2UnKSBjbG9zZSh0aGlzKTtcblxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdGZ1bmN0aW9uIG9uQnV0dG9uKGUpIHtcblx0XHR2YXIgJGl0ZW0gPSAkKHRoaXMpO1xuXHRcdHZhciBpZCA9ICRpdGVtLmF0dHIoJ2RhdGEtbW9kYWwnKTtcblxuXHRcdHZhciBtb2RhbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcblx0XHRpZiAobW9kYWwgPT0gbnVsbCkgcmV0dXJuO1xuXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0dmFyICRtb2RhbCA9ICQobW9kYWwpO1xuXHRcdCRtb2RhbC5tb2RhbCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25DbG9zZShlKSB7XG5cdFx0dmFyICRpdGVtID0gJChlLnRhcmdldCk7XG5cdFx0XG5cdFx0dmFyIGlzQnV0dG9uID0gJGl0ZW0uYXR0cignZGF0YS1jbG9zZScpICE9IG51bGw7XG5cdFx0dmFyIGlzU2VsZiA9ICRpdGVtLmF0dHIoJ2RhdGEtbW9kYWwtYm94JykgIT0gbnVsbDtcblx0XHR2YXIgaXNDbG9zZSA9IGlzU2VsZiB8fCBpc0J1dHRvbjtcblxuXHRcdGlmICghaXNDbG9zZSkgcmV0dXJuO1xuXG5cdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFxuXHRcdHZhciAkbW9kYWwgPSBpc1NlbGYgPyAkaXRlbSA6ICRpdGVtLmNsb3Nlc3QoJ1tkYXRhLW1vZGFsLWJveF0nKTtcblx0XHRjbG9zZSgkbW9kYWwpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25TdGFydCgpIHtcblx0XHR2YXIgJG1vZGFscyA9ICQoJ1tkYXRhLW1vZGFsLWJveF0nKTtcblx0XHRcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8ICRtb2RhbHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciAkbW9kYWwgPSAkbW9kYWxzLmVxKGkpO1xuXHRcdFx0aW5pdCgkbW9kYWwpO1xuXHRcdH1cblx0fVxuXG5cdCQoZG9jdW1lbnQpXG5cdFx0Lm9uKCdjbGljaycsICdbZGF0YS1tb2RhbC1ib3hdLCBbZGF0YS1tb2RhbC1ib3hdIFtkYXRhLWNsb3NlXScsIG9uQ2xvc2UpXG5cdFx0Lm9uKCdjbGljaycsICdbZGF0YS1tb2RhbF0nLCBvbkJ1dHRvbilcblx0XHQub24oJ3N0YXJ0Jywgb25TdGFydCk7XG5cdFxufSkod2luZG93LmpRdWVyeSk7XG4iLCIvLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8vINCf0YDQvtC60YDRg9GC0LrQsCDQstC90LjQty5cbi8vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4hKGZ1bmN0aW9uKCQpIHtcblx0dmFyIF90aW1pbmcgPSAnZWFzZUluT3V0Q3ViaWMnO1xuXHR2YXIgX2R1cmF0aW9uID0gNzUwO1xuXG5cdHZhciAkX2RvY3VtZW50ID0gbnVsbDtcblx0dmFyICRfcGFnZSA9IG51bGw7XG5cdHZhciAkX3Njcm9sbGVyID0gbnVsbDtcblx0dmFyICRfZW50ZXJzID0gbnVsbDtcblx0dmFyICRfcGFyYWxheGVzID0gbnVsbDtcblxuXHR2YXIgX3ZpZXdIZWlnaHQgPSBudWxsO1xuXHR2YXIgX3Njcm9sbGVyQm90dG9tID0gbnVsbDtcblx0dmFyIF9zY3JvbGxlclRvcCA9IG51bGw7XG5cblx0dmFyIF9pc0VudGVyc0luaXRlZCA9IGZhbHNlO1xuXHR2YXIgX2lzRm9yY2UgPSBmYWxzZTtcblxuXHRmdW5jdGlvbiBnZXREb2N1bWVudCgpIHtcblx0XHRyZXR1cm4gJF9kb2N1bWVudCA/ICRfZG9jdW1lbnQgOiAoJF9kb2N1bWVudCA9ICQoZG9jdW1lbnQpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldFBhZ2UoKSB7XG5cdFx0cmV0dXJuICRfcGFnZSA/ICRfcGFnZSA6ICgkX3BhZ2UgPSAkKCdodG1sLCBib2R5JykpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0U2Nyb2xsZXIoKSB7XG5cdFx0cmV0dXJuICRfc2Nyb2xsZXIgPyAkX3Njcm9sbGVyIDogKCRfc2Nyb2xsZXIgPSAkKCdbZGF0YS1zY3JvbGxdJykpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0RWxlbWVudChhdHRyKSB7XG5cdFx0dmFyICRlbGVtZW50ID0gJCgnWycgKyBhdHRyICsgJ10nKTtcblx0XHRyZXR1cm4gJGVsZW1lbnQubGVuZ3RoID8gJGVsZW1lbnQgOiBudWxsO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0RW50ZXJzKCkge1xuXHRcdHJldHVybiAkX2VudGVycyA/ICRfZW50ZXJzIDogKCRfZW50ZXJzID0gJCgnLm5vdC12aWV3ZWQnKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRQYXJhbGF4ZXMoKSB7XG5cdFx0cmV0dXJuICRfcGFyYWxheGVzID8gJF9wYXJhbGF4ZXMgOiAoJF9wYXJhbGF4ZXMgPSAkKCdbZGF0YS1wYXJhbGF4XScpKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHdyYXAobm9kZSkge1xuXHRcdHJldHVybiBub2RlIGluc3RhbmNlb2YgJCA/IG5vZGUgOiAkKG5vZGUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0U2Nyb2xsVG9wKCkge1xuXHRcdHJldHVybiBnZXREb2N1bWVudCgpLnNjcm9sbFRvcCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0Vmlld0hlaWdodCgpIHtcblx0XHRyZXR1cm4gX3ZpZXdIZWlnaHQgPyBfdmlld0hlaWdodCA6IChcblx0XHRcdF92aWV3SGVpZ2h0ID0gTWF0aC5tYXgoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodCB8fCAwLCB3aW5kb3cuaW5uZXJIZWlnaHQgfHwgMClcblx0XHQpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0U2Nyb2xsZXJSYW5nZSgpIHtcblx0XHR2YXIgJHRvcCwgJGJvdHRvbTtcblxuXHRcdF9zY3JvbGxlckJvdHRvbSA9ICgkYm90dG9tID0gZ2V0RWxlbWVudCgnZGF0YS1zY3JvbGwtZmluaXNoJykpXG5cdFx0XHQ/IGdldEVsZW1lbnRUb3AoJGJvdHRvbSlcblx0XHRcdDogZ2V0RG9jdW1lbnQoKS5oZWlnaHQoKTtcblxuXHRcdF9zY3JvbGxlclRvcCA9ICgkdG9wID0gZ2V0RWxlbWVudCgnZGF0YS1zY3JvbGwtc3RhcnQnKSlcblx0XHRcdD8gZ2V0RWxlbWVudEJvdHRvbSgkdG9wKVxuXHRcdFx0OiBnZXRWaWV3SGVpZ2h0KCkgLyAyO1xuXG5cdFx0cmV0dXJuIFtfc2Nyb2xsZXJUb3AsIF9zY3JvbGxlckJvdHRvbV07XG5cdH1cblx0XG5cdGZ1bmN0aW9uIHNjcm9sbFBhZ2VTdGFydCgpIHtcblx0XHRfaXNGb3JjZSA9IHRydWU7XG5cdH1cblxuXHRmdW5jdGlvbiBzY3JvbGxQYWdlRW5kKCkge1xuXHRcdF9pc0ZvcmNlID0gZmFsc2U7XG5cdH1cblxuXHRmdW5jdGlvbiBzY3JvbGxQYWdlKHZhbHVlLCBkdXJhdGlvbikge1xuXHRcdGR1cmF0aW9uID0gZHVyYXRpb24gfHwgX2R1cmF0aW9uO1xuXHRcdHZhciBwYXJhbXMgPSB7c2Nyb2xsVG9wOiB2YWx1ZX07XG5cdFx0c2Nyb2xsUGFnZVN0YXJ0KCk7XG5cdFx0Z2V0UGFnZSgpLmFuaW1hdGUocGFyYW1zLCBkdXJhdGlvbiwgX3RpbWluZywgc2Nyb2xsUGFnZUVuZCk7XG5cdH1cblx0XG5cdGZ1bmN0aW9uIGdldEVsZW1lbnRCb3R0b20obm9kZSkge1xuXHRcdHZhciAkbm9kZSA9IHdyYXAobm9kZSk7XG5cdFx0dmFyIHRvcCA9ICRub2RlLm9mZnNldCgpLnRvcDtcblx0XHR2YXIgaGVpZ2h0ID0gJG5vZGUub3V0ZXJIZWlnaHQoKTtcblx0XHRyZXR1cm4gdG9wICsgaGVpZ2h0O1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0RWxlbWVudFRvcChub2RlKSB7XG5cdFx0dmFyICRub2RlID0gd3JhcChub2RlKTtcblx0XHR2YXIgdG9wID0gJG5vZGUub2Zmc2V0KCkudG9wO1xuXHRcdHJldHVybiB0b3A7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRPZmZzZXQob2Zmc2V0KSB7XG5cdFx0dmFyIHZhbHVlID0gb2Zmc2V0ICogMTtcblx0XHRpZiAoaXNOYU4odmFsdWUpKSB2YWx1ZSA9IDA7XG5cblx0XHRyZXR1cm4gdmFsdWU7XG5cdH1cblxuXHRmdW5jdGlvbiBjbGVhckNhY2hlKCkge1xuXHRcdF92aWV3SGVpZ2h0ID0gbnVsbDtcblx0XHRfc2Nyb2xsZXJCb3R0b20gPSBudWxsO1xuXHRcdF9zY3JvbGxlclRvcCA9IG51bGw7XG5cblx0XHQkX3Njcm9sbGVyID0gbnVsbDtcblx0XHQkX2VudGVycyA9IG51bGw7XG5cdH1cblxuXHRmdW5jdGlvbiBzaG93U2Nyb2xsZXIoKSB7XG5cdFx0Z2V0U2Nyb2xsZXIoKS5hZGRDbGFzcygnYWN0aXZlJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBoaWRlU2Nyb2xsZXIoKSB7XG5cdFx0Z2V0U2Nyb2xsZXIoKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdH1cblxuXHRmdW5jdGlvbiBmaXhTY3JvbGxlcih0b3ApIHtcblx0XHR2YXIgJHNjcm9sbGVyID0gZ2V0U2Nyb2xsZXIoKTtcblx0XHRpZiAoJHNjcm9sbGVyLmhhc0NsYXNzKCdmaXhlZCcpKSByZXR1cm47XG5cblx0XHR2YXIgcGFkZGluZyA9ICRzY3JvbGxlci5hdHRyKCdkYXRhLXNjcm9sbCcpICogMTtcblx0XHRpZiAoaXNOYU4ocGFkZGluZykpIHBhZGRpbmcgPSAwO1xuXG5cdFx0dmFyIG9mZnNldCA9IHRvcCAtIHBhZGRpbmcgLSAkc2Nyb2xsZXIub3V0ZXJIZWlnaHQoKTtcblxuXHRcdCRzY3JvbGxlci5jc3MoJ3RvcCcsIG9mZnNldCArICdweCcpO1xuXHRcdCRzY3JvbGxlci5hZGRDbGFzcygnZml4ZWQnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHVuZml4U2Nyb2xsZXIodG9wKSB7XG5cdFx0Z2V0U2Nyb2xsZXIoKS5yZW1vdmVDbGFzcygnZml4ZWQnKS5jc3MoJ3RvcCcsICcnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlZnJlc2hTY3JvbGxlcigpIHtcblx0XHRpZiAoX2lzRm9yY2UpIHJldHVybjtcblxuXHRcdHZhciB0b3AgPSBnZXRTY3JvbGxUb3AoKTtcblx0XHR2YXIgYm90dG9tID0gdG9wICsgZ2V0Vmlld0hlaWdodCgpO1xuXHRcdHZhciByYW5nZSA9IGdldFNjcm9sbGVyUmFuZ2UoKTtcblxuXHRcdHZhciBmdW5jID0gbnVsbDtcblxuXHRcdGZ1bmMgPSByYW5nZVswXSA8IHRvcCA/IHNob3dTY3JvbGxlciA6IGhpZGVTY3JvbGxlcjtcblx0XHRmdW5jKCk7XG5cblx0XHRmdW5jID0gcmFuZ2VbMV0gPD0gYm90dG9tID8gZml4U2Nyb2xsZXIgOiB1bmZpeFNjcm9sbGVyO1xuXHRcdGZ1bmMocmFuZ2VbMV0pO1xuXHR9XG5cblx0ZnVuY3Rpb24gaXNFbnRlcigkZW50ZXIsIHZpZXdUb3AsIHZpZXdCb3R0b20pIHtcblx0XHR2aWV3VG9wID0gdmlld1RvcCB8fCBnZXRTY3JvbGxUb3AoKTtcblx0XHR2aWV3Qm90dG9tID0gdmlld0JvdHRvbSB8fCAodmlld1RvcCArIGdldFZpZXdIZWlnaHQoKSk7XG5cblx0XHR2YXIgZWxlbWVudEJvdHRvbSA9IGdldEVsZW1lbnRCb3R0b20oJGVudGVyKTtcblx0XHR2YXIgZWxlbWVudFRvcCA9IGdldEVsZW1lbnRUb3AoJGVudGVyKTtcblxuXHRcdHZhciBvZmZzZXQgPSBnZXRPZmZzZXQoJGVudGVyLmF0dHIoJ2RhdGEtc2Nyb2xsLWVudGVyJykpO1xuXHRcdHZpZXdUb3AgKz0gb2Zmc2V0O1xuXHRcdHZpZXdCb3R0b20gLT0gb2Zmc2V0O1xuXG5cdFx0dmFyIGlzVmlzaWJsZSA9XG5cdFx0XHRlbGVtZW50Qm90dG9tIDw9IHZpZXdCb3R0b20gJiYgZWxlbWVudEJvdHRvbSA+PSB2aWV3VG9wIHx8XG5cdFx0XHRlbGVtZW50VG9wID49IHZpZXdUb3AgJiYgZWxlbWVudFRvcCA8PSB2aWV3Qm90dG9tO1xuXG5cdFx0cmV0dXJuIGlzVmlzaWJsZTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldEVudGVyKCRlbnRlcikge1xuXHRcdCRlbnRlci5yZW1vdmVDbGFzcygnbm90LXZpZXdlZCcpO1xuXHRcdCRlbnRlci5hZGRDbGFzcygndmlld2VkJyk7XG5cblx0XHR2YXIgZHVyYXRpb24gPSAkZW50ZXIuYXR0cignZGF0YS12aWV3aW5nJyk7XG5cdFx0aWYgKCFkdXJhdGlvbikgcmV0dXJuO1xuXG5cdFx0JGVudGVyLmFkZENsYXNzKCd2aWV3aW5nJyk7XG5cdFx0XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdCRlbnRlci5yZW1vdmVDbGFzcygndmlld2luZycpO1xuXHRcdH0sIGR1cmF0aW9uICogMSk7XG5cdH1cblxuXHRmdW5jdGlvbiByZWZyZXNoRW50ZXIoJGVudGVyLCB2aWV3VG9wLCB2aWV3Qm90dG9tKSB7XG5cdFx0dmFyIGlzRXhpdCA9ICEkZW50ZXIuaGFzQ2xhc3MoJ25vdC12aWV3ZWQnKSB8fCAhaXNFbnRlcigkZW50ZXIsIHZpZXdUb3AsIHZpZXdCb3R0b20pO1xuXHRcdGlmIChpc0V4aXQpIHJldHVybjtcblxuXHRcdHNldEVudGVyKCRlbnRlcik7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0RW50ZXIoJGVudGVyLCB2aWV3VG9wLCB2aWV3Qm90dG9tKSB7XG5cdFx0aWYgKCEkZW50ZXIuaGFzQ2xhc3MoJ25vdC12aWV3ZWQnKSkgcmV0dXJuO1xuXG5cdFx0dmFyIGVsZW1lbnRCb3R0b20gPSBnZXRFbGVtZW50Qm90dG9tKCRlbnRlcik7XG5cblx0XHR2YXIgaXNTaG93ID0gZWxlbWVudEJvdHRvbSA8IHZpZXdUb3AgfHwgaXNFbnRlcigkZW50ZXIsIHZpZXdUb3AsIHZpZXdCb3R0b20pO1xuXHRcdGlmICghaXNTaG93KSByZXR1cm47XG5cblx0XHRzZXRFbnRlcigkZW50ZXIpO1xuXHR9XG5cblx0ZnVuY3Rpb24gcmVmcmVzaEVudGVycygpIHtcblx0XHRpZiAoIV9pc0VudGVyc0luaXRlZCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciB0b3AgPSBnZXRTY3JvbGxUb3AoKTtcblx0XHR2YXIgYm90dG9tID0gdG9wICsgZ2V0Vmlld0hlaWdodCgpO1xuXG5cdFx0dmFyICRlbnRlcnMgPSBnZXRFbnRlcnMoKTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgJGVudGVycy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyICRlbnRlciA9ICRlbnRlcnMuZXEoaSk7XG5cdFx0XHRyZWZyZXNoRW50ZXIoJGVudGVyLCB0b3AsIGJvdHRvbSk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdEVudGVycygpIHtcblx0XHR2YXIgdG9wID0gZ2V0U2Nyb2xsVG9wKCk7XG5cdFx0dmFyIGJvdHRvbSA9IHRvcCArIGdldFZpZXdIZWlnaHQoKTtcblxuXHRcdHZhciAkZW50ZXJzID0gZ2V0RW50ZXJzKCk7XG5cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8ICRlbnRlcnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdHZhciAkZW50ZXIgPSAkZW50ZXJzLmVxKGkpO1xuXHRcdFx0aW5pdEVudGVyKCRlbnRlciwgdG9wLCBib3R0b20pO1xuXHRcdH1cblxuXHRcdF9pc0VudGVyc0luaXRlZCA9IHRydWU7XG5cdH1cblxuXHRmdW5jdGlvbiBwYXJzZU9mZnNldCh2YWx1ZSkge1xuXHRcdHZhciB0ZXh0ID0gdmFsdWUgKyAnJztcblxuXHRcdGlmICh0ZXh0LmNoYXJBdCh0ZXh0Lmxlbmd0aCAtIDEpID09ICclJykge1xuXHRcdFx0dmFyIHBlcmNlbnQgPSB0ZXh0LnN1YnN0cigwLCB0ZXh0Lmxlbmd0aCAtIDEpICogMTtcblxuXHRcdFx0aWYgKGlzTmFOKHBlcmNlbnQpKSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgaGVpZ2h0ID0gZ2V0Vmlld0hlaWdodCgpO1xuXHRcdFx0cmV0dXJuIE1hdGgucm91bmQocGVyY2VudCAqIDEwMCAvIGhlaWdodCk7XG5cdFx0fVxuXG5cdFx0dmFsdWUgKj0gMTtcblx0XHRyZXR1cm4gaXNOYU4odmFsdWUpID8gMCA6IHZhbHVlO1xuXHR9IFxuXG5cdGZ1bmN0aW9uIGdldFBhcmFsYXhPZmZzZXQoJHBhcmFsYXgpIHtcblx0XHR2YXIgYm90dG9tID0gJHBhcmFsYXguYXR0cignZGF0YS1wYXJhbGF4LWJvdHRvbScpO1xuXHRcdHZhciBib3RoID0gJHBhcmFsYXguYXR0cignZGF0YS1wYXJhbGF4LW9mZnNldCcpO1xuXHRcdHZhciB0b3AgPSAkcGFyYWxheC5hdHRyKCdkYXRhLXBhcmFsYXgtdG9wJyk7XG5cblx0XHRib3R0b20gPSBib3R0b20gIT0gbnVsbCA/IGJvdHRvbSA6IChib3RoICE9IG51bGwgPyBib3RoIDogMCk7XG5cdFx0dG9wID0gdG9wICE9IG51bGwgPyB0b3AgOiAoYm90aCAhPSBudWxsID8gYm90aCA6IDApO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdHRvcDogcGFyc2VPZmZzZXQodG9wKSxcblx0XHRcdGJvdHRvbTogcGFyc2VPZmZzZXQoYm90dG9tKVxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRQYXJhbGF4UmFuZ2VzKCRwYXJhbGF4KSB7XG5cdFx0dmFyIG1pbiA9ICRwYXJhbGF4LmF0dHIoJ2RhdGEtcGFyYWxheC1taW4nKTtcblx0XHR2YXIgbWF4ID0gJHBhcmFsYXguYXR0cignZGF0YS1wYXJhbGF4LW1heCcpO1xuXG5cdFx0bWluID0gbWluICE9IG51bGwgPyBtaW4gOiAwO1xuXHRcdG1heCA9IG1heCAhPSBudWxsID8gbWF4IDogMTAwO1xuXG5cdFx0cmV0dXJuIHtcblx0XHRcdG1pbjogbWluLFxuXHRcdFx0bWF4OiBtYXhcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0UGFyYWxheFBlcmNlbnQoJHBhcmFsYXgsIHZpZXdUb3AsIHZpZXdCb3R0b20pIHtcblx0XHR2YXIgZWxlbWVudFRvcCA9IGdldEVsZW1lbnRUb3AoJHBhcmFsYXgpO1xuXHRcdHZhciBlbGVtZW50Qm90dG9tID0gZ2V0RWxlbWVudEJvdHRvbSgkcGFyYWxheCk7XG5cblx0XHR2YXIgb2Zmc2V0ID0gZ2V0UGFyYWxheE9mZnNldCgkcGFyYWxheCk7XG5cdFx0dmlld1RvcCArPSBvZmZzZXQudG9wO1xuXHRcdHZpZXdCb3R0b20gKz0gb2Zmc2V0LmJvdHRvbTtcblx0XHR2YXIgdmlld0hlaWdodCA9IHZpZXdCb3R0b20gLSB2aWV3VG9wO1xuXG5cdFx0dmFyIG1heFRvcCA9IGVsZW1lbnRCb3R0b207XG5cdFx0dmFyIG1pblRvcCA9IGVsZW1lbnRUb3AgLSB2aWV3SGVpZ2h0O1xuXHRcdFxuXHRcdGlmIChtaW5Ub3AgPCAwKSB7XG5cdFx0XHR2YXIgc2hpZnQgPSBNYXRoLmFicyhtaW5Ub3ApO1xuXHRcdFx0bWF4VG9wICs9IHNoaWZ0O1xuXHRcdFx0dmlld1RvcCArPSBzaGlmdDtcblx0XHRcdHZpZXdCb3R0b20gKz0gc2hpZnQ7XG5cdFx0XHRtaW5Ub3AgPSAwO1xuXHRcdH1cblxuXHRcdHZhciBtYXhTaXplID0gbWF4VG9wIC0gbWluVG9wO1xuXHRcdHZhciBzaXplID0gbWF4VG9wIC0gdmlld1RvcDtcblxuXHRcdHZhciBwZXJjZW50ID0gc2l6ZSAvIG1heFNpemU7XG5cblx0XHRpZiAocGVyY2VudCA8IDApIHtcblx0XHRcdHBlcmNlbnQgPSAwO1xuXHRcdH1cblxuXHRcdGlmIChwZXJjZW50ID4gMSkge1xuXHRcdFx0cGVyY2VudCA9IDE7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDEgLSBwZXJjZW50OyBcblx0fVxuXG5cdGZ1bmN0aW9uIHJlZnJlc2hQYXJhbGF4KCRwYXJhbGF4LCB2aWV3VG9wLCB2aWV3Qm90dG9tKSB7XG5cdFx0dmFyIHBlcmNlbnQgPSBnZXRQYXJhbGF4UGVyY2VudCgkcGFyYWxheCwgdmlld1RvcCwgdmlld0JvdHRvbSk7XG5cdFx0dmFyIHJhbmdlcyA9IGdldFBhcmFsYXhSYW5nZXMoJHBhcmFsYXgpO1xuXG5cdFx0dmFyIG1heFZhbHVlID0gcmFuZ2VzLm1heCAtIHJhbmdlcy5taW47XG5cdFx0dmFyIHZhbHVlID0gTWF0aC5yb3VuZChwZXJjZW50ICogbWF4VmFsdWUgKyByYW5nZXMubWluKTtcblxuXHRcdCRwYXJhbGF4LmF0dHIoJ2RhdGEtcGFyYWxheCcsIHZhbHVlKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlZnJlc2hQYXJhbGF4ZXMoKSB7XG5cdFx0dmFyIHRvcCA9IGdldFNjcm9sbFRvcCgpO1xuXHRcdHZhciBib3R0b20gPSB0b3AgKyBnZXRWaWV3SGVpZ2h0KCk7XG5cblx0XHR2YXIgJHBhcmFsYXhlcyA9IGdldFBhcmFsYXhlcygpO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCAkcGFyYWxheGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgJHBhcmFsYXggPSAkcGFyYWxheGVzLmVxKGkpO1xuXHRcdFx0cmVmcmVzaFBhcmFsYXgoJHBhcmFsYXgsIHRvcCwgYm90dG9tKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBvblNjcm9sbENoYW5nZShlKSB7XG5cdFx0cmVmcmVzaFNjcm9sbGVyKCk7XG5cdFx0cmVmcmVzaEVudGVycygpO1xuXHRcdHJlZnJlc2hQYXJhbGF4ZXMoKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uU2Nyb2xsKGUsIG5vZGUsIGZ1bmMpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dmFyIHZhbHVlID0gZnVuYyA/IGZ1bmMobm9kZSkgOiAwO1xuXHRcdHNjcm9sbFBhZ2UodmFsdWUpO1xuXHR9XG5cblx0ZnVuY3Rpb24gb25TY3JvbGxEb3duKGUpIHtcblx0XHRvblNjcm9sbChlLCB0aGlzLCBnZXRFbGVtZW50Qm90dG9tKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uU2Nyb2xsVG9wKGUpIHtcblx0XHRnZXRTY3JvbGxlcigpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblx0XHRvblNjcm9sbChlLCB0aGlzKTtcblx0fVxuXG5cdGZ1bmN0aW9uIG9uUmVhZHkoKSB7XG5cdFx0aW5pdEVudGVycygpO1xuXHRcdHJlZnJlc2hQYXJhbGF4ZXMoKTtcblx0fVxuXG5cdGdldERvY3VtZW50KClcblx0XHQub24oJ2NsaWNrJywgJ1tkYXRhLXNjcm9sbC1kb3duXScsIG9uU2Nyb2xsRG93bilcblx0XHQub24oJ2NsaWNrJywgJ1tkYXRhLXNjcm9sbF0nLCBvblNjcm9sbFRvcClcblx0XHQub24oJ3Njcm9sbCcsIG9uU2Nyb2xsQ2hhbmdlKVxuXHRcdC5vbignc3RhcnQnLCBvblJlYWR5KVxuXHRcdC5yZWFkeShyZWZyZXNoUGFyYWxheGVzKTtcblxuXHQkKHdpbmRvdykub24oJ3Jlc2l6ZScsIGNsZWFyQ2FjaGUpO1xufSkod2luZG93LmpRdWVyeSk7XG4iLCIvKipcbiAqINCS0LjQtNC20LXRgiDRgdCy0L7RgNCw0YfQuNCy0LDRjtGJ0LXQudGB0Y8g0L7QsdC70LDRgdGC0LguXG4gKi9cbiEoZnVuY3Rpb24oJCkge1xuXG4gIC8qKlxuICAgKiDQktGA0LXQvNGPINGB0LrRgNGL0YLQuNGPINC+0LHQu9Cw0YHRgtC4LlxuICAgKlxuICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgKi9cbiAgdmFyIGR1cmF0aW9uID0gNTAwO1xuXG4gIC8qKlxuICAgKiDQodC10LvQtdC60YLQvtGAINC60L7QvdGC0LXQudC90LXRgNCwLlxuICAgKlxuICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgKi9cbiAgdmFyIGhvc3RTZWxlY3RvciA9ICcuY291cnNlLWxlc3Nvbic7XG5cbiAgLyoqXG4gICAqINCh0LXQu9C10LrRgtC+0YAg0LfQsNCz0L7Qu9C+0LLQutCwLlxuICAgKlxuICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgKi9cbiAgdmFyIGhlYWRlclNlbGVjdG9yID0gJy5jb3Vyc2UtbGVzc29uX19oZWFkZXInO1xuXG4gIC8qKlxuICAgKiDQodC10LvQtdC60YLQvtGAINGB0L7QtNC10YDQttC40LzQvtCz0L4uXG4gICAqXG4gICAqIEB0eXBlIHtTdHJpbmd9XG4gICAqL1xuICB2YXIgY29udGVudFNlbGVjdG9yID0gJy5jb3Vyc2UtbGVzc29uX19jb250ZW50JztcblxuICAvKipcbiAgICog0J/QvtC60LDQt9GL0LLQsNC10YIg0YHQvtC00LXRgNC20LjQvNC+0LUg0L7QsdC70LDRgdGC0LguXG4gICAqXG4gICAqIEBwYXJhbSAge2pRdWVyeX0gaG9zdCAgICDQntCx0LvQsNGB0YLRjC5cbiAgICogQHBhcmFtICB7alF1ZXJ5fSBjb250ZW50INCh0L7QtNC10YDQttC40LzQvtC1LlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZnVuY3Rpb24gc2hvdyhob3N0LCBjb250ZW50KSB7XG5cbiAgfVxuXG4gIC8qKlxuICAgKiDQntCx0YDQsNCx0LDRgtGL0LLQsNC10YIg0L3QsNC20LDRgtC40LUg0LfQsNCz0L7Qu9C+0LLQvtC6INC+0LHQu9Cw0YHRgtC4LlxuICAgKlxuICAgKiBAcGFyYW0gIHtFdmVudH0gZSDQodC+0LHRi9GC0LjQtS5cbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGZ1bmN0aW9uIG9uSGVhZGVyQ2xpY2soZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIHZhciBoZWFkZXIgPSAkKHRoaXMpO1xuICAgIHZhciBob3N0ID0gaGVhZGVyLmNsb3Nlc3QoaG9zdFNlbGVjdG9yKTtcbiAgICB2YXIgY29udGVudCA9IGhvc3QuZmluZChjb250ZW50U2VsZWN0b3IpO1xuXG4gICAgY29udGVudC5zdG9wKCk7XG5cbiAgICB2YXIgaXNTaG93ZWQgPSBjb250ZW50LmlzKCc6dmlzaWJsZScpO1xuXG4gICAgaWYgKGlzU2hvd2VkKSB7XG4gICAgICBob3N0LnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgIGNvbnRlbnQuc2xpZGVVcChkdXJhdGlvbik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgaG9zdC5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICBjb250ZW50LnNsaWRlRG93bihkdXJhdGlvbik7XG4gICAgfVxuICB9XG5cbiAgLy8g0J/RgNC40LrRgNC10L/Qu9GP0LXQvCDQvtCx0YDQsNCx0L7RgtGH0LjQutC4LlxuICAkKGRvY3VtZW50KVxuICAgIC5vbignY2xpY2snLCBoZWFkZXJTZWxlY3Rvciwgb25IZWFkZXJDbGljayk7XG5cbn0pKHdpbmRvdy5qUXVlcnkpOyIsIiEoZnVuY3Rpb24oJCkge1xuXG4gIC8qKlxuICAgKiDQnNCw0LrRgdC40LzQsNC70YzQvdCw0Y8g0YjQuNGA0LjQvdCwINGN0LrRgNCw0L3QsCwg0L/RgNC4INC60L7RgtC+0YDQvtC5INC+0YLQvtCx0YDQsNC20LDQtdGC0YHRjyDRgdC70LDQudC00LXRgC5cbiAgICpcbiAgICogQHR5cGUge051bWJlcn1cbiAgICovXG4gIHZhciBtYXhXaWR0aCA9IDEwOTI7XG5cbiAgLyoqXG4gICAqINCU0L7QutGD0LzQtdC90YIuXG4gICAqXG4gICAqIEB0eXBlIHtqUXVlcnl9XG4gICAqL1xuICB2YXIgZG9jID0gJChkb2N1bWVudCk7XG5cbiAgLyoqXG4gICAqINCa0L7QvdGC0LXQudC90LXRgCDRgdC70LDQudC00LXRgNCwINCz0LvQsNCy0L3QvtC5INGB0YLRgNCw0L3QuNGG0YsuXG4gICAqXG4gICAqIEB0eXBlIHtqUXVlcnl9XG4gICAqL1xuICB2YXIgY29udGFpbmVyID0gbnVsbDtcblxuICAvKipcbiAgICog0KHQu9Cw0LnQtNC10YAuXG4gICAqXG4gICAqIEB0eXBlIHtqUXVlcnl9XG4gICAqL1xuICB2YXIgc2xpZGVyID0gbnVsbDtcblxuICAvKipcbiAgICog0JrQvtC70LjRh9C10YHRgtCy0L4g0YHQu9Cw0LnQtNC+0LIuXG4gICAqXG4gICAqIEB0eXBlIHtOdW1iZXJ9XG4gICAqL1xuICB2YXIgc2xpZGVyQ291bnQgPSAwO1xuXG4gIC8qKlxuICAgKiDQotC10LrRg9GJ0LjQuSDRgdC70LDQudC0LlxuICAgKlxuICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgKi9cbiAgdmFyIHNsaWRlckluZGV4ID0gMDtcblxuICAvKipcbiAgICog0J/QvtC60LDQt9GL0LLQsNC10YIsINCx0YvQuyDQu9C4INGB0LvQsNC50LTQtdGAINC/0YDQvtGB0LzQvtGC0YDQtdC9INC00L4g0LrQvtC90YbQsC5cbiAgICpcbiAgICogQHR5cGUge0Jvb2x9XG4gICAqL1xuICB2YXIgaXNWaWV3ZWQgPSBmYWxzZTtcblxuICAvKipcbiAgICog0JLRgNC10LzRjyDRgdC80LXQvdGLINGB0LvQsNC50LTQvtCyLlxuICAgKlxuICAgKiBAdHlwZSB7TnVtYmVyfVxuICAgKi9cbiAgdmFyIGR1cmF0aW9uID0gMDtcblxuICAvKipcbiAgICog0J/QvtC60LDQt9GL0LLQsNC10YIsINCy0YvQv9C+0LvQvdGP0LXRgtGB0Y8g0LvQuCDQsiDQtNCw0L3QvdGL0Lkg0LzQvtC80LXQvdGCINGB0LzQtdC90LAg0YHQu9Cw0LnQtNC+0LIuXG4gICAqXG4gICAqIEB0eXBlIHtCb29sfVxuICAgKi9cbiAgdmFyIGlzVHJhbnNpdGlvbiA9IGZhbHNlO1xuXG4gIC8qKlxuICAgKiDQndCw0LfQstCw0L3QuNC1INGB0L7QsdGL0YLQuNGPLlxuICAgKlxuICAgKiBAdHlwZSB7U3RyaW5nfVxuICAgKi9cbiAgdmFyIGV2ZW50TmFtZSA9ICdtb3VzZXdoZWVsIE1vek1vdXNlUGl4ZWxTY3JvbGwnO1xuXG4gIC8qKlxuICAgKiDQlNC+0LHQsNCy0LvRj9C10YIg0L7QsdGA0LDQsdC+0YLRh9C40Log0YHQvtCx0YvRgtC40Y4g0L/RgNC+0LrRgNGD0YLQutC4LlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZnVuY3Rpb24gYmluZFNjcm9sbCgpIHtcbiAgICBmaXhCb2R5KCk7XG4gICAgY29udGFpbmVyLm9uKGV2ZW50TmFtZSwgb25TY3JvbGwpO1xuICB9XG5cbiAgLyoqXG4gICAqINCj0LTQsNC70Y/QtdGCINC+0LHRgNCw0LHQvtGC0YfQuNC6INGB0L7QsdGL0YLQuNGOINC/0YDQvtC60YDRg9GC0LrQuC5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGZ1bmN0aW9uIHVuYmluZFNjcm9sbCgpIHtcbiAgICBjb250YWluZXIub2ZmKGV2ZW50TmFtZSwgb25TY3JvbGwpO1xuICAgIHVuZml4Qm9keSgpO1xuICB9XG5cbiAgLyoqXG4gICAqINCe0LHRgNCw0LHQsNGC0YvQstCw0LXRgiDQvtC60L7QvdGH0LDQvdC40LUg0YHQvNC10L3RiyDRgdC70LDQudC00L7Qsi5cbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG4gIGZ1bmN0aW9uIG9uVHJhbnNpdGlvbigpIHtcbiAgICBpc1RyYW5zaXRpb24gPSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiDQntCx0YDQsNCx0LDRgtGL0LLQsNC10YIg0L/RgNC+0LrRgNGD0YLQutGDINGB0YLRgNCw0L3QuNGG0YsuXG4gICAqXG4gICAqIEBwYXJhbSAge0V2ZW50fSBlINCh0L7QsdGL0YLQuNC1LlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZnVuY3Rpb24gb25TY3JvbGwoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgIHZhciBpc0Jsb2NrZWQgPSBpc1RyYW5zaXRpb24gfHwgc2xpZGVyLmhhc0NsYXNzKCduZXh0JykgfHwgc2xpZGVyLmhhc0NsYXNzKCdiYWNrJyk7XG5cbiAgICBpZiAoaXNCbG9ja2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdmFyIGRlbHRhID0gZS5vcmlnaW5hbEV2ZW50LmRlbHRhWSB8fCBlLm9yaWdpbmFsRXZlbnQuZGV0YWlsIHx8IGUub3JpZ2luYWxFdmVudC53aGVlbERlbHRhO1xuICAgIFxuICAgIGlmIChkZWx0YSA8IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpc1RyYW5zaXRpb24gPSB0cnVlO1xuICAgIHZhciBpbmRleCA9IGNhcm91c2VsSW5kZXgoc2xpZGVyKSArIDE7XG5cbiAgICBpZiAoaW5kZXggPj0gc2xpZGVyQ291bnQpIHtcbiAgICAgICQuYWpheCgnL2hvbWUtc2xpZGVyLXNjcm9sbGVkLnBocCcpO1xuXG4gICAgICB1bmJpbmRTY3JvbGwoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpc1RyYW5zaXRpb24gPSB0cnVlO1xuXG4gICAgY2Fyb3VzZWxUbyhzbGlkZXIsIGluZGV4LCAnbmV4dCcpO1xuICAgIHNldFRpbWVvdXQob25UcmFuc2l0aW9uLCBkdXJhdGlvbik7XG4gIH1cblxuICAvKipcbiAgICog0JjQvdC40YbQuNCw0LvQuNC30LjRgNGD0LXRgiDQv9GA0L7RgdC80L7RgtGAINGB0LLQtdGA0YXRgyDQs9C70LDQstC90L7QuSDRgdGC0YDQsNC90LjRhtGLLlxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cbiAgZnVuY3Rpb24gaW5pdFNjcm9sbFN0YXJ0KCkge1xuICAgIHdpbmRvdy5zY3JvbGxUbygwLCAwKTtcbiAgICBiaW5kU2Nyb2xsKCk7XG4gICAgY2Fyb3VzZWxUb0ZpcnN0KHNsaWRlcik7XG4gIH1cblxuICAvKipcbiAgICog0JjQvdC40YbQuNCw0LvQuNC30LjRgNGD0LXRgiDQv9GA0L7RgdC80L7RgtGAINGB0YLRgNCw0L3QuNGG0Ysg0YEg0LvRjtCx0L7Qs9C+INC80LXRgdGC0LAg0LPQu9Cw0LLQvdC+0Lkg0YHRgtGA0LDQvdC40YbRiywg0LrRgNC+0LzQtVxuICAgKiDQvdCw0YfQsNC70LAuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBmdW5jdGlvbiBpbml0U2Nyb2xsT3RoZXIoKSB7XG4gICAgY2Fyb3VzZWxUb0xhc3Qoc2xpZGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDQktGL0L/QvtC70L3Rj9C10YLRgdGPINC/0YDQuCDQt9Cw0LPRgNGD0LfQutC1INGB0YLRgNCw0L3QuNGG0YsuXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuICBmdW5jdGlvbiBvblJlYWR5KCkge1xuICAgIGlmIChkb2N1bWVudC5ib2R5LmNsaWVudFdpZHRoIDwgbWF4V2lkdGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb250YWluZXIgPSAkKCcuaG9tZS1zbGlkZXInKTtcblxuICAgIGlmICghY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHNsaWRlciA9ICQoJyNob21lU2xpZGVyJyk7XG5cbiAgICBpZiAoc2xpZGVyLmhhc0NsYXNzKCdzY3JvbGxlZCcpKSB7XG4gICAgICByZXR1cm4gaW5pdFNjcm9sbE90aGVyKCk7XG4gICAgfVxuXG4gICAgc2xpZGVyQ291bnQgPSBjYXJvdXNlbENvdW50KHNsaWRlcik7XG4gICAgZHVyYXRpb24gPSBzbGlkZXIuYXR0cignZGF0YS1kdXJhdGlvbicpICogMTtcblxuICAgIGluaXRTY3JvbGxTdGFydCgpO1xuICB9XG5cbiAgLy8g0J/RgNC40LrRgNC10L/Qu9GP0LXQvCDRgdC+0LHRi9GC0LjRjy5cbiAgZG9jLm9uKCdzdGFydCcsIG9uUmVhZHkpO1xuXG59KSh3aW5kb3cualF1ZXJ5KTsiLCIhKGZ1bmN0aW9uKCkge1xuICB2YXIgZHVyYXRpb24gPSAxNzAwO1xuICB2YXIgbWluRGVsYXkgPSAxNTAwO1xuICB2YXIgc3RhcnREZWxheSA9IDE7XG5cbiAgdmFyIGlzVGltZW91dCA9IGZhbHNlO1xuICB2YXIgaXNMb2FkZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBvblRpbWVvdXQoKSB7XG4gICAgaXNUaW1lb3V0ID0gdHJ1ZTtcbiAgICBoaWRlKCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbkxvYWRlZCgpIHtcbiAgICBpc0xvYWRlZCA9IHRydWU7XG4gICAgaGlkZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGlkZSgpIHtcbiAgICBpZiAoIWlzVGltZW91dCB8fCAhaXNMb2FkZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgbG9hZGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2xvYWRlcicpO1xuICAgIGxvYWRlci5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICBsb2FkZXIuY2xhc3NMaXN0LmFkZCgnbGVhdmUnKTtcblxuICAgIHZhciByZW1vdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHVuZml4Qm9keSgpO1xuICAgICAgbG9hZGVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobG9hZGVyKTtcbiAgICAgICQoZG9jdW1lbnQpLnRyaWdnZXIoJ3N0YXJ0Jyk7XG4gICAgfTtcblxuICAgIHNldFRpbWVvdXQocmVtb3ZlLCBkdXJhdGlvbik7XG4gIH1cblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZpeEJvZHkpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIG9uTG9hZGVkKTtcbiAgc2V0VGltZW91dChvblRpbWVvdXQsIG1pbkRlbGF5KTtcbn0pKCk7Il19

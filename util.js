"use strict"

// anim shim
window.requestAnimationFrameWithContext = (function(){
  return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60);
    };
})();

// event shim
var addEvent = function(elem, type, eventHandle) {
    if (elem == null || typeof(elem) == 'undefined') return;
    if ( elem.addEventListener ) {
        elem.addEventListener( type, eventHandle, false );
    } else if ( elem.attachEvent ) {
        elem.attachEvent( "on" + type, eventHandle );
    } else {
        elem["on"+type]=eventHandle;
    }
};

// canvas drawing utils
var util = {
  fillRectFromCenterAndSize: function(ctx, centerX, centerY, sizeX, sizeY) {
    ctx.fillRect(centerX - sizeX/2, centerY - sizeY/2, sizeX, sizeY);
  },
  lerp: function(a, b, t) {
    return a * (1-t) + b * t;
  },
  normalOfVectorObject: function(vector) {
    return this.normalOfVector(vector.x, vector.y);
  },
  normalOfVector: function(x, y) {
    var magnitude = Math.sqrt(x * x + y + y);
    return { x: x / magnitude, y: y / magnitude };
  },
  clamp01: function(value) {
    return Math.min(1, Math.max(0, value));
  }
};

// interpolation
var interp = {
  linear: function(a, b, t) { t = util.clamp01(t); var i = t; return a*(1-i) + b*i; },
  easeOutSine: function(a, b, t) { t = util.clamp01(t); var i = Math.sin(t * Math.PI/2); return a*(1-i) + b*i; },
  easeOutBack: function(a, b, t, strength) { t = util.clamp01(t); var strength = strength || 1.5; t = t-1; var i = (t*t * ((strength + 1)*t + strength) + 1); return a*(1-i) + b*i; },
  easeOutQuint: function(a, b, t) { t = util.clamp01(t); t = t-1; var i = t*t*t + 1; return a*(1-i) + b*i; },
  easeInCubic: function(a, b, t) { t = util.clamp01(t); var i = t*t*t; return a*(1-i) + b*i; },
};
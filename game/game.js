// global object for stuff
window.SR = window.SR || {};

// anim shim
window.requestAnimationFrameWithContext = (function(){
  return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60);
    };
})();

// the actual game that runs in the popup
(function() {
  game = {
    setPopupSize: function(width, height) {
      this.popupSize = { x: width, y: height };
      window.resizeTo(this.popupSize.x, this.popupSize.y);  
      this.updateViewportSize();
    },
    centerPopup: function() {
        window.moveTo((this.resolution.x - (this.popupSize.x)) / 2, (this.resolution.y - (this.popupSize.y)) / 2)
    },

    updateViewportSize: function() {
      this.viewportSize = this.viewportSize || { x: 0, y: 0}
      // http://stackoverflow.com/a/11744120/2089233
      var w = window,
        d = document,
        e = d.documentElement,
        g = d.getElementsByTagName('body')[0];
      this.viewportSize.x = w.innerWidth || e.clientWidth || g.clientWidth;
      this.viewportSize.y = w.innerHeight|| e.clientHeight|| g.clientHeight;
    },
    setViewportSize: function(width, height) {
      var popupSizeDiff = { x: this.popupSize.x - this.viewportSize.x, y: this.popupSize.y - this.viewportSize.y };
      this.setPopupSize(width + popupSizeDiff.x, height + popupSizeDiff.y);
    },

    start: function() {
      window.game = this;
      this.resolution = { x: window.screen.width, y: window.screen.height }
      this.setPopupSize(300, 300);

      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext("2d");
      this.update();
    },
    update: function() {
      var self = this;
      var ctx = this.ctx;
      var canvas = this.canvas;
      ctx.save(); // save default ctx
      this.updateViewportSize();

      this.toggle = (this.toggle || 0) + 1;
      if (this.toggle % 1 == 0) {
        this.wx = ((this.wx || 300) + 12) % 300;
        var newSizeX = 300 + this.wx;
        var newSizeY = 300 + this.wx;
        this.setViewportSize(newSizeX, newSizeY);
        this.centerPopup()
      }

      canvas.width = this.viewportSize.x;
      canvas.height = this.viewportSize.y;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.red = ((this.red || 0) + 8) % 256;
      ctx.fillStyle = 'rgb(0, 0, 200)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgb(' + this.red + ', 0, 0)';
      ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);

      ctx.restore(); // restore default ctx
      requestAnimationFrame(function() { self.update.call(self); });
    },
  }

  window.onload = function() {
    game.start();
  }
})();
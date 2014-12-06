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

    onResize: function(e) {

    },

    start: function() {
      window.game = this;
      var self = this;

      addEvent(window, 'resize', function(e) { self.onResize.call(self, e); });

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

      // this.toggle = (this.toggle || 0) + 1;
      // if (this.toggle % 1 == 0) {
      //   this.wx = ((this.wx || 300) + 12) % 300;
      //   var newSizeX = 300 + this.wx;
      //   var newSizeY = 300 + this.wx;
      //   this.setViewportSize(newSizeX, newSizeY);
      //   this.centerPopup()
      // }

      // reset canvas
      {
        canvas.width = this.viewportSize.x;
        canvas.height = this.viewportSize.y;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // background
      {
        ctx.fillStyle = 'rgb(0, 0, 128)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // blocks
      {
        var blockSize = 20;
        var blockPositions = [
          [0, 0],
          [50, 0],
          [50, 50],
          [120, 200],
          [400, 400],
          [500, 500],
          [600, 200]
        ];

        this.red = ((this.red || 0) + 8) % 256;
        ctx.fillStyle = 'rgb(' + this.red + ', 0, 0)';

        for (var i = 0; i < blockPositions.length; i++) {
          var blockPosition = blockPositions[i];
          ctx.save();
          ctx.translate(blockPosition[0], blockPosition[1])
          ctx.fillRect(0, 0, blockSize, blockSize);              
          ctx.restore();
        };    
      }

      ctx.restore(); // restore default ctx
      requestAnimationFrame(function() { self.update.call(self); });
    },
  }

  window.onload = function() {
    game.start();
  }
})();
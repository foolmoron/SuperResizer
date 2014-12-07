"use strict"

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

// canvas drawing utils
var util = {
  fillRectFromCenterAndSize: function(ctx, centerX, centerY, sizeX, sizeY) {
    ctx.fillRect(centerX - sizeX/2, centerY - sizeY/2, sizeX, sizeY);
  }
};

// the actual game that runs in the popup
(function() {
  var game = {
    setPopupSize: function(width, height) {
      window.resizeTo(width, height);
      this.updatePopupSize();
      this.updateViewportSize();
    },
    updatePopupSize: function() {
      this.popupSize = { x: window.outerWidth, y: window.outerHeight };
    },
    updatePopupPosition: function() {
      this.popupPosition = this.popupPosition || { x: 0, y: 0};
      this.popupPosition.x = window.screenLeft || window.screenX;
      this.popupPosition.y = window.screenTop || window.screenY;
    },
    centerPopup: function() {
        window.moveTo((this.resolution.x - (this.popupSize.x)) / 2, (this.resolution.y - (this.popupSize.y)) / 2);
        this.updatePopupPosition();
    },

    setViewportSize: function(width, height) {
      var popupSizeDiff = { x: this.popupSize.x - this.viewportSize.x, y: this.popupSize.y - this.viewportSize.y };
      this.setPopupSize(width + popupSizeDiff.x, height + popupSizeDiff.y);
    },
    updateViewportSize: function() {
      this.viewportSize = this.viewportSize || { x: 0, y: 0};
      // http://stackoverflow.com/a/11744120/2089233
      var w = window,
        d = document,
        e = d.documentElement,
        g = d.getElementsByTagName('body')[0];
      this.viewportSize.x = w.innerWidth || e.clientWidth || g.clientWidth;
      this.viewportSize.y = w.innerHeight|| e.clientHeight|| g.clientHeight;
    },

    onResize: function(e) {
      var deltas = {};
      deltas.left = (window.screenLeft || window.screenX) - this.popupPosition.x;
      deltas.top = (window.screenTop || window.screenY) - this.popupPosition.y;
      deltas.right = window.outerWidth - this.popupSize.x + deltas.left;
      deltas.bottom = window.outerHeight - this.popupSize.y + deltas.top;
      this.updatePopupSize();

      this.cameraPosition.x += deltas.left;
      this.cameraPosition.y += deltas.top;
    },

    start: function() {
      window.game = this;
      var self = this;

      addEvent(window, 'resize', function(e) { self.onResize.call(self, e); });

      this.resolution = { x: window.screen.width, y: window.screen.height }
      this.updatePopupSize();
      this.updateViewportSize();
      this.setViewportSize(500, 500);
      this.centerPopup();
      this.cameraPosition = { x: 0, y: 0};

      this.canvas = document.getElementById('game');
      this.ctx = this.canvas.getContext("2d");
      this.update();
    },
    update: function(timestamp) {
      var self = this;

      var dtmillis = this.previousTimestamp == 0 ? 0 : timestamp - this.previousTimestamp;
      var dt = dtmillis / 1000;
      this.previousTimestamp = timestamp;

      var ctx = this.ctx;
      var canvas = this.canvas;
      ctx.save(); // save default ctx
      this.updatePopupSize();
      this.updatePopupPosition();
      this.updateViewportSize();

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

      // everything in here is in camera space, due to subtracting the camera's position
      {
        ctx.save();
        ctx.translate(-this.cameraPosition.x, -this.cameraPosition.y);

        // blocks
        {
          var blockSize = 200;
          var blockPositions = this.blockPositions = this.blockPositions || [
            [150, 150],
            [600, 0],
            [600, 600],
            [920, 200],
            [1200, 1000],
            [-500, -500],
            [1500, 800]
          ];
          var blockCoverageTimeMax = 2;
          var blockCoverageTimes = this.blockCoverageTimes = this.blockCoverageTimes || []; // sparse array of seconds of coverage for each block
          var blocksActivated = this.blocksActivated = this.blocksActivated || []; // sparse array with bool for activation state of each block 

          var blockCoverTolerance = 15;

          this.red = ((this.red || 0) + 8) % 256;

          for (var i = 0; i < blockPositions.length; i++) {
            var blockPosition = blockPositions[i];
            ctx.save();
            // detect viewport covering block
            var viewportCoveringBlock = false;
            {
              var blockOffsetLeft = blockPosition[0] - this.cameraPosition.x;
              var blockOffsetTop = blockPosition[1] - this.cameraPosition.y;
              if (blockOffsetLeft <= 0 && blockOffsetLeft <= blockCoverTolerance && blockOffsetTop <= 0 && blockOffsetTop <= blockCoverTolerance) {
                var blockOffsetRight = blockSize - this.viewportSize.x + blockOffsetLeft;
                var blockOffsetBottom = blockSize - this.viewportSize.y + blockOffsetTop;
                if (blockOffsetRight >= 0 && blockOffsetRight <= blockCoverTolerance && blockOffsetBottom >= 0 && blockOffsetBottom <= blockCoverTolerance) {
                  viewportCoveringBlock = true;
                }
              }
            }
            // block coverage stuff
            {
              if (viewportCoveringBlock) {
                blockCoverageTimes[i] = (blockCoverageTimes[i] || 0) + dt;
              } else {
                blockCoverageTimes[i] = 0;
              }
            }
            // draw block stuff
            {
              ctx.translate(blockPosition[0], blockPosition[1])

              // "sun" gradient under block
              {
                var viewportCenterWorldPosition = { x: this.cameraPosition.x + this.viewportSize.x/2, y: this.cameraPosition.y + this.viewportSize.y/2 };
                var distX = viewportCenterWorldPosition.x - blockPosition[0];
                var distY = viewportCenterWorldPosition.y - blockPosition[1];
                var distanceToCameraCenter = Math.sqrt(distX * distX + distY * distY);
                distanceToCameraCenter = Math.max(distanceToCameraCenter, blockSize);
                var sunGradient = ctx.createRadialGradient(blockSize/2, blockSize/2, blockSize/2, blockSize/2, blockSize/2, distanceToCameraCenter);
                sunGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                sunGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = sunGradient;
                ctx.fillRect(-distanceToCameraCenter + blockSize/2, -distanceToCameraCenter + blockSize/2, distanceToCameraCenter*2, distanceToCameraCenter*2);
              }
              // actual block 
              {
                ctx.fillStyle = 'rgb(' + this.red + ', 0, 0)';
                ctx.fillRect(0, 0, blockSize, blockSize);
              }
              // inner block fill
              {
                ctx.fillStyle = blocksActivated[i] ? 'rgb(0, 128, 255)' : viewportCoveringBlock ? 'rgb(255, 255, 255)' : 'rgb(0, 200, 0)';
                ctx.fillRect(blockCoverTolerance, blockCoverTolerance, blockSize - blockCoverTolerance*2, blockSize - blockCoverTolerance*2);                
              }
              // coverage indicator
              {
                var blockCoverageTime = blockCoverageTimes[i];
                if (!blocksActivated[i] && blockCoverageTime > 0 && blockCoverageTime <= blockCoverageTimeMax) {
                  var blockCoverageIndicatorSize = (blockSize - blockCoverTolerance*2) * (blockCoverageTime / blockCoverageTimeMax);
                  ctx.fillStyle = 'rgb(255, 255, 0)';
                  util.fillRectFromCenterAndSize(ctx, blockSize/2, blockSize/2, blockCoverageIndicatorSize, blockCoverageIndicatorSize);
                } 
                if (blockCoverageTime >= blockCoverageTimeMax) {
                  blocksActivated[i] = true;
                }
              }
            }
            ctx.restore();
          };
        }

        // back to screen space
        ctx.restore();
      }

      ctx.restore(); // restore default ctx
      requestAnimationFrame(function(ts) { self.update.call(self, ts); });
    },
  }

  window.onload = function() {
    game.start();
  }
})();
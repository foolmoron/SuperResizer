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


    blockSize: 200,
    blockCoverageTimeMax: 2,
    blockCoverTolerance: 15,
    blocks: [
      { pos: [150, 150], coverageTime: 0, activated: false }
    ],

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

      // gradients for blocks
      {
        var blockSize = this.blockSize;

        var cameraCenterInWorld = { x: this.cameraPosition.x + this.viewportSize.x/2, y: this.cameraPosition.y + this.viewportSize.y/2 };

        for (var i = 0; i < this.blocks.length; i++) {
          var block = this.blocks[i];

          var distX = cameraCenterInWorld.x - block.pos[0];
          var distY = cameraCenterInWorld.y - block.pos[1];
          var distToCameraCenter = Math.sqrt(distX * distX + distY * distY);
          var distNormalizeFactor = 500;
          distToCameraCenter = Math.max(distToCameraCenter, distNormalizeFactor);
          var closenessScalingFactor = 1/(distToCameraCenter/distNormalizeFactor); // decreases from 1 to 0 as dist goes up

          var gradientPositions = []; // [startX, startY, endX, endY]
          if (Math.abs(distX) >= Math.abs(distY)) {
            if (distX >= 0) { // towards right
              gradientPositions = [0, 400 / 2, 400, 400 / 2];
            } else { // towards left
              gradientPositions = [this.viewportSize.x, 400 / 2, this.viewportSize.x - 400, 400 / 2];              
            }
          } else {
            if (distY >= 0) { // towards down
              gradientPositions = [400 / 2, 0, 400 / 2, 400];
            } else { // towards up
              gradientPositions = [400 / 2, this.viewportSize.y, 400 / 2, this.viewportSize.y - 400];              
            }
          }
          
          var sunGradient = ctx.createLinearGradient(gradientPositions[0], gradientPositions[1], gradientPositions[2], gradientPositions[3]);
          sunGradient.addColorStop(0, 'rgba(255, 255, 255, ' + (closenessScalingFactor + 0.25) + ')');
          sunGradient.addColorStop(closenessScalingFactor, 'rgba(255, 255, 255, 0)'); // stretch gradient based on distance to block
          sunGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = sunGradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      // everything in here is in camera space, due to subtracting the camera's position
      {
        ctx.save();
        ctx.translate(-this.cameraPosition.x, -this.cameraPosition.y);

        // blocks
        {
          var blockSize = this.blockSize;
          var blockCoverTolerance = this.blockCoverTolerance;

          this.red = ((this.red || 0) + 8) % 256;

          for (var i = 0; i < this.blocks.length; i++) {
            var block = this.blocks[i];
            ctx.save();
            // detect viewport covering block
            var viewportCoveringBlock = false;
            {
              var blockOffsetLeft = block.pos[0] - this.cameraPosition.x;
              var blockOffsetTop = block.pos[1] - this.cameraPosition.y;
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
                block.coverageTime = (block.coverageTime || 0) + dt;
              } else {
                block.coverageTime = 0;
              }
            }
            // draw block stuff
            {
              ctx.translate(block.pos[0], block.pos[1])

              // actual block 
              {
                ctx.fillStyle = 'rgb(' + this.red + ', 0, 0)';
                ctx.fillRect(0, 0, blockSize, blockSize);
              }
              // inner block fill
              {
                ctx.fillStyle = block.activated ? 'rgb(0, 128, 255)' : viewportCoveringBlock ? 'rgb(255, 255, 255)' : 'rgb(0, 200, 0)';
                ctx.fillRect(blockCoverTolerance, blockCoverTolerance, blockSize - blockCoverTolerance*2, blockSize - blockCoverTolerance*2);                
              }
              // coverage indicator
              {
                if (!block.activated && block.CoverageTime > 0 && block.CoverageTime <= this.block.CoverageTimeMax) {
                  var blockCoverageIndicatorSize = (blockSize - blockCoverTolerance*2) * (block.CoverageTime / this.block.CoverageTimeMax);
                  ctx.fillStyle = 'rgb(255, 255, 0)';
                  util.fillRectFromCenterAndSize(ctx, blockSize/2, blockSize/2, blockCoverageIndicatorSize, blockCoverageIndicatorSize);
                } 
                if (block.CoverageTime >= this.blockCoverageTimeMax) {
                  block.activated = true;
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
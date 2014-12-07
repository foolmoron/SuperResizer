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

    freezeCameraPosition: false,
    onResize: function(e) {
      var deltas = {};
      deltas.left = (window.screenLeft || window.screenX) - this.popupPosition.x;
      deltas.top = (window.screenTop || window.screenY) - this.popupPosition.y;
      deltas.right = window.outerWidth - this.popupSize.x + deltas.left;
      deltas.bottom = window.outerHeight - this.popupSize.y + deltas.top;
      this.updatePopupSize();

      if (!this.freezeCameraPosition) {
        this.cameraPosition.x += deltas.left;
        this.cameraPosition.y += deltas.top;
      }
    },

    timerMax: 60,
    timer: 60,
    timeGainedFromBlock: 10,

    timeBarWidth: 90,
    timeBarClocks: ['🕛','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚'],
    timeBarFilledCircle: '🌑',
    timeBarEmptyCircle: '🌕',

    blockSize: 200,
    blockCoverageTimeMax: 1.25,
    blockCoverTolerance: 15,
    blocks: [
      { pos: {x: 150, y: 150}, coverageTime: 0 }
    ],
    activatedblocks: [],

    newBlockOffsetMin: 700,
    newBlockOffsetMax: 1000,

    targetSize: null, // should be object (x, y, sizePerFrame, targetCameraCenterInWorld) or null

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

      var dtmillis = (timestamp && this.previousTimestamp) ? timestamp - this.previousTimestamp : 0;
      var dt = dtmillis / 1000;
      this.previousTimestamp = timestamp;

      var ctx = this.ctx;
      var canvas = this.canvas;
      ctx.save(); // save default ctx
      this.updatePopupSize();
      this.updatePopupPosition();
      this.updateViewportSize();

      // animate to target viewport size with block centered
      {
        var targetSize = this.targetSize;
        if (targetSize != null) {
          this.freezeCameraPosition = true;

          var diffX = targetSize.x - this.viewportSize.x;
          var diffY = targetSize.y - this.viewportSize.y;
          var changeX = (Math.abs(diffX) < targetSize.sizePerFrame) ? diffX : targetSize.sizePerFrame * Math.sign(diffX);
          var changeY = (Math.abs(diffY) < targetSize.sizePerFrame) ? diffY : targetSize.sizePerFrame * Math.sign(diffY);

          this.setViewportSize(this.viewportSize.x + changeX, this.viewportSize.y + changeY);
          window.moveTo(this.popupPosition.x - changeX/2, this.popupPosition.y - changeY/2);
          this.updatePopupPosition();
          this.updateViewportSize();
          this.cameraPosition.x = targetSize.targetCameraCenterInWorld.x - this.viewportSize.x/2;
          this.cameraPosition.y = targetSize.targetCameraCenterInWorld.y - this.viewportSize.y/2;
          if (this.viewportSize.x == targetSize.x && this.viewportSize.y == targetSize.y) {
            this.targetSize = null;
            this.freezeCameraPosition = false;
          }
        }
      }

      // countdown timer
      {
        this.timer -= dt;
      }

      // animate title
      {
        var title = '';
        this.titleTick = ((this.titleTick || 0) + 1) % 100;

        var timeBarArray = new Array(this.timeBarWidth + 1).join('.').split('');
        var currentTimeOrbIndex = Math.floor((this.timeBarWidth / 2) * (1 - this.timer / this.timerMax));

        var clock = this.timeBarClocks[Math.floor(this.titleTick/10)];
        for (var i = 0; i < (this.timeBarWidth / 2); i++) {
          var character;
          if (i == currentTimeOrbIndex) character = clock;
          else if (i < currentTimeOrbIndex) character = this.timeBarEmptyCircle;
          else if (i > currentTimeOrbIndex) character = this.timeBarFilledCircle;

          timeBarArray[i] = character;
          timeBarArray[timeBarArray.length - 1 - i] = character;
        };

        if (this.timer > 0) {
          title += '[' + timeBarArray.join('') + ']';
        } else {
          var exclamationString = this.titleTick % 2 == 0 ? '!-' : '-!';
          title = '[' + new Array(this.timeBarWidth/1.5).join(exclamationString) + 'GAME OVER' + new Array(this.timeBarWidth/1.5).join(exclamationString) + ']';
        }
        

        document.title = title;
      }

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
          var distX = cameraCenterInWorld.x - block.pos.x;
          var distY = cameraCenterInWorld.y - block.pos.y;
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
            var viewportCovering = { left: false, top: false, right: false, bottom: false };
            {
              var blockOffsetLeft = block.pos.x - this.cameraPosition.x;
              var blockOffsetTop = block.pos.y - this.cameraPosition.y;
              viewportCovering.left = blockOffsetLeft <= 0 && Math.abs(blockOffsetLeft) <= blockCoverTolerance;
              viewportCovering.top = blockOffsetTop <= 0 && Math.abs(blockOffsetTop) <= blockCoverTolerance;

              var blockOffsetRight = blockSize - this.viewportSize.x + blockOffsetLeft;
              var blockOffsetBottom = blockSize - this.viewportSize.y + blockOffsetTop;
              viewportCovering.right = blockOffsetRight >= 0 && blockOffsetRight <= blockCoverTolerance;
              viewportCovering.bottom = blockOffsetBottom >= 0 && blockOffsetBottom <= blockCoverTolerance;
            }
            var viewportCoveringBlock = viewportCovering.left && viewportCovering.top && viewportCovering.right && viewportCovering.bottom;
            var viewportCoveringNone = !viewportCovering.left && !viewportCovering.top && !viewportCovering.right && !viewportCovering.bottom;
            // block coverage stuff
            {
              if (viewportCoveringBlock) {
                block.coverageTime += dt;
              } else {
                block.coverageTime = 0;
              }
            }
            // draw block stuff
            {
              ctx.translate(block.pos.x, block.pos.y)

              // coverage indicators 
              {
                var coveredColor = 'rgb(' + this.red + ', 0, 0)';
                var uncoveredColor = 'rgb(255, 255, 255)';

                if (viewportCoveringBlock || viewportCoveringNone) {
                  ctx.fillStyle = viewportCoveringBlock ? coveredColor : uncoveredColor;
                  ctx.fillRect(0, 0, blockSize, blockSize);
                } else {
                  var completeTriangleAndStartNew = function(ctx, color) {
                    ctx.lineTo(blockSize/2, blockSize/2);
                    ctx.fill();
                    ctx.fillStyle = color;
                    ctx.beginPath();
                  }

                  // top
                  ctx.fillStyle = viewportCovering.top ? coveredColor : uncoveredColor;
                  ctx.beginPath();
                  ctx.moveTo(0, 0);
                  ctx.lineTo(blockSize, 0);
                  ctx.lineTo(blockSize/2, blockSize/2);
                  ctx.fill();
                  // left
                  ctx.fillStyle = viewportCovering.left ? coveredColor : uncoveredColor;
                  ctx.beginPath();
                  ctx.moveTo(0, 0);
                  ctx.lineTo(0, blockSize);
                  ctx.lineTo(blockSize/2, blockSize/2);
                  ctx.fill();
                  // right
                  ctx.fillStyle = viewportCovering.right ? coveredColor : uncoveredColor;
                  ctx.beginPath();
                  ctx.moveTo(blockSize, 0);
                  ctx.lineTo(blockSize, blockSize);
                  ctx.lineTo(blockSize/2, blockSize/2);
                  ctx.fill();
                  // bottom
                  ctx.fillStyle = viewportCovering.bottom ? coveredColor : uncoveredColor;
                  ctx.beginPath();
                  ctx.moveTo(0, blockSize);
                  ctx.lineTo(blockSize, blockSize);
                  ctx.lineTo(blockSize/2, blockSize/2);
                  ctx.fill();
                }
              }
              // inner block fill
              {
                ctx.fillStyle = viewportCoveringBlock ? 'rgb(255, 255, 255)' : 'rgb(0, 200, 0)';
                ctx.fillRect(blockCoverTolerance, blockCoverTolerance, blockSize - blockCoverTolerance*2, blockSize - blockCoverTolerance*2);                
              }
              // coverage indicator
              {
                if (block.coverageTime > 0 && block.coverageTime <= this.blockCoverageTimeMax) {
                  var blockCoverageIndicatorSize = (blockSize - blockCoverTolerance*2) * (block.coverageTime / this.blockCoverageTimeMax);
                  ctx.fillStyle = 'rgb(255, 255, 0)';
                  util.fillRectFromCenterAndSize(ctx, blockSize/2, blockSize/2, blockCoverageIndicatorSize, blockCoverageIndicatorSize);
                } 
                if (block.coverageTime >= this.blockCoverageTimeMax) {
                  // modify block lists
                  {
                    this.activatedblocks.push(block);
                    this.blocks.splice(this.blocks.indexOf(block), 1);
                    i--;
                  }
                  // add new block at random offset
                  {
                    var magnitude = (this.newBlockOffsetMax - this.newBlockOffsetMin) * Math.random() + this.newBlockOffsetMin;
                    var directionRad = Math.random() * Math.PI * 2; 
                    var offsetX = Math.cos(directionRad) * magnitude;
                    var offsetY = Math.sin(directionRad) * magnitude;
                    console.log(offsetX, offsetY);
                    console.log(block.pos.x + offsetX, block.pos.y + offsetY);
                    this.blocks.push({ pos: {x: block.pos.x + offsetX, y: block.pos.y + offsetY}, coverageTime: 0 });
                  }
                  this.timer += this.timeGainedFromBlock;
                  this.targetSize = { x: this.resolution.y * 0.8, y: this.resolution.y * 0.8, sizePerFrame: 80, targetCameraCenterInWorld: { x: block.pos.x + blockSize/2, y: block.pos.y + blockSize/2 } };
                }
              }
            }
            ctx.restore();
          };

          for (var i = 0; i < this.activatedblocks.length; i++) {
            var activatedBlock = this.activatedblocks[i];
            ctx.save();
            ctx.translate(activatedBlock.pos.x, activatedBlock.pos.y)

            // activated block 
            {
              ctx.fillStyle = 'rgb(0, 128, 255)';
              ctx.fillRect(0, 0, blockSize, blockSize);
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
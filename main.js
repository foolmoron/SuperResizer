"use strict";
// NEEDS util.js

// stuff for main webpage, not game popup
(function() {
  var launcher = {
    start: function() {
      var countdown = document.getElementById('countdown');
      var countdownInterval = setInterval(function() {
        var currentCountdown = parseInt(countdown.innerHTML);
        currentCountdown--;
        countdown.innerHTML = currentCountdown;
        if (currentCountdown <= 0) {
          countdown.click()
        }
      }, 1000);
      countdown.onclick = function(e) {
        countdown.innerHTML = "Launched!"
        clearInterval(countdownInterval);
        window.open('./game', 'game', 'left=20, top=20, width=400, height=300, resizable=1'); // need to open game in a popup to allow JS to resize 
      }

      this.update();
    },
    update: function(timestamp) {
      var self = this;

      var dt = this.previousTimestamp == 0 ? 0 : timestamp - this.previousTimestamp;
      this.previousTimestamp = timestamp;

      requestAnimationFrame(function(ts) { self.update.call(self, ts); });
    },
  }

  window.onload = function() {
    launcher.start();
  }
})();
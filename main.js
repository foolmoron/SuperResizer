// anim shim
window.requestAnimationFrameWithContext = (function(){
  return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60);
    };
})();

// stuff for main webpage, not game popup
(function() {
  launcher = {
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
        window.open('./game', 'game', 'left=20, top=20, width=400, height=300'); // need to open game in a popup to allow JS to resize 
      }

      this.update();
    },
    update: function() {
      var self = this;

      requestAnimationFrame(function() { self.update.call(self); });
    },
  }

  window.onload = function() {
    launcher.start();
  }
})();
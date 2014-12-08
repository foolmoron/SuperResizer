// uses the awesome Howler.js: https://github.com/goldfire/howler.js

var audio = {
  resizein: new Howl({
    urls: ['audio/resizein.wav'],
    autoplay: false,
    loop: true
  }),
  resizeout: new Howl({
    urls: ['audio/resizeout.wav'],
    autoplay: false,
    loop: true
  }),
  coveron: new Howl({
    urls: ['audio/coveron.wav'],
    autoplay: false,
    loop: false
  }),
  coveroff: new Howl({
    urls: ['audio/coveroff.wav'],
    autoplay: false,
    loop: false
  }),
  covering: new Howl({
    urls: ['audio/covering.wav'],
    autoplay: false,
    loop: false
  }),
  activated: new Howl({
    urls: ['audio/activated.wav'],
    autoplay: false,
    loop: false
  }),
  gameover: new Howl({
    urls: ['audio/gameover.wav'],
    autoplay: false,
    loop: false
  }),
};
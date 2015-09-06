var omxctrl = require('omxctrl')

console.log('omx started')

omxctrl.play('/home/pi/VineyardMediaController/public/media/nixie.mp4')

console.log('started playing')

// OMXPLAYER listen for responses
// omxctrl.on('playing', function (filename) {
//   console.log('omxplayer: playing ', filename)
// })

omxctrl.on('ended', function () {
  console.log('omxplayer: playback has ended')
})
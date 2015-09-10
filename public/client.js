/*global $:false, document:false, io:false*/
var socket = io.connect()

// var content = '<div class="videoContainer"><video autoplay=""><source src="http://RASPBERRYPI/media/WtE-Countdown-v3-720p_2.mp4" type="video/mp4">Video Not Supported</video></div>'
var content = ''

$(document).ready(function () {
  $('#content').html(content)

  socket.on('client', function (content) {
    $('#content').html(content)
  })

  // Disconnect
  socket.on('disconnect', function () {
    var content = '<div id="disconnected">Connection to Server Lost..</div>'
    $('#content').html(content)
  })
})

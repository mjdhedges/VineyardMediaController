var elem = document.getElementById("video")
if (elem.requestFullscreen) {
  elem.requestFullscreen()
} else if (elem.msRequestFullscreen) {
  elem.msRequestFullscreen()
} else if (elem.mozRequestFullScreen) {
  elem.mozRequestFullScreen()
} else if (elem.webkitRequestFullscreen) {
  elem.webkitRequestFullscreen()
}

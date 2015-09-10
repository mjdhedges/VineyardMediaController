var osc = require('osc')

var x32config = {
  'ip': '10.0.68.131',
  'port': 10023
}

var localaddress = '10.0.68.147'

// OSC SETUP
// Create an osc.js UDP Port listening on port 10023
var osc = new osc.UDPPort({
  localAddress: localaddress,
  localPort: 10024
})

console.log('OSC Client sending to ' + x32config.ip + ':' + x32config.port)

// Open the socket
osc.open()
console.log('OSC Server Listening on ' + '0.0.0.0:' + x32config.port)

osc.on('message', function (oscMsg) {
  console.log(oscMsg)
})

// Set X32 to return changes, times out after 10s
osc.send({
  address: '/info'
}, x32config.ip, x32config.port)

osc.send({
  address: '/dca/6/fader',
  args: 700
}, x32config.ip, x32config.port)

osc.send({
  address: '/xcontrol'
}, x32config.ip, x32config.port)

console.log('first')

setTimeout(function() {
  osc.send({
    address: '/dca/6/fader',
    args: 0
  }, x32config.ip, x32config.port)
  console.log('second')
}, 1000)
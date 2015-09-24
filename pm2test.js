setTimeout(function() {
  osc.send({
    address: '/dca/6/fader',
    args: 0
  }, x32config.ip, x32config.port)
  console.log('second')
}, 5000)

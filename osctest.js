var osc = require('osc')

var x32config = {
  'ip': '10.0.68.131',
  'port': 10023
}

var getIPAddresses = function () {
    var os = require("os"),
        interfaces = os.networkInterfaces(),
        ipAddresses = []

    for (var deviceName in interfaces) {
        var addresses = interfaces[deviceName];
        for (var i = 0; i < addresses.length; i++) {
            var addressInfo = addresses[i];
            if (addressInfo.family === "IPv4" && !addressInfo.internal) {
                ipAddresses.push(addressInfo.address);
            }
        }
    }

    return ipAddresses;
}

var osc = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 57121
})

osc.on("ready", function () {
    var ipAddresses = getIPAddresses();

    console.log("Listening for OSC over UDP.")
    ipAddresses.forEach(function (address) {
        console.log(" Host:", address + ", Port:", osc.options.localPort);
    })
})

osc.on("message", function (oscMessage) {
    console.log(oscMessage)
})

osc.on("error", function (err) {
    console.log(err);
})

osc.open()

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

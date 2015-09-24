// External Modules
var express = require('express')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var later = require('later')
var moment = require('moment')
var math = require('mathjs')
var async = require('async')
var osc = require('osc')
var omxctrl = require('omxctrl')
var jsonfile = require('jsonfile')
var os = require('os')

// Internal Modules
// var convert = require('./convert.js')

// Varibles
var usernum = 0

// Object Varibles
var data = {
  'currentscene': 'Not Initialised',
  'currentmedia': 'Not Initialised',
  'scene_one': {
    'name': 'scene one',
    'schedule': {
      'start': '00:00:00'
    },
    'x32': {
      'DCA6': 0,
      'DCA7': 0,
      'MIX12': 0
    },
    'file': 'Not Initialised'
  },
  'scene_two': {
    'name': 'scene two',
    'schedule': {
      'start': '00:30:00'
    },
    'x32': {
      'DCA6': 0,
      'DCA7': 0,
      'MIX12': 0
    },
    'file': 'Not Initialised'
  },
  'media_one': {
    'name': 'media one',
    'schedule': {
      'start': '00:01:00'
    },
    'x32': {
      'DCA6': 0,
      'DCA7': 0,
      'MIX12': 0
    },
    'file': 'Not Initialised'
  },
  'media_two': {
    'name': '',
    'schedule': {
      'start': '00:02:00'
    },
    'x32': {
      'DCA6': 0,
      'DCA7': 0,
      'MIX12': 0
    },
    'file': 'Not Initialised'
  },
  'x32address': {
    'DCA6': '/dca/6/fader',
    'DCA7': '/dca/7/fader',
    'MIX12': '/bus/12/mix/fader'
  }
}

var overrides = {
  'x32': {
    'MIX12': 0
  },
  'scene': 'scene_one'
}

var x32config = {
  'ip': '10.0.68.131',
  'port': 10023
}

// on boot need to ask the x32 for these values
var current = {
  'DCA6': 0.5,
  'DCA7': 0,
  'MIX12': 0.5
}

// Scheduling using Later.js
// Use local time
later.date.localTime()
// Initialise Occurances using saved data
// .on(1). Sunday
var scene_one_occur = later.parse.recur().every(1).dayOfWeek().on(data.scene_one.schedule.start).time()
var scene_two_occur = later.parse.recur().every(1).dayOfWeek().on(data.scene_two.schedule.start).time()
var media_one_occur = later.parse.recur().every(1).dayOfWeek().on(data.media_one.schedule.start).time()
var media_two_occur = later.parse.recur().every(1).dayOfWeek().on(data.media_two.schedule.start).time()
// Create Schedules for use by countdown timer
var scene_one_schedule = later.schedule(scene_one_occur)
var scene_two_schedule = later.schedule(scene_two_occur)
var media_one_schedule = later.schedule(media_one_occur)
var media_two_schedule = later.schedule(media_two_occur)
// Start Occurances
var scene_one_tick = later.setInterval(scene_one, scene_one_occur)
var scene_two_tick = later.setInterval(scene_two, scene_two_occur)
var media_one_tick = later.setInterval(media_one, media_one_occur)
var media_two_tick = later.setInterval(media_two, media_two_occur)

// LOAD DATA FROM JSON
// As this is async it will take a while to come back and so the schedules need
// reinitalising
var file = './db/data.json'
jsonfile.readFile(file, function (err, obj) {
  if (err) {
    throw (err)
  }
  data = obj
  console.log('Database Read Successful')
  // Update Schedules
  Scene_update()
  // Load Scene One
  // This ensures we start in a known location
  // The delay on loading the database means that the webserver is started
  // before data is updated.
  scene_one()
})

// OSC SETUP
// Function to Find IP Address later used in OSC setup
var getIPAddresses = function () {
  var interfaces = os.networkInterfaces()
  var ipAddresses = []

  for (var deviceName in interfaces) {
    var addresses = interfaces[deviceName]
    for (var i = 0; i < addresses.length; i++) {
      var addressInfo = addresses[i]
      if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
        ipAddresses.push(addressInfo.address)
      }
    }
  }
  return ipAddresses
}
// Create an osc.js UDP Port listening on port 10023
var osc = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: 10024
})
console.log('OSC Sending over UDP')
console.log(' Host: ' + x32config.ip + ', Port: ' + x32config.port)
// events
osc.on('ready', function () {
  var ipAddresses = getIPAddresses()
  console.log('OSC Listening over UDP')
  ipAddresses.forEach(function (address) {
    console.log(' Host:' + address + ', Port:', osc.options.localPort)
  })
})
// Listen for incoming OSC bundles
osc.on('bundle', function (oscBundle) {
  console.log('OSC Bundle: ', oscBundle)
})
osc.on('message', function (oscMessage) {
  console.log('OSC Message: ', oscMessage)
})
osc.on('error', function (err) {
  console.log('OSC Error: ' + err)
})
// open sockets
osc.open()
// ask for x32 info, this isn't used but checks the desk is returning data
osc.send({
  address: '/info'
}, x32config.ip, x32config.port)
// Set X32 to return changes, x32 times out after 10s
setInterval(function () {
  osc.send({
    address: '/xcontrol'
  }, x32config.ip, x32config.port)
}, 8000)

// WEBSERVER SETUP
// find hostname and define port
var serverhostname = os.hostname()
var serverport = 80
// serves files in the public folder
app.use(express.static(__dirname + '/public'))
// called when the web server is requested
app.get('/', function (req, res) {
  // serves index.html in response
  res.sendFile(__dirname + '/public/index.html')
  console.log('index.html requested')
})
// starts web server on port 8888
http.listen(serverport, function () {
  var ipAddresses = getIPAddresses()
  console.log('Webserver listening on ' + serverhostname + ':' + serverport)
  console.log(' Host: ' + serverhostname + ', Port: ' + serverport)
  console.log(' Host: ' + ipAddresses + ', Port: ' + serverport)
})

// OMXPLAYER listen for responses
omxctrl.on('ended', function () {
  console.log('omxplayer: playback has ended')
  if (data.currentscene === 'Scene One: ' + data.scene_one.name) {
    console.log('returning to Scene One')
    scene_one()
  } else if (data.currentscene === 'Scene Two: ' + data.scene_two.name) {
    console.log('returning to Scene Two')
    scene_two()
  }
})

// BROWSER IO
// define interaction with clients
io.sockets.on('connection', function (socket) {
  // Give users a number

  usernum++
  // Find users ip address
  var clientaddress = socket.request.connection.remoteAddress
  var clienthostname = socket.request.connection.hostname

  // logs user connections
  console.log('user ' + usernum + ', connected from: ' + clientaddress + ' ' + clienthostname + ', connected using: ' + socket.conn.transport.name)
  // Send data when user connects

  socket.emit('data', data)
  // socket.emit('override', overrides)

  // Clock used to check data comms (can be disabled)
  // Once connection is established send date to client at interval
  var interval_date = setInterval(function () {
    // var now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
    var now = moment().format('DD-MM-YYYY HH:mm:ss')
    socket.emit('date', now)
  }, 1000)

  // Once connection is established send countdown timer
  // TEMP CODE
  var interval_countdown = setInterval(function () {
    var countdown = {
      'scene': 'none',
      'days': 0,
      'hours': 0,
      'minutes': 0,
      'seconds': 0
    }
    var then = 0

    // get the current time using moment
    var now = moment()

    // Generate moments for the next schedules
    var scene_one_schedule_next = moment(scene_one_schedule.next(1))
    var scene_two_schedule_next = moment(scene_two_schedule.next(1))
    var media_one_schedule_next = moment(media_one_schedule.next(1))
    var media_two_schedule_next = moment(media_two_schedule.next(1))
    // ms till event
    var scene_one_schedule_next_ms = scene_one_schedule_next.diff(now, 'milliseconds', true)
    var scene_two_schedule_next_ms = scene_two_schedule_next.diff(now, 'milliseconds', true)
    var media_one_schedule_next_ms = media_one_schedule_next.diff(now, 'milliseconds', true)
    var media_two_schedule_next_ms = media_two_schedule_next.diff(now, 'milliseconds', true)

    //  console.log(scene_one_schedule_next_ms + ', ' +
    //              scene_two_schedule_next_ms + ', ' +
    //              media_one_schedule_next_ms + ', ' +
    //              media_two_schedule_next_ms + ', '
    //  )

    // if x is less than y or x is less than z or x is less than f
    if (scene_one_schedule_next_ms < scene_two_schedule_next_ms && scene_one_schedule_next_ms < media_one_schedule_next_ms && scene_one_schedule_next_ms < media_two_schedule_next_ms) {
      then = scene_one_schedule_next
      countdown.scene = 'Scene One: ' + data.scene_one.name
    } else if (scene_two_schedule_next_ms < media_one_schedule_next_ms && scene_two_schedule_next_ms < media_two_schedule_next_ms) {
      then = scene_two_schedule_next
      countdown.scene = 'Scene Two: ' + data.scene_two.name
    } else if (media_one_schedule_next_ms < media_two_schedule_next_ms) {
      then = media_one_schedule_next
      countdown.scene = 'Media One: ' + data.media_one.name
    } else {
      then = media_two_schedule_next
      countdown.scene = 'Media Two: ' + data.media_two.name
    }

    // calculate the difference in milliseconds
    var ms = then.diff(now, 'milliseconds', true)
    // calculate the number of days to go
    countdown.days = math.floor(moment.duration(ms).asDays())
    // subtract from ms
    then = then.subtract(countdown.days, 'days')
    // update the duration of ms
    ms = then.diff(now, 'milliseconds', true)
    // calculate the number of hours to go
    countdown.hours = math.floor(moment.duration(ms).asHours())
    // subtract from ms
    then = then.subtract(countdown.hours, 'hours')
    // update the duration of ms
    ms = then.diff(now, 'milliseconds', true)
    // calculate the number of minutes to go
    countdown.minutes = math.floor(moment.duration(ms).asMinutes())
    // subtract from ms
    then = then.subtract(countdown.minutes, 'minutes')
    // update the duration of ms
    ms = then.diff(now, 'milliseconds', true)
    // calculate the number of seconds to go
    countdown.seconds = math.floor(moment.duration(ms).asSeconds())
    // send countdown object

    // console.log(countdown)

    socket.emit('countdown', countdown)
  }, 1000)

  // Waits for data
  socket.on('data', function (recieved_data) {
    data = recieved_data
    socket.broadcast.emit('data', data)
    console.log('Data Recieved')
    Write()
    Scene_update(function () {
      // send to this connection
      socket.emit('data', data)
      // send to all other connections, this is a bodge
      socket.broadcast.emit('data', data)
    })
  })

  // Waits for override
  socket.on('override', function (recieved_overrides) {
    overrides = recieved_overrides
    console.log('Overrides Recieved')
    if (overrides.scene === 'scene_one') {
      scene_one(function (clientcontent) {
        // send to this connection
        socket.emit('data', data)
        socket.emit('client', clientcontent)
        // send to all other connections, this is a bodge
        socket.broadcast.emit('data', data)
        socket.broadcast.emit('client', clientcontent)
      })
    } else if (overrides.scene === 'scene_two') {
      scene_two(function (clientcontent) {
        socket.emit('data', data)
        socket.emit('client', clientcontent)
        socket.broadcast.emit('data', data)
        socket.broadcast.emit('client', clientcontent)
      })
    } else if (overrides.scene === 'media_one') {
      media_one(function (clientcontent) {
        socket.emit('data', data)
        socket.emit('client', clientcontent)
        socket.broadcast.emit('data', data)
        socket.broadcast.emit('client', clientcontent)
      })
    } else if (overrides.scene === 'media_two') {
      media_two(function (clientcontent) {
        // socket.emit('data', data)
        // socket.emit('client', clientcontent)
        // socket.broadcast.emit('data', data)
        // socket.broadcast.emit('client', clientcontent)
      })
    } else {
      console.log('Error: Override failed')
    }
  })

  // On Disconnection
  socket.on('disconnect', function () {
    // Stop intervals
    clearInterval(interval_date)
    clearInterval(interval_countdown)
    // logs user disconnection
    console.log('user ' + usernum + ' disconnected')
  })
})

// Save Data and update local
function Write () {
  jsonfile.writeFile(file, data, function (err) {
    if (err !== null) {
      console.log(err)
      console.log('Database Write Failed')
    } else {
      console.log('Database Write Successful')
    }
  })
}

// Update Scene Schedule
function Scene_update (callback) {
  // Should probally check for changes and only restarted changed schedules

  // Clear Current Schedules
  scene_one_tick.clear()
  scene_two_tick.clear()
  media_one_tick.clear()
  media_two_tick.clear()

  console.log(' Schedules Cleared')

  // Update Occurances
  scene_one_occur = later.parse.recur().every(1).dayOfWeek().on(data.scene_one.schedule.start).time()
  scene_two_occur = later.parse.recur().every(1).dayOfWeek().on(data.scene_two.schedule.start).time()
  media_one_occur = later.parse.recur().every(1).dayOfWeek().on(data.media_one.schedule.start).time()
  media_two_occur = later.parse.recur().every(1).dayOfWeek().on(data.media_two.schedule.start).time()

  // Update Schedules
  scene_one_schedule = later.schedule(scene_one_occur)
  scene_two_schedule = later.schedule(scene_two_occur)
  media_one_schedule = later.schedule(media_one_occur)
  media_two_schedule = later.schedule(media_two_occur)

  console.log(' Schedules Updated')

  // Restart Schedules with Updated times
  scene_one_tick = later.setInterval(scene_one, scene_one_occur)
  console.log('scene_one_tick')
  scene_two_tick = later.setInterval(scene_two, scene_two_occur)
  media_one_tick = later.setInterval(media_one, media_one_occur)
  media_two_tick = later.setInterval(media_two, media_two_occur)

  console.log(' Schedules Started')

}

// Run Scenes when schedule fires
// var scene_one = function (callback) {
function scene_one (callback) {
  console.log('Scene One: ' + data.scene_one.name)
  // Set current Scene
  data.currentscene = 'Scene One: ' + data.scene_one.name

  var converted = {
    'DCA6': 0,
    'DCA7': 0,
    'MIX12': 0
  }
  converted.DCA6 = data.scene_one.x32.DCA6 * (1 / 1024)
  converted.DCA7 = data.scene_one.x32.DCA7 * (1 / 1024)
  converted.MIX12 = data.scene_one.x32.MIX12 * (1 / 1024)

  // Send fader positions to X32
  x32send(data.x32address, converted)

  // Sends html to client.html
  var clientcontent =
  '\
     <iframe id="risevision" src="http://preview.risevision.com/Viewer.html?type=presentation&id=72af8c57-b823-4288-ac64-04bd3bd640da">\
     </iframe>\
  '
  if (callback) {
    return callback(clientcontent)
  }
}

function scene_two (callback) {
  console.log('Scene Two: ' + data.scene_two.name)
  // Set current Scene
  data.currentscene = 'Scene Two: ' + data.scene_two.name

  var converted = {
    'DCA6': 0,
    'DCA7': 0,
    'MIX12': 0
  }
  converted.DCA6 = data.scene_two.x32.DCA6 * (1 / 1024)
  converted.DCA7 = data.scene_two.x32.DCA7 * (1 / 1024)
  converted.MIX12 = data.scene_two.x32.MIX12 * (1 / 1024)

  // Send fader positions to X32
  x32send(data.x32address, converted)

  // Sends html to client.html
  var clientcontent =
  '\
     <iframe id="risevision" src="http://preview.risevision.com/Viewer.html?type=presentation&id=72af8c57-b823-4288-ac64-04bd3bd640da">\
     </iframe>\
  '
  if (callback) {
    return callback(clientcontent)
  }
}

function media_one (callback) {
  console.log('Media One: ' + data.media_one.name)
  // Set current Media
  data.currentmedia = 'Media One: ' + data.media_one.name

  var converted = {
    'DCA6': 0,
    'DCA7': 0,
    'MIX12': 0
  }
  converted.DCA6 = data.media_one.x32.DCA6 * (1 / 1024)
  converted.DCA7 = data.media_one.x32.DCA7 * (1 / 1024)
  converted.MIX12 = data.media_one.x32.MIX12 * (1 / 1024)

  // Send fader positions to X32
  x32send(data.x32address, converted)

  // ADD AUDIO & VIDEO PLAYBACK HERE
  omxctrl.play('/home/pi/VineyardMediaController/public/media/Georgia-10-min.ogg')

  // Sends html to client.html
  var clientcontent =
  '\
  <iframe id="risevision" src="http://preview.risevision.com/Viewer.html?type=presentation&id=72af8c57-b823-4288-ac64-04bd3bd640da">\
  </iframe>\
    <div class="videoContainer">\
      <audio autoplay="">\
        <source src="http://RASPBERRYPI/media/Georgia-10-min.ogg" type="audio/ogg">\
        Audio Not Supported\
      </audio>\
    </div>\
  '

  if (callback) {
    return callback(clientcontent)
  }
}

function media_two (callback) {
  console.log('Media Two: ' + data.media_two.name)
  // Set current Media
  data.currentmedia = 'Media Two: ' + data.media_two.name

  var converted = {
    'DCA6': 0,
    'DCA7': 0,
    'MIX12': 0
  }
  converted.DCA6 = data.media_two.x32.DCA6 * (1 / 1024)
  converted.DCA7 = data.media_two.x32.DCA7 * (1 / 1024)
  converted.MIX12 = data.media_two.x32.MIX12 * (1 / 1024)

  // Send fader positions to X32
  x32send(data.x32address, converted)

  // ADD AUDIO & VIDEO PLAYBACK HERE
  omxctrl.play('/home/pi/VineyardMediaController/public/media/WtE-Countdown-v3-720p_2_SHORT.mp4')

  // Sends html to client.html
  // Sends html to client.html
  var clientcontent =
  '\
    <div class="videoContainer">\
      <video autoplay="">\
        <source src="http://RASPBERRYPI/media/WtE-Countdown-v3-720p_2.mp4" type="video/mp4">\
        Video Not Supported\
      </video>\
    </div>\
  '
  //io.emit('data', data)
  //io.emit('client', clientcontent)
  //io.broadcast.emit('data', data)
  //io.broadcast.emit('client', clientcontent)

  if (callback) {
    callback(clientcontent)
  }
}

// Send OSC data called when scenes run
function x32send (address, values) {
  // fade faders over a 2sec
  var time = 2000            // ms
  var rate = 30              // number of sends per second
  var delay = 1000 / rate      // time between sends ms
  var num = (rate / 1000) * time // total number of steps
  var n = 0                  // counter
  var inc = {                 // increments
    DCA6: 0,
    DCA7: 0,
    MIX12: 0
  }

  console.log(' Fading DCA6 from ' + current.DCA6 + ' to ' + values.DCA6)
  console.log(' Fading DCA7 from ' + current.DCA7 + ' to ' + values.DCA7)
  console.log(' Fading MIX12 from ' + current.MIX12 + ' to ' + values.MIX12)

  // calculate the increment to move the fader
  inc.DCA6 = (current.DCA6 - values.DCA6) / num
  inc.DCA7 = (current.DCA7 - values.DCA7) / num
  inc.MIX12 = (current.MIX12 - values.MIX12) / num

  async.whilst(
      function () {return n < num + 1},
      function (callback) {
        var fader_DCA6 = current.DCA6 - (n * inc.DCA6)
        osc.send({
          address: address.DCA6,
          args: fader_DCA6
        }, x32config.ip, x32config.port)

        var fader_DCA7 = current.DCA7 - (n * inc.DCA7)
        osc.send({
          address: address.DCA7,
          args: fader_DCA7
        }, x32config.ip, x32config.port)

        var fader_MIX12 = current.MIX12 - (n * inc.MIX12)
        osc.send({
          address: address.MIX12,
          args: fader_MIX12
        }, x32config.ip, x32config.port)

        // console.log(n)
        n++
        setTimeout(callback, delay)
      },
      function (err) {
        if (err) {
          throw (err)
        }
        console.log(' Fade complete')
        // These must be placed in here otherwise node will execute them
        // between the setTimeout delay as it is async.
        current.DCA6 = values.DCA6
        current.DCA7 = values.DCA7
        current.MIX12 = values.MIX12
      }
  )
}

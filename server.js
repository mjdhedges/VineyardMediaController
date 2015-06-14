//External Modules
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var later = require('later');
var moment = require('moment');
var math = require('mathjs');
var async = require('async');
var osc = require('osc');

//Varibles
var usernum = 0;

//JSON Varibles
//defined scenes, for each sense define settings
var data = {
  "scene_one": {
		"schedule": {
			"start": "9:20:00",
		},
		"x32":{
			"DCA6": 700,
			"DCA7": 0,
			"MIX12": 420,
		},
		"file": "Audio_1",
	},
	"scene_two": {
    "schedule": {
			"start": "9:21:00",
		},
		"x32":{
			"DCA6": 0,
			"DCA7": 350,
			"MIX12": 400,
		},
		"file": "None",
	},
	"scene_three": {
    "schedule": {
			"start": "9:28:00",
		},
		"x32":{
			"DCA6": 700,
			"DCA7": 0,
			"MIX12": 420,
		},
		"file": "Video_1",
	},
	"scene_four": {
    "schedule": {
			"start": "9:30:00",
		},
		"x32":{
			"DCA6": 0,
			"DCA7": 0,
			"MIX12": 250,
		},
		"file": "None",
	},
  "x32address": {
    "DCA6": "/dca/6/fader",
    "DCA7": "/dca/7/fader",
    "MIX12": "/bus/12/mix/fader",
  }
};

var overrides = {
  "x32": {
    "MIX12": 0,
  },
  "scene": "scene_one",
};

var x32config = {
  "ip": "127.0.0.1",
  "port": 10023,
};

//on boot need to ask the x32 for these values
var current = {
  "DCA6": 0.5,
  "DCA7": 0,
  "MIX12": 0.5,
};

//Scheduling using Later.js
//Initialise Occurances using saved data
var Scene_one_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_one.schedule.start).time();
var Scene_two_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_two.schedule.start).time();
var Scene_three_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_three.schedule.start).time();
var Scene_four_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_four.schedule.start).time();
//Create Schedules for use by countdown timer
var Scene_one_schedule = later.schedule(Scene_one_occur);
var Scene_two_schedule = later.schedule(Scene_two_occur);
var Scene_three_schedule = later.schedule(Scene_three_occur);
var Scene_four_schedule = later.schedule(Scene_four_occur);
//Start Occurances
var Scene_one_tick = later.setInterval(Scene_one, Scene_one_occur);
var Scene_two_tick = later.setInterval(Scene_two, Scene_two_occur);
var Scene_three_tick = later.setInterval(Scene_three, Scene_three_occur);
var Scene_four_tick = later.setInterval(Scene_four, Scene_four_occur);

//OSC SETUP
//Create an osc.js UDP Port listening on port 10023
var osc = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 10024
});
console.log("OSC Client sending to " + x32config.ip + ":" + x32config.port);

//Open the socket
osc.open();
console.log("OSC Server Listening on " + "0.0.0.0:" + x32config.port);
//Set X32 to return changes, times out after 10s
setInterval(function(){
  osc.send({
    address: "/info"
  }, x32config.ip, x32config.port);
}, 5000);

//Listen for incoming OSC bundles
osc.on("bundle", function(oscBundle) {
  console.log("An OSC bundle just arrived!", oscBundle);
});

//WEBSERVER SETUP
//serves files in the public folder
app.use(express.static(__dirname + '/public'));
//called when the web server is requested
app.get('/', function(req, res){
	//serves index.html in response
	res.sendFile(__dirname + '/public/index.html');
	console.log('index.html requested');
});
//starts web server on port 8888
http.listen(8888, function(){
	console.log('webserver listening on *:8888');
});

//BROWSER IO
//define interaction with clients
io.sockets.on('connection', function(socket){
  //Give users a number
  usernum++;

	//logs user connections
	console.log('user ' + usernum + ' connected using: ' + socket.conn.transport.name);
	//Send data when user connects

	socket.emit('data', data);
  //socket.emit('override', overrides);

	//Clock used to check data comms (can be disabled)
  //Once connection is established send date to client at interval
  var interval_date = setInterval(function(){
			var now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      socket.emit('date', now);
  }, 1000);

  //Once connection is established send countdown timer
  //Time has to be converted to Hr/mins/sec every time
  var interval_countdown = setInterval(function(){
      var countdown = {
        'scene': "none",
        'days': 0,
        'hours': 0,
        'minutes': 0,
        'seconds': 0,
      };
      var then = 0;

      //get the current time using moment
      var now = moment();

      //Generate moments for the next schedules
      var Scene_one_schedule_next = moment(Scene_one_schedule.next(1));
      var Scene_two_schedule_next = moment(Scene_two_schedule.next(1));
      var Scene_three_schedule_next = moment(Scene_three_schedule.next(1));
      var Scene_four_schedule_next = moment(Scene_four_schedule.next(1));

      //ms till event
      var Scene_one_schedule_next_ms = Scene_one_schedule_next.diff(now, 'milliseconds', true);
      var Scene_two_schedule_next_ms = Scene_two_schedule_next.diff(now, 'milliseconds', true);
      var Scene_three_schedule_next_ms = Scene_three_schedule_next.diff(now, 'milliseconds', true);
      var Scene_four_schedule_next_ms = Scene_four_schedule_next.diff(now, 'milliseconds', true);

      // console.log(Scene_one_schedule_next_ms + ", " +
      //             Scene_two_schedule_next_ms + ", " +
      //             Scene_three_schedule_next_ms + ", " +
      //             Scene_four_schedule_next_ms + ", "
      // );

      //Finds which scene is next
      //if x is less than y or x is less than z or x is less than f
      if(Scene_one_schedule_next_ms < Scene_two_schedule_next_ms && Scene_one_schedule_next_ms < Scene_three_schedule_next_ms && Scene_one_schedule_next_ms < Scene_four_schedule_next_ms){
        then = Scene_one_schedule_next;
        countdown.scene = "Scene One";
      } else if (Scene_two_schedule_next_ms < Scene_three_schedule_next_ms && Scene_two_schedule_next_ms < Scene_four_schedule_next_ms){
        then = Scene_two_schedule_next;
        countdown.scene = "Scene Two";
      } else if (Scene_three_schedule_next_ms < Scene_four_schedule_next_ms){
        then = Scene_three_schedule_next;
        countdown.scene = "Scene Three";
      } else {
        then = Scene_four_schedule_next;
        countdown.scene = "Scene Four";
      }

      //calculate the difference in milliseconds
      var ms = then.diff(now, 'milliseconds', true);
      //calculate the number of days to go
      countdown.days = math.floor(moment.duration(ms).asDays());
      //subtract from ms
      then = then.subtract(countdown.days, 'days');
      //update the duration of ms
      ms = then.diff(now, 'milliseconds', true);
      //calculate the number of hours to go
      countdown.hours = math.floor(moment.duration(ms).asHours());
      //subtract from ms
      then = then.subtract(countdown.hours, 'hours');
      //update the duration of ms
      ms = then.diff(now, 'milliseconds', true);
      //calculate the number of minutes to go
      countdown.minutes = math.floor(moment.duration(ms).asMinutes());
      //subtract from ms
      then = then.subtract(countdown.minutes, 'minutes');
      //update the duration of ms
      ms = then.diff(now, 'milliseconds', true);
      //calculate the number of seconds to go
      countdown.seconds = math.floor(moment.duration(ms).asSeconds());
      //send countdown object

      //console.log(countdown);

      socket.emit('countdown', countdown);
  }, 1000);

  //On Disconnection
  socket.on('disconnect', function(){
    //Stop intervals
    clearInterval(interval_date);
    clearInterval(interval_countdown);
		//logs user disconnection
	  console.log('user ' + usernum + ' disconnected');
  });
});

//Run Scenes when schedule fires
function Scene_one(){
  console.log("Scene One");

  var converted = {
    "DCA6": 0,
    "DCA7": 0,
    "MIX12": 0,
  };
  converted.DCA6 = data.scene_one.x32.DCA6 * (1/1024);
  converted.DCA7 = data.scene_one.x32.DCA7 * (1/1024);
  converted.MIX12 = data.scene_one.x32.MIX12 * (1/1024);

  //Send fader positions to X32
  x32send(data.x32address, converted);

  //ADD AUDIO & VIDEO PLAYBACK HERE
}

function Scene_two(){
  console.log("Scene Two");

  var converted = {
    "DCA6": 0,
    "DCA7": 0,
    "MIX12": 0,
  };
  converted.DCA6 = data.scene_two.x32.DCA6 * (1/1024);
  converted.DCA7 = data.scene_two.x32.DCA7 * (1/1024);
  converted.MIX12 = data.scene_two.x32.MIX12 * (1/1024);

  //Send fader positions to X32
  x32send(data.x32address, converted);

  //ADD AUDIO & VIDEO PLAYBACK HERE
}

function Scene_three(){
  console.log("Scene Three");

  var converted = {
    "DCA6": 0,
    "DCA7": 0,
    "MIX12": 0,
  };
  converted.DCA6 = data.scene_three.x32.DCA6 * (1/1024);
  converted.DCA7 = data.scene_three.x32.DCA7 * (1/1024);
  converted.MIX12 = data.scene_three.x32.MIX12 * (1/1024);

  //Send fader positions to X32
  x32send(data.x32address, converted);

  //ADD AUDIO & VIDEO PLAYBACK HERE
}

function Scene_four(){
  console.log("Scene Four");

  var converted = {
    "DCA6": 0,
    "DCA7": 0,
    "MIX12": 0,
  };
  converted.DCA6 = data.scene_four.x32.DCA6 * (1/1024);
  converted.DCA7 = data.scene_four.x32.DCA7 * (1/1024);
  converted.MIX12 = data.scene_four.x32.MIX12 * (1/1024);

  //Send fader positions to X32
  x32send(data.x32address, converted);

  //ADD AUDIO & VIDEO PLAYBACK HERE
}

//Send OSC data called when scenes run
function x32send(address, values) {
  //fade faders over a 2sec
  var time = 2000;            //ms
  var rate = 20;              //number of sends per second
  var delay = 1000/rate;      //time between sends ms
  var num = (rate/1000)*time; //total number of steps
  var n = 0;                  //counter
  var inc = {                 //increments
    DCA6: 0,
    DCA7: 0,
    MIX12: 0,
  };

  console.log(" Fading DCA6 from " + current.DCA6 + " to " + values.DCA6);
  console.log(" Fading DCA7 from " + current.DCA7 + " to " + values.DCA7);
  console.log(" Fading MIX12 from " + current.MIX12 + " to " + values.MIX12);

  //calculate the increment to move the fader
  inc.DCA6 = (current.DCA6-values.DCA6)/num;
  inc.DCA7 = (current.DCA7-values.DCA7)/num;
  inc.MIX12 = (current.MIX12-values.MIX12)/num;

  async.whilst(
      function () {return n < num+1;},
      function (callback) {
        var fader_DCA6 = current.DCA6-(n*inc.DCA6);
        osc.send({
          address: address.DCA6,
          args: fader_DCA6,
        }, x32config.ip, x32config.port);

        var fader_DCA7 = current.DCA7-(n *inc.DCA7);
        osc.send({
          address: address.DCA7,
          args: fader_DCA7,
        }, x32config.ip, x32config.port);

        var fader_MIX12 = current.MIX12-(n *inc.MIX12);
        osc.send({
          address: address.MIX12,
          args: fader_MIX12,
        }, x32config.ip, x32config.port);

        //console.log(n);
        n++;
        setTimeout(callback, delay);
      },
      function (err) {
        console.log(" Fade complete");
        //These must be placed in here otherwise the node will execute them
        //between the setTimeout delay as it is async.
        current.DCA6 = values.DCA6;
        current.DCA7 = values.DCA7;
        current.MIX12 = values.MIX12;
      }
  );
}

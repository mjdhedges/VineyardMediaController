//External Modules
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var later = require('later');
var osc = require('node-osc');
var moment = require('moment');
var math = require('mathjs');

//Internal Modules
var convert = require('./convert.js');

//Varibles
var usernum = 0;

//JSON Varibles
//defined scenes, for each sense define settings
//this will not save data if the server is restarted!!!
//MUST BE CONVERTED TO DATABASE!!
var data = {
  "scene_one": {
		"schedule": {
			"start": "10:20:00",
		},
		"x32":{
			"DCA6": 512,
			"DCA7": 0,
			"MIX12": 512,
		},
		"file": "Audio_1",
	},
	"scene_two": {
    "schedule": {
			"start": "10:21:00",
		},
		"x32":{
			"DCA6": 0,
			"DCA7": 512,
			"MIX12": 124,
		},
		"file": "None",
	},
	"scene_three": {
    "schedule": {
			"start": "10:28:00",
		},
		"x32":{
			"DCA6": 512,
			"DCA7": 0,
			"MIX12": 512,
		},
		"file": "Video_1",
	},
	"scene_four": {
    "schedule": {
			"start": "10:30:00",
		},
		"x32":{
			"DCA6": 0,
			"DCA7": 0,
			"MIX12": 124,
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
  "ip": "192.168.0.12",
  "port": 10023,
};

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

//x32 SETUP
var oscclient = new osc.Client(x32config.ip, x32config.port);
console.log("x32 Config: " + x32config.ip + ", " + x32config.port);

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
  //TEMP CODE
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

      //if x is less than y or x is less than z or x is less than f
      if(Scene_one_schedule_next_ms < Scene_two_schedule_next_ms && Scene_one_schedule_next_ms < Scene_three_schedule_next_ms && Scene_one_schedule_next_ms < Scene_four_schedule_next_ms){
        then = Scene_one_schedule_next;
        countdown.scene = "Scene One";
      } else if (Scene_two_schedule_next_ms < Scene_three_schedule_next_ms && Scene_two_schedule_next_ms < Scene_four_schedule_next_ms){
        then = Scene_two_schedule_next;
        countdown.scene = "Scene Two";
      } else if (Scene_three_schedule_next_ms < Scene_four_schedule_next_ms){
        then = Scene_three_schedule_next;
        countdown.scene = "Scene three";
      } else {
        then = Scene_four_schedule_next;
        countdown.scene = "Scene four";
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

	//Waits for data
  socket.on('data', function(recieved_data){
    data = recieved_data;
    socket.broadcast.emit('data', data);
    console.log("Data Recieved");
    Scene_update();
  });

  //Waits for override
  socket.on('override', function(recieved_overrides){
    overrides = recieved_overrides;
    socket.broadcast.emit('override', overrides);
    console.log(overrides);
  });

  //On Disconnection
  socket.on('disconnect', function(){
    //Stop intervals
    clearInterval(interval_date);
    clearInterval(interval_countdown);
		//logs user disconnection
	  console.log('user ' + usernum + ' disconnected');
  });
});

//Update Scene Schedule
function Scene_update() {
  //Should probally check for changes and only restarted changed schedules

  //Clear Current Schedules
  Scene_one_tick.clear();
  Scene_two_tick.clear();
  Scene_three_tick.clear();
  Scene_four_tick.clear();

  console.log(" Schedules Cleared");

  //Update Occurances
  Scene_one_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_one.schedule.start).time();
  Scene_two_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_two.schedule.start).time();
  Scene_three_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_three.schedule.start).time();
  Scene_four_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_four.schedule.start).time();

  //Update Schedules
  Scene_one_schedule = later.schedule(Scene_one_occur);
  Scene_two_schedule = later.schedule(Scene_two_occur);
  Scene_three_schedule = later.schedule(Scene_three_occur);
  Scene_four_schedule = later.schedule(Scene_four_occur);

  console.log(" Schedules Updated");

  //Restart Schedules with Updated times
  Scene_one_tick = later.setInterval(Scene_one, Scene_one_occur);
  Scene_two_tick = later.setInterval(Scene_two, Scene_two_occur);
  Scene_three_tick = later.setInterval(Scene_three, Scene_three_occur);
  Scene_four_tick = later.setInterval(Scene_four, Scene_four_occur);

  console.log(" Schedules Started");

}

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

  //Sends data in JSON with corresponding addresses
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

  x32send(data.x32address, converted);

  //ADD AUDIO & VIDEO PLAYBACK HERE
}

//Send OSC data called when scenes run
function x32send(addresses, values) {

  oscclient.send(addresses.DCA6, values.DCA6);
  console.log(" x32 Send: " + addresses.DCA6 + ", " + values.DCA6);

  oscclient.send(addresses.DCA7, values.DCA7);
  console.log(" x32 Send: " + addresses.DCA7 + ", " + values.DCA7);

  oscclient.send(addresses.MIX12, values.MIX12);
  console.log(" x32 Send: " + addresses.MIX12 + ", " + values.MIX12);
}

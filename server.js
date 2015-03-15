//External Modules
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var later = require('later');
var osc = require('node-osc');

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
			"start": "10:22:00",
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
//Initialise schedules using saved data
var Scene_one_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_one.schedule.start).time();
var Scene_two_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_two.schedule.start).time();
var Scene_three_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_three.schedule.start).time();
var Scene_four_occur = later.parse.recur().on(1).dayOfWeek().on(data.scene_four.schedule.start).time();
//Start Schedules
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
  setInterval(function(){
			var now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      socket.emit('date', now);
  }, 1000);

  //Once connection is established send countdown timer
  //TEMP CODE
  setInterval(function(){
      var now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      var countdown = now;
      //var Scene_one_schedule = later.schedule(Scene_one_occur);
      //console.log(Scene_one_schedule.next(1));
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

  //Update Schedules
  Scene_one_occur = later.parse.recur().every(0).dayOfWeek().on(data.scene_one.schedule.start).time();
  Scene_two_occur = later.parse.recur().every(0).dayOfWeek().on(data.scene_two.schedule.start).time();
  Scene_three_occur = later.parse.recur().every(0).dayOfWeek().on(data.scene_three.schedule.start).time();
  Scene_four_occur = later.parse.recur().every(0).dayOfWeek().on(data.scene_four.schedule.start).time();

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
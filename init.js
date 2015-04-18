//This file is used to initialise the first JSON files.
//Run when the application is first run.
var jf = require('jsonfile');

var file = './db/data.json';

var data = {
  "scene_one": {
		"schedule": {
			"start": "10:20:00",
		},
		"x32":{
			"DCA6": 700,
			"DCA7": 0,
			"MIX12": 450,
		},
		"file": "Audio_1",
	},
	"scene_two": {
    "schedule": {
			"start": "10:21:00",
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
			"start": "10:28:00",
		},
		"x32":{
			"DCA6": 700,
			"DCA7": 0,
			"MIX12": 450,
		},
		"file": "Video_1",
	},
	"scene_four": {
    "schedule": {
			"start": "10:30:00",
		},
		"x32":{
			"DCA6": 0,
			"DCA7": 300,
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

var db;
db.data = data;

jf.writeFile(file, db, function(err) {
  if (err !== null) {
    console.log(err);
    console.log('Initialisation failed');
  } else {
    console.log('Initialisation complete');
  }
});

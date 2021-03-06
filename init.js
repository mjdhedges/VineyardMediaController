// This file is used to initialise the first JSON files.
// Run when the application is first run.
var jsonfile = require('jsonfile')

var file = './db/data.json'

var data = {
  'currentscene': 'Not Initialised',
  'currentmedia': 'Not Initialised',
  'scene_one': {
    'name': 'Welcome',
    'schedule': {
      'start': '15:20:00'
    },
    'x32': {
      'DCA6': 700,
      'DCA7': 0,
      'MIX12': 420
    }
  },
  'scene_two': {
    'name': 'Service',
    'schedule': {
      'start': '15:30:00'
    },
    'x32': {
      'DCA6': 0,
      'DCA7': 350,
      'MIX12': 400
    }
  },
  'media_one': {
    'name': 'Announcement',
    'schedule': {
      'start': '15:21:00'
    },
    'x32': {
      'DCA6': 700,
      'DCA7': 0,
      'MIX12': 420
    },
    'file': 'Video_1'
  },
  'media_two': {
    'name': 'Countdown',
    'schedule': {
      'start': '15:25:00'
    },
    'x32': {
      'DCA6': 0,
      'DCA7': 0,
      'MIX12': 250
    },
    'file': 'None'
  },
  'x32address': {
    'DCA6': '/dca/6/fader',
    'DCA7': '/dca/7/fader',
    'MIX12': '/bus/12/mix/fader'
  }
}

jsonfile.writeFile(file, data, function (err) {
  if (err !== null) {
    console.log(err)
    console.log('Initialisation failed')
  } else {
    console.log('Initialisation complete')
  }
})

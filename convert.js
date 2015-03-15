
var numsteps = 0;
var stepsize = 0;
var fader = 0;


//DOES NOT WORK!!!!
function dBtofader(dB) {
  //fader has 1024 values between 0 and 1
  var fader = 0;

  if (dB < -90) {
    //-inf = 0.0
    fader = 0;
    return fader;

  } else if (dB < -60) {
    //			=
    //-90dB = 0.0
    //-60dB = 0.0625
    // (1/1024)/0.0625 = 64 steps
    numsteps = 0.0625/(1/1024);
    stepsize = (90 - 60)/numsteps;
    fader = dB * stepsize;
    return fader;

  } else if (dB < -30) {
    //-60dB = 0.0625
    //-30dB = 0.25
    numsteps = (0.25-0.0625)/(1/1024);
    stepsize = (60 - 30)/numsteps;
    fader = dB * stepsize;
    return fader;

  } else if (dB < -10) {
    //-30dB = 0.25
    //-10dB = 0.5
    numsteps = (0.5-0.25)/(1/1024);
    stepsize = (30 - 10)/numsteps;
    fader = dB * stepsize;
    return fader;

  } else if (dB < 10) {
    //-10 = 0.5
    //+10 = 1.0
    numsteps = (1-0.5)/(1/1024);
    stepsize = (+10 + 10)/numsteps;
    fader = dB * stepsize;
    return fader;

  } else if (dB > 10) {
    //+10dB or more = 1.0
    return 1.0;
  }
}

exports.dBtofader = dBtofader;

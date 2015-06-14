/*global $:false, document:false, io:false*/
var socket = io.connect();

//Initialise scripts on page initiasation not on 'ready' as with JQuery
$(document).on('pageinit', function(){
	//Connection
	socket.on('connect', function() {
		$(':mobile-pagecontainer').pagecontainer('change', '#page_home', {
      //transition: 'flip',
      //changeHash: false,
      //reverse: true,
      //showLoadMsg: true
    });
	});

	//Recieve date from server and update GUI
	socket.on('date', function(date){
		$('#date_home').text("Server Time: " + date);
		$('#date_settings').text("Server Time: " + date);
	});

	//Recieve countdown from server and update GUI
	socket.on('countdown', function(countdown){
		$('#countdown').text(
			countdown.scene + ": " +
			countdown.days + " days " +
			countdown.hours + " hours " +
			countdown.minutes + " minutes " +
			countdown.seconds + " seconds"
		);
	});

	//Disconnect
	socket.on('disconnect', function() {
		$(':mobile-pagecontainer').pagecontainer('change', '#page_connectionlost', {
			//transition: 'flip',
			//changeHash: false,
			//reverse: true,
			//showLoadMsg: true
		});
	});

});

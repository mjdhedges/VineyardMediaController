/*global $:false, document:false, io:false*/
var socket = io.connect();

//data is initialised empty, on first connection with server this will be filled.
var data = {};
var overrides = {};

//run whenever the settings page needs to be updated
//Updates GUI
function page_settings_update() {
	//Code aborts if refresh is called when html does not exist (home page)
	if($.mobile.activePage.attr("id") == "page_settings"){
		var scene = $("#scene option:selected").val();
		$("#Scene_start").val(data[scene].schedule.start);
		$("#slider_DCA6").val(data[scene].x32.DCA6).slider('refresh');
		$("#slider_DCA7").val(data[scene].x32.DCA7).slider('refresh');
		$("#slider_MIX12").val(data[scene].x32.MIX12).slider('refresh');
		$('#file').val(data[scene].file).selectmenu('refresh');
	}
}

//refreshes the sliders on pages changes if they are shown
//may not be the most eligant solution, there is a small delay as the
//previous position is shown for half a second before it is updated
$(document).on('pageshow', function(){
	page_settings_update();
});

//Initialise scripts on page initiasation not on 'ready' as with JQuery
$(document).on('pageinit', function(){

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

	//Recieve Data updates from server and update GUI
	socket.on('data', function(recieved_data){
		data = recieved_data;
		page_settings_update();
	});

	//Recieve overrides updates from server and update GUI
	socket.on('override', function(recieved_data){
		overrides = recieved_data;
		$("#slider_MIX12_override").val(overrides.x32.MIX12).slider('refresh');
	});

	//Monitor changes to update GUI
	$("#scene").bind( "change", function(event, ui) {
		page_settings_update();
	});

	//Each option on the page is monitored
	$("#Scene_start").change(function() {
		var scene = $("#scene option:selected").val();
		var time = $(this).val();
		//Error Handling: Check if time is in the right format
		// + still works as it creates a valid number
		if (
			time.length <= 8 &&
			time.charAt(2) === ":" &&
			time.charAt(5) === ":" &&
			time.slice(0,2).valueOf() <= 23 &&
			time.slice(0,2).valueOf() >= 0 &&
			time.slice(3,5).valueOf() <= 59 &&
			time.slice(3,5).valueOf() >= 0 &&
			time.slice(6,8).valueOf() <= 59 &&
			time.slice(6,8).valueOf() >= 0
		) {
			data[scene].schedule.start = time;
			socket.emit("data", data);
		} else {
			alert("Incorrect Format: Star Time should be in HH:MM:SS");
			//Reset Time to current database value
			$("#Scene_start").val(data[scene].schedule.start);
		}
	});
	$("#slider_DCA6").on('slidestop', function( event ) {
		var scene = $("#scene option:selected").val();
		data[scene].x32.DCA6 = $(this).slider().val();
		socket.emit("data", data);
	});
	$("#slider_DCA7").on('slidestop', function( event ) {
		var scene = $("#scene option:selected").val();
		data[scene].x32.DCA7 = $(this).slider().val();
		socket.emit("data", data);
	});
	$("#slider_MIX12").on('slidestop', function( event ) {
		var scene = $("#scene option:selected").val();
		data[scene].x32.MIX12 = $(this).slider().val();
		socket.emit("data", data);
	});
	$("#file").bind( "change", function(event, ui) {
		var scene = $("#scene option:selected").val();
		data[scene].file = $("#file option:selected").val();
		socket.emit("data", data);
	});

	//Override Slider MIX12
	$("#slider_MIX12_override").on('slidestop', function( event ) {
		overrides.x32.MIX12 = $(this).slider().val();
		socket.emit("override", overrides);
	});

});

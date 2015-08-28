/*global $:false, document:false, io:false*/
var socket = io.connect()

// data is initialised empty, on first connection with server this will be filled.
var data = {}
var overrides = {}

// run whenever the settings page needs to be updated
// Updates GUI
function page_settings_update () {
  // Code aborts if refresh is called when html does not exist (home page)
  if($.mobile.activePage.attr('id') == 'page_settings') {
    //var options = "<option value='scene_one'> Scene One: " + data.scene_one.name + "</option>"
    //$('#scene').find('option').remove().end().append($(options));

    var scene = $('#scene option:selected').val()
    $('#Scene_name').val(data[scene].name)
    $('#Scene_start').val(data[scene].schedule.start)
    $('#slider_DCA6').val(data[scene].x32.DCA6).slider('refresh')
    $('#slider_DCA7').val(data[scene].x32.DCA7).slider('refresh')
    $('#slider_MIX12').val(data[scene].x32.MIX12).slider('refresh')
    $('#file').val(data[scene].file).selectmenu('refresh')
  }
}

// refreshes the sliders on pages changes if they are shown
// may not be the most eligant solution, there is a small delay as the
// previous position is shown for half a second before it is updated
$(document).on('pageshow', function () {
  page_settings_update()
})

// Initialise scripts on page initiasation not on 'ready' as with JQuery
$(document).on('pageinit', function () {
  // Connection
  socket.on('connect', function () {
    $(':mobile-pagecontainer').pagecontainer('change', '#page_home', {
      // transition: 'flip',
      // changeHash: false,
      // reverse: true,
      // showLoadMsg: true
    })
  })

  // Recieve date from server and update GUI
  socket.on('date', function (date) {
    $('#date_home').text('Server Time: ' + date)
    $('#date_settings').text('Server Time: ' + date)
  })

  // Recieve countdown from server and update GUI
  socket.on('countdown', function (countdown) {
    $('#countdown_name').text(countdown.scene)
    $('#countdown_time').text(
      countdown.days + ' days ' +
      countdown.hours + ' hours ' +
      countdown.minutes + ' minutes ' +
      countdown.seconds + ' seconds'
    )
  })

  // Recieve Data updates from server and update GUI
  socket.on('data', function (recieved_data) {
    data = recieved_data
    page_settings_update()
  })

  // Recieve overrides updates from server and update GUI
  socket.on('override', function (recieved_data) {
    overrides = recieved_data
    $('#slider_MIX12_override').val(overrides.x32.MIX12).slider('refresh')
  })

  // Disconnect
  socket.on('disconnect', function () {
    $(':mobile-pagecontainer').pagecontainer('change', '#page_connectionlost', {
      // transition: 'flip',
      // changeHash: false,
      // reverse: true,
      // showLoadMsg: true
    })
  })

  // Monitor changes to update GUI
  $('#scene').bind('change', function (event, ui) {
    page_settings_update()
  })

  // Each option on the page is monitored
  $('#Scene_name').change(function () {
    var scene = $('#scene option:selected').val()
    data[scene].name = $(this).val()
    socket.emit('data', data)
  })
  $('#Scene_start').change(function () {
    var scene = $('#scene option:selected').val()
    data[scene].schedule.start = $(this).val()
    socket.emit('data', data)
  })
  $('#slider_DCA6').on('slidestop', function (event) {
    var scene = $('#scene option:selected').val()
    data[scene].x32.DCA6 = $(this).slider().val()
    socket.emit('data', data)
  })
  $('#slider_DCA7').on('slidestop', function (event) {
    var scene = $('#scene option:selected').val()
    data[scene].x32.DCA7 = $(this).slider().val()
    socket.emit('data', data)
  })
  $('#slider_MIX12').on('slidestop', function (event) {
    var scene = $('#scene option:selected').val()
    data[scene].x32.MIX12 = $(this).slider().val()
    socket.emit('data', data)
  })
  $('#file').bind('change', function (event, ui) {
    var scene = $('#scene option:selected').val()
    data[scene].file = $('#file option:selected').val()
    socket.emit('data', data)
  })

  // Override Slider MIX12
  $('#slider_MIX12_override').on('slidestop', function (event) {
    overrides.x32.MIX12 = $(this).slider().val()
    socket.emit('override', overrides)
  })

  // Override Buttons
  $('#button_scene_one').on('click', function () {
    overrides.scene = 'scene_one'
    socket.emit('override', overrides)
  })
  $('#button_scene_two').on('click', function () {
    overrides.scene = 'scene_two'
    socket.emit('override', overrides)
  })
  $('#button_media_one').on('click', function () {
    overrides.scene = 'media_one'
    socket.emit('override', overrides)
  })
  $('#button_media_two').on('click', function () {
    overrides.scene = 'media_two'
    socket.emit('override', overrides)
  })

})

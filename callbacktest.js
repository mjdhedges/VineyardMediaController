console.log('started')

some_function(5, 15, function (num) {
  console.log('Callback Called! ' + num)
})

function some_function (arg1, arg2, callback) {
  var my_number = arg1 + arg2
  setTimeout(function () {
    callback(my_number)
  }, 1000)
}

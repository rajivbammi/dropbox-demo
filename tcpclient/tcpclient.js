let rimraf = require('rimraf')
let mkdirp = require('mkdirp')
let fs = require('fs')
let path = require('path')
let morgan = require('morgan')
require('longjohn');

var EventEmitter = require('events').EventEmitter;
var event_emitter = new EventEmitter();

var net = require('net'),
    JsonSocket = require('json-socket');

require('songbird')

var port = 8001; //The same port that the server is listening on
var host = '127.0.0.1';
var socket = new JsonSocket(new net.Socket()); //Decorate a standard net.Socket with JsonSocket
console.log("connecting to port 8001")
socket.connect(port, host);
socket.on('connect', function() { //Don't send until we're connected
    socket.sendMessage({a: 5, b: 7});
    socket.on('message', function(message) {
        //console.log('The result is: '+ message.result);
        var result = message.result
        console.log('Action=>'+result.action+' Path=>'+result.path+' Type=>' +result.type)
        event_emitter.emit('dirEvent', {'result':result})
    });
});

event_emitter.on('dirEvent', function(response) {
  console.log('Received event - direvent ', response.result)
  
  let result = response.result
  let filePath = result.path
  let hasExt = path.extname(filePath) !== ''
  let isDir = response.type == 'dir'
  //console.log('******* Printing results1 *******', result.action)
 
  if (result.action == 'write') { 
    //console.log('******* Printing results4 *******', result.action)
    async() => {
      console.log("***** Creating... **** ", filePath)
      if (isDir) await mkdirp.promise(filePath)
      else {
        fs.createWriteStream(filePath)
      }
      }()
  } else if (result.action == 'delete') { 
    //console.log('******* Printing results5 *******', result.action)
    async() => {
      console.log("***** Deleting... **** ", filePath)
      if (isDir) await rimraf.promise(filePath)
      else {
        await fs.promise.unlink(filePath)
      }
      }()
  }
});

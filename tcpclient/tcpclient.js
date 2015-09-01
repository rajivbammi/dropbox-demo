let fs = require('fs')
let rimraf = require('rimraf')
let path = require('path')
let mkdirp = require('mkdirp')
let morgan = require('morgan')
let request = require('request')
let argv = require('yargs').argv
var tar = require('tar') 

//require('longjohn');

var EventEmitter = require('events').EventEmitter;
var event_emitter = new EventEmitter();

var net = require('net'),
    JsonSocket = require('json-socket');

require('songbird')

const ROOT_DIR = argv.dir || path.resolve(process.cwd()) + '/server'
const HTTP_SERVER = 'http://127.0.0.1:8000/'

var port = 8001; //The same port that the server is listening on
var host = '127.0.0.1';
var socket = new JsonSocket(new net.Socket()); //Decorate a standard net.Socket with JsonSocket


console.log("connecting to port 8001")
socket.connect(port, host);

socket.on('connect', function() { //Don't send until we're connected
    console.log("*** Connecting with server. Downloading tar ...***")
    async ()=> {
        await rimraf.promise(path.resolve(process.cwd())+ '/client/source')
        let options = {
            url: HTTP_SERVER,
            headers: {'Accept': 'application/x-gtar'}
        }
        let extract = tar.Extract({path: ROOT_DIR})
        //console.log("here", extract)
        request(options, HTTP_SERVER).pipe(extract)
    }()

    console.log("Finished extracting...")
});

socket.on('message', function(message) {
    console.log('Server response is: '+ message.result);
    var result = message.result
    
    console.log('Action=>'+result.action+' Path=>'+result.path+' Type=>' +result.type)
    event_emitter.emit('dirEvent', {'result':result})
});

event_emitter.on('dirEvent', function(response) {
  console.log('Received event - direvent ', response.result)
  
  let result = response.result
  let filePath = result.path
  let hasExt = path.extname(filePath) !== ''
  let isDir = response.type == 'dir'
  
  if (result.action == 'write') { 
    async() => {
      console.log("***** Creating... **** ", filePath)
      if (isDir)
        mkdirp(filePath)
      else {
        request(url).pipe(fs.createWriteStream(fileName))
      }
      }()
  } else if (result.action == 'delete') { 
    async() => {
      console.log("***** Deleting... **** ", filePath)
      if (isDir)
         async ()=> {
            await rimraf.promise(fileName)
          }()
      else {
        fs.unlink(filePath)
      }
      }()
  }
});

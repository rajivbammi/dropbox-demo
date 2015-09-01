var net = require('net'),
    JsonSocket = require('json-socket');
var server = net.createServer();
var mySocket

var EventEmitter = require('events').EventEmitter;
var event_emitter = new EventEmitter();

let fs = require('fs')
let path = require('path')
let express = require('express')
let morgan = require('morgan')
let nodeify = require('bluebird-nodeify')
let mime = require('mime-types')
let rimraf = require('rimraf')
let mkdirp = require('mkdirp')
let chokidar = require('chokidar')

//let bluebird = require('bluebird')
//bluebird.longStackTraces()
//require('longjohn')
require('songbird')

const NODE_ENV = process.env.NODE_ENV
const PORT = process.env.PORT || 8000
const ROOT_DIR = path.resolve(process.cwd())
const SERVER_PORT = 8001

let app = express()

if (NODE_ENV == 'development') {
  app.use(morgan('dev'))
}

app.listen(PORT, ()=> console.log(`Server LISTENING @HTTP://127.0.0.1:${PORT}`))
server.listen(SERVER_PORT, ()=> console.log(`Sever LISTENING @TCP://127.0.0.1:${SERVER_PORT}`));


server.on('connection', function(socket) { 
    console.log("** Client just made connection **")
    mySocket = new JsonSocket(socket); 
});

event_emitter.on('dirEvent', function(data) {
  //console.log('***got foo***' + data)
  if(mySocket) {
   mySocket.sendMessage({result: data})
  }
});

chokidar.watch('.', {ignored: /[\/\\]\./})
.on('all', (event, path) => {
    //console.log("** Inside chokidar.watch **")
    if (event=='addDir' ) {
        event_emitter.emit('dirEvent', {'action':'write','path':path, 'type':'dir'})
    }
    if (event=='unlinkDir' ) {
        event_emitter.emit('dirEvent', {'action':'delete','path':path, 'type':'dir'})
    }
    if (event=='add') {
        event_emitter.emit('dirEvent', {'action':'write','path':path, 'type':'file'})
    }
    if (event=='unlink') {
        event_emitter.emit('dirEvent', {'action':'delete','path':path, 'type':'file'})
    }
})


app.get('*', setFileMeta, sendHeaders, (req, res) => {
   console.log("*** inside app.get ***")
   //if dir 
  if(res.body){
    res.json(res.body)
    return
  }
  fs.createReadStream(req.filePath).pipe(res)
})

app.head('*', setFileMeta, sendHeaders, (req, res) => res.end())


app.delete('*', setFileMeta, (req, res, next) => {
console.log("*** inside delete ***")
    async() => {
      if (!req.stat) return res.send(400, '*** Invalid Path ***')

      if (req.stat.isDirectory()) {
        await rimraf.promise(req.filePath)
      } else await fs.promise.unlink(req.filePath)
     res.end()
    }().catch(next)
})

app.put('*', setFileMeta, setDirDetails, (req, res, next) => {
  console.log("*** inside put ***")
  async() => {
    await mkdirp.promise(req.dirPath)
  
    if (!req.isDir) req.pipe(fs.createWriteStream(req.filePath))
    res.end()
  }().catch(next)
})

app.post('*', setFileMeta, setDirDetails, (req, res, next) => {
  console.log("*** inside post ***")
  async() => {
    if(!req.stat) return res.send(405, "*** File does not exists ***")
    if(req.isDir) return res.send(405, "*** Path is a directory ***")
    
    await fs.promise.truncate(req.filePath, 0)
    req.pipe(fs.createWriteStream(req.filePath))
    res.end()
  }().catch(next)
})

function setDirDetails(req, res, next) {
  let filePath = req.filePath
  let endWithSlash = filePath.charAt(filePath.length-1) === path.sep
  let hasExt = path.extname(filePath) !== ''
  req.isDir = endWithSlash || !hasExt
  req.dirPath = req.isDir ? filePath : path.dirname(filePath)
  next()
}

function setFileMeta(req, res, next) {
 console.log("*** inside setFileMeta ***")
 req.filePath = path.resolve(path.join(ROOT_DIR, req.url))
 if(req.filePath.indexOf(ROOT_DIR) !== 0) {
  res.send(400, 'Invalid path!!')
  return
 }
 fs.promise.stat(req.filePath)
    .then(stat => req.stat = stat, () =>req.stat = null)
    .nodeify(next)
 //next()
}

function sendHeaders(req,res, next) {
  console.log("*** inside sendHeaders ***")
  nodeify(async()=> {
    if(req.stat.isDirectory()) {
      let files = await fs.promise.readdir(req.filePath)
      res.body = JSON.stringify(files)
      console.log("****** Dir=>" + res.body)
      res.setHeader('Content-Length', res.body.length)
      res.setHeader('Content-Type', 'application/json')
      return  
    }
    res.setHeader('Content-Length', req.stat.size)
    let contentType = mime.contentType(path.extname(req.filePath))
    res.setHeader('Content-Type', contentType)
    console.log("****** File=>" + req.stat.size)
  }(), next)
}
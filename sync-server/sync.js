var express = require('express');
var app = express();
var fs = require("fs");

function rawBody(req, res, next) {
    req.setEncoding('utf8');
    req.rawBody = '';
    req.on('data', function(chunk) {
        req.rawBody += chunk;
    });
    req.on('end', function() {
        next();
    });
}

app.use(rawBody);
app.use('/static', express.static(__dirname + '/public'));

app.post('/update', (req, res) => {
    var path = __dirname + '/public/' + req.query['path'] || '';
    var file = req.query['file'] || '';
    if (!fs.existsSync(path)) {
        if (req.query['opt'] === 'nomk') {
            res.end(JSON.stringify([]));
            return;
        } else {
            fs.mkdirSync(path);
        }
    }
    fs.writeFileSync(path + '/' + file, req.rawBody)
    res.end(JSON.stringify({ 'msg': 'update OK' }));
})

app.get('/ls', function(req, res) {
    var path = __dirname + '/public/' + req.query['path'] || '';
    if (!fs.existsSync(path)) {
        if (req.query['opt'] === 'nomk') {
            res.end(JSON.stringify([]));
            return;
        } else {
            fs.mkdirSync(path);
        }
    }

    var localPath = fs.readdirSync(path),
        urls = [];
    localPath
        .filter(file => file.indexOf('.'))
        .forEach(file => {
            urls.push(file);
        });
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(urls));
})

var server = app.listen(3010, function() {

    fs.exists(__dirname + "/public/", function(exists) {
        if (!exists) {
            fs.mkdirSync(__dirname + "/public/");
        }
    });

    var host = server.address().address
    var port = server.address().port

    console.log("Sketch同步服务已启动 http://%s:%s", host, port)
})
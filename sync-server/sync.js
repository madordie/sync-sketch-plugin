var express = require('express');
var app = express();
var fs = require("fs");
var backupPath = __dirname + '/backup'

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
            res.end('0');
            return;
        } else {
            fs.mkdirSync(path);
        }
    }
    try {
        fs.writeFileSync(path + '/' + file, req.rawBody)
        res.end('1');
    } catch (error) {
        res.end('-1');
    }
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

app.get('/rm', function(req, res) {
    var path = req.query['path'] || '';
    if (path.length === 0) {
        res.end('0');
    } else {
        try {
            fs.renameSync(__dirname + '/public/' + path, backupPath + '/' + (new Date()).getTime() + "_" + path)
            res.end('1')
        } catch (error) {
            res.end('-1')
        }
    }
})

var server = app.listen(3010, function() {

    fs.exists(__dirname + "/public/", function(exists) {
        if (!exists) {
            fs.mkdirSync(__dirname + "/public/");
        }
    });

    fs.exists(backupPath, function(exists) {
        if (!exists) {
            fs.mkdirSync(backupPath);
        }
    });

    var host = server.address().address
    var port = server.address().port

    console.log("Sketch同步服务已启动 http://%s:%s", host, port)
})
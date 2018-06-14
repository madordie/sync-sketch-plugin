const fetch = require('sketch-polyfill-fetch');
const UI = require('sketch/ui');

var pluginProject = 'C端';
const host = 'http://127.0.0.1:3010/';
const API = (uri, opt) => {
    return fetch(encodeURI(host + uri), opt)
}

export var postSelected = function(context) {

    var selection = context.selection,
        artboards = [];

    for (var i = 0; i < selection.count(); i++) {
        try {
            var artboard = selection[i].parentArtboard();
            if (artboards.indexOf(artboard) == -1) {
                artboards.push(artboard);
            }
        } catch (error) {}
    }

    if (artboards.length == 0) {
        UI.message('请选择有效的画板');
        return;
    }

    // 展示
    var selectionStrings = [];
    artboards.forEach(artboard => {
        try {
            selectionStrings.push(MSJSONDataArchiver.archiveStringWithRootObject_error_(artboard.immutableModelObject(), nil));
        } catch (error) {}
    });
    var selectionsString = '[' + selectionStrings.join(',') + ']';

    API('ls?path=' + pluginProject)
        .then(res => res.json())
        .then(versions => {
            var options = versions;
            options.push('---上面都不是，我要创建---');
            var selection = UI.getSelectionFromUser(
                '你要将该模块上传到' + pluginProject + '的哪个版本？',
                options
            );
            var version = '';
            if (selection[2]) {
                if (selection[1] === options.length - 1) {
                    version = UI.getStringFromUser("听说你要创建新版本，那么起个名字吧！", '') || '';
                } else {
                    version = options[selection[1]]
                }
            }
            if (version.length === 0) {
                return new Promise(() => {});
            }
            return new Promise(function(resolve, reject) {
                resolve(pluginProject + '/' + version);
            })
        })
        .then(version => {
            return API('ls?opt=nomk&path=' + version)
                .then(res => res.json())
                .then(modules => {
                    return {
                        path: version,
                        modules: modules
                    }
                })
        })
        .then(res => {
            var options = [];
            options.push('---下面都不是，这是个新的---');
            res.modules.forEach(module => options.push(module))
            var selection = UI.getSelectionFromUser(
                '你要将该模块替换掉哪个？',
                options
            );
            var module = '';
            if (selection[2]) {
                if (selection[1] === 0) {
                    module = UI.getStringFromUser("听说你要创建新模块，那么起个名字吧！", '') || '';
                } else {
                    module = options[selection[1]];
                }
            }

            if (module.length === 0) {
                return new Promise(() => {});
            }
            return API('update?path=' + res.path + '&file=' + module, {
                    method: 'POST',
                    body: selectionsString,
                })
                .then(res => res.text())
        })
        .then(msg => {
            UI.message(msg);
        })
        .catch(e => {
            log(e)
            UI.message('⚠️抱歉，报错了：' + e)
        })
}

export var update = function(context) {
    API('ls?opt=nomk&path=' + pluginProject)
        .then(res => res.json())
        .then(versions => {
            var options = versions;
            var selection = UI.getSelectionFromUser(
                '你要下载' + pluginProject + '的哪个版本？',
                options
            );
            var version = '';
            if (selection[2]) {
                version = options[selection[1]]
            }

            if (version.length === 0) {
                return new Promise(() => {});
            }
            return new Promise(function(resolve, reject) {
                resolve(pluginProject + '/' + version);
            })
        })
        .then(version => {
            return API('ls?opt=nomk&path=' + version)
                .then(res => res.json())
                .then(modules => {
                    return {
                        path: version,
                        modules: modules
                    }
                })
        })
        .then(res => {
            var options = [];
            res.modules.forEach(module => options.push(module))
            var selection = UI.getSelectionFromUser(
                res.path + '下的哪个模块?',
                options
            );
            var module = '';
            if (selection[2]) {
                module = options[selection[1]];
            }

            if (module.length === 0) {
                return new Promise(() => {});
            }
            var uri = res.path + '/' + module;
            return API('static/' + uri)
                .then(res => res.text())
                .then(layers => {
                    return new Promise((resolve, reject) => {
                        resolve({
                            project: uri,
                            layers: layers
                        })
                    })
                })
        })
        .then(res => {
            var selectionsString = res.layers,
                pageUUID = NSUUID.UUID().UUIDString(),
                pageString = '{"_class":"page","do_objectID":"' + pageUUID + '","layers":' + selectionsString + '}',
                data = NSString.alloc().initWithString(pageString).dataUsingEncoding_(4),
                unarchive = MSJSONDataUnarchiver.unarchiveObjectWithData(data),
                newPage = MSPage.alloc().initWithImmutableModelObject(unarchive),
                page = MSDocument.currentDocument().addBlankPage();
            page.addLayers(newPage.layers());
            page.setName(res.project);
            MSDocument.currentDocument().contentDrawView().centerLayersInCanvas();
            MSDocument.currentDocument().pageTreeLayoutDidChange();
        })
        .catch(e => {
            log(e)
            UI.message('⚠️抱歉，报错了：' + e)
        })
}

export function onCopy(context) {}
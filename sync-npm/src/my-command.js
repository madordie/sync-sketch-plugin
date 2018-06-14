const fetch = require('sketch-polyfill-fetch');
const UI = require('sketch/ui');

var pluginProject = '';
const host = 'http://10.12.12.10:3010/';
const API = (uri, opt) => {
    return fetch(encodeURI(host + uri), opt);
};
const getInput = (title, def) => {
    var string = UI.getStringFromUser(title, def);
    if (string == 'null') {
        string = '';
    }
    return string;
};
const codeFormat = (code) => {
    var msg = '';
    if (code == '0') {
        msg = "操作无效";
    } else if (code == '1') {
        msg = "操作完成";
    } else if (code == '-1') {
        msg = "操作失败";
    } else {
        msg = "未知错误";
    }
    return msg;
};
const kProjectSave = 'madordie.github.io/sketch-sync';

function checkoutProject() {
    if (pluginProject === '') {
        pluginProject = NSUserDefaults.standardUserDefaults().stringForKey_(kProjectSave);
    }
    if (pluginProject.length === 0) {
        UI.alert('选中后才可以操作', '您还没有选中项目，无法上传。请选中后再试');
        return false;
    }
    return true;
}

export function postSelected(context) {
    if (!checkoutProject()) { return; }

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
                    version = getInput("听说你要创建新版本，那么起个名字吧！", '') || '';
                } else {
                    version = options[selection[1]];
                }
            }
            if (version.length === 0) {
                return new Promise(() => {});
            }
            return new Promise(function(resolve, reject) {
                resolve(pluginProject + '/' + version);
            });
        })
        .then(version => {
            return API('ls?opt=nomk&path=' + version)
                .then(res => res.json())
                .then(modules => {
                    return {
                        path: version,
                        modules: modules
                    };
                })
        })
        .then(res => {
            var options = [];
            options.push('---下面都不是，这是个新的---');
            res.modules.forEach(module => options.push(module));
            var selection = UI.getSelectionFromUser(
                '你要将该模块替换掉哪个？',
                options
            );
            var module = '';
            if (selection[2]) {
                if (selection[1] === 0) {
                    module = getInput("听说你要创建新模块，那么起个名字吧！", '') || '';
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
                .then(res => res.text());
        })
        .then(code => {
            UI.message('上传' + codeFormat(code));
        })
        .catch(e => {
            log(e);
            UI.message('💥抱歉，炸了了：' + e);
        })
}

export function update(context) {
    if (!checkoutProject()) { return; }

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
                version = options[selection[1]];
            }

            if (version.length === 0) {
                return new Promise(() => {});
            }
            return new Promise(function(resolve, reject) {
                resolve(pluginProject + '/' + version);
            });
        })
        .then(version => {
            return API('ls?opt=nomk&path=' + version)
                .then(res => res.json())
                .then(modules => {
                    return {
                        path: version,
                        modules: modules
                    };
                })
        })
        .then(res => {
            var options = [];
            res.modules.forEach(module => options.push(module));
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
                        });
                    });
                });
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
            log(e);
            UI.message('💥抱歉，炸了了：' + e);
        });
}

export function projectMk(context) {
    var project = getInput("听说你要创建新项目，那么起个名字吧！", '') || '';

    if (project.length === 0) {
        return;
    }

    API('ls?path=' + project)
        .then(res => res.text())
        .then(code => {
            UI.message('项目"' + project + '"创建完成');
        })
        .catch(e => {
            log(e);
            UI.message('💥抱歉，炸了了：' + e);
        });
}

export function projectRm(context) {
    API('ls?opt=nomk&path=/')
        .then(res => res.json())
        .then(projects => {
            var options = [];
            options.push('---你这个操作很危险---');
            projects.forEach(project => options.push(project));
            var selection = UI.getSelectionFromUser(
                '咱事先说好，删除了之后该项目下面的所有版本、模块均会被删除，你确定还要删除么？',
                options
            );
            var project = '';
            if (selection[2]) {
                if (selection[1] === 0) {
                    return;
                } else {
                    project = options[selection[1]];
                }
            }

            if (project.length === 0) {
                return;
            }

            options = ['算了不删了', '真的需要删除'];
            selection = UI.getSelectionFromUser(
                '我不放心，再次提醒一下，你真的要删除么？',
                options
            );
            if (selection[2]) {
                if (selection[1] === 0) {
                    return;
                } else {
                    API('rm?path=' + project)
                        .then(res => res.text())
                        .then(code => {
                            if (code == '1') {
                                UI.alert('已成功删除', '但是我还是不放心的备份了一下。。需要恢复还能找我');
                            } else {
                                UI.message('删除' + project + codeFormat(code));
                            }
                        })
                        .catch(e => {
                            log(e);
                            UI.message('💥抱歉，炸了了：' + e);
                        });
                }
            }
        })
        .catch(e => {
            log(e);
            UI.message('💥抱歉，炸了了：' + e);
        });
}

export default function projectSel(context) {
    API('ls?opt=nomk&path=/')
        .then(res => res.json())
        .then(projects => {
            if (projects.length === 0) {
                UI.alert('没有项目可以选中', '抱歉，此时还没有创建项目。。请去创建。');
                return;
            }
            var options = projects;
            var selection = UI.getSelectionFromUser(
                '请选择您要进行操作的项目',
                options
            );
            var project = '';
            if (selection[2]) {
                project = options[selection[1]];
            }

            if (project.length === 0) {
                return;
            }
            pluginProject = project;
            NSUserDefaults.standardUserDefaults().setObject_forKey_(pluginProject, kProjectSave);
            UI.message('项目"' + pluginProject + '"已选中');
        })
        .catch(e => {
            log(e);
            UI.message('💥抱歉，炸了了：' + e);
        });
}
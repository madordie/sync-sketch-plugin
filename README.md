## Sketch 模块同步插件

通过该插件可以将sketch中的画板转换为data然后上传至服务器，并能通过插件将服务器的data下载至本地还原为之前的画板。

![预览](https://github.com/madordie/sync-sketch-plugin/blob/master/Untitled.gif?raw=true)

[博客传送](https://madordie.github.io/post/sync-sketchplugin)

## 核心功能

功能的实现都是通过[Sketch.app](https://www.sketchapp.com)的API实现

其核心功能就俩：

- 将画板编码
- 解码为画板

## 核心代码

由于功能并不复杂，但是sketch并没有完整的API文档，所以只能摸索着来，最后总结一下用到的API，只有下面的几个重要函数。

但是要找到这些API并不是随手一个Google可以得到，现将其列出，方便你能随手Google一下就得到：）

另外，下面几部分的代码都通过[CocoaScript](https://github.com/ccgus/CocoaScript)的语法，所以可以直接应用到插件中。

为了能更好的理解和使用相关API，我尽量详细。

### 将画板编码

本节会将所有已经选中的层所对应的画板转换为json字符串。

ps.

- `层`包含sketch能够呈现的所有组件，包括但不限于：文本、矩形、图片、画板。
- 如果选中的层没有画板，将会被忽略。


```js
var selection = context.selection,
    artboards = [];

for (var i = 0; i < selection.count(); i++) {
    try {
        // 取出选中的所有画板
        var artboard = selection[i].parentArtboard();
        if (artboards.indexOf(artboard) == -1) {
            // 过滤重复的画板
            artboards.push(artboard);
        }
    } catch (error) {}
}

if (artboards.length == 0) {
    // 并无选中的任何画板
    return;
}

// 此时 artboards 数组， 即为当前选中的所有画板

var selectionStrings = [];
artboards.forEach(artboard => {
    try {
        // 将画板转为JSON字符串，并保存在 selectionStrings 数组中
        selectionStrings.push(MSJSONDataArchiver.archiveStringWithRootObject_error_(artboard.immutableModelObject(), nil));
    } catch (error) {}
});

// 将selectionStrings数组转为数组JSON字符串
var selectionsString = '[' + selectionStrings.join(',') + ']';

// 此时selectionsString字符串即为当前选中的所有画板的json数组字符串形式。 
```

### 解码为画板

接上一节的`selectionsString`。

先将`selectionsString`转为`page`的json数据，然后解析为一个新的`page`，并居中展示。

```js
var selectionsString = res.layers,
    pageUUID = NSUUID.UUID().UUIDString(),
    // 用page的JSON包裹selectionsString，同时生成一个新的UUID
    pageString = '{"_class":"page","do_objectID":"' + pageUUID + '","layers":' + selectionsString + '}',
    data = NSString.alloc().initWithString(pageString).dataUsingEncoding_(4),
    // 将JSON解码
    unarchive = MSJSONDataUnarchiver.unarchiveObjectWithData(data),
    // 生成新的page
    newPage = MSPage.alloc().initWithImmutableModelObject(unarchive),
    // 插入一个新的page
    page = MSDocument.currentDocument().addBlankPage();
// 将生成的page所有的layers转移到新的page里面
page.addLayers(newPage.layers());
// 为page设置哥名字
page.setName(res.project);
// page剧中
MSDocument.currentDocument().contentDrawView().centerLayersInCanvas();
MSDocument.currentDocument().pageTreeLayoutDidChange();
```

### 其他代码

关于别的后端操作啊 什么的我认为并不是核心代码。那代码谁都会写。。毕竟我写这个的时候只有2周的摸索经验😂，还是不聊这个了。

- `sync-npm` 插件相关的目录，采用[skpm](https://github.com/skpm/skpm)构建
- `sync-server` 插件对应的服务端代码，采用[Node-js](https://nodejs.org/en/)构建

## 目前还存在的问题

- 如果是带图片的画板，并且较多的时候，`selectionsString`会很大，传输速度有点慢。。
- UI交互有点吃藕。。最好开发一套macOS的UI，但是我还是只菜鸡。。
- 项目的代码我只是简简单单的连学带写2周做出来的。。写的不是一般的渣，见谅。。

## 你可能需要的参考资料

- Sketch的都文件：[Sketch-Headers](https://github.com/abynim/Sketch-Headers)，可以省去自己[class-dump](http://stevenygard.com/projects/class-dump/)的麻烦.
- 插件开发神器：[skpm](https://github.com/skpm/skpm)
- 用来调试很不错：[Sketch DevTools](https://github.com/skpm/sketch-dev-tools)
- 官方开发文档：[Sketch Developer](https://developer.sketchapp.com)
- 插件开发社区：[Sketch Developers](https://sketchplugins.com)
- 插件使用的语言：[CocoaScript](https://github.com/ccgus/CocoaScript)，但是并不仅限这一种哟
- 推荐搜索引擎: [Google](https://www.google.com)，别问我为什么用Google不用百度，我是不会告诉你sketch插件开发本来资料就少，国内更少的。。

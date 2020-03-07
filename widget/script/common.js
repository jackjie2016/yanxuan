var HOST_DOMAIN = {
    dev: "http://192.168.19.107:5210",
    test: "https://test.api.com",
    prod: "https://prod.api.com"
};
var ENV = "dev";  // dev 开发  test  测试  prod  生产
var HOST = HOST_DOMAIN[ENV];


(function (window) {

    var o = {};

    o.DEBUG = function () {
        return api.debug;
    };
    /**
     * 二次封装openWin
     * @param winName   winName
     * @param pageParam
     * @param otherParam    api.openWin的其他参数，可以覆盖默认参数
     */
    o.openWin = function (winName, pageParam, otherParam) {
        var param = {
            name: winName,
            url: winName + '.html',
            pageParam: pageParam,
            useWKWebView: false,
            hScrollBarEnabled: false,
            slidBackType: 'edge',
            allowEdit: true,
            softInputMode: 'resize',
            softInputDismissMode: ['tap', 'drag']
        };
        Object.assign(param, otherParam || {});
        api.openWin(param);
    };

    /**
     * 二次封装openFrame
     * @param frameName
     * @param header        win里的头部
     * @param footer        win里的底部，主要用作设置高度的
     * @param pageParam
     * @param otherParam    api.openFrame的其他参数，可以覆盖默认参数
     */
    o.openFrame = function (frameName, header, footer, pageParam, otherParam) {
        var headerH = header ? $api.dom(header).offsetHeight : 0;
        var footerH = footer ? $api.dom(footer).offsetHeight : 0;

        var param = {
            name: frameName,
            url: frameName + '.html',
            rect: {
                marginTop: headerH,
                marginLeft: 0,
                marginRight: 0,
                marginBottom: footerH
            },
            pageParam: api.pageParam || {},
            bounces: true
        };
        Object.assign(param, otherParam || {});
        Object.assign(param.pageParam, pageParam || {});
        api.openFrame(param);
    };

    o.openCommonWin = function (url, title) {
        this.openWin('common_win', {url: url, title: title}, {
            url: 'widget://html/common_win.html'
        })
    };

    o.fixStatusBar = function (selector) {
        return $api.fixStatusBar($api.dom(selector));
    };

    o.imageCache = function (remoteEles, thumbnail) {
        var imgArr = $api.domAll(remoteEles);
        for (var i = 0; i < imgArr.length; i++) {
            api.imageCache({
                url: $api.attr(imgArr[i], 'data-img'),
                policy: 'cache_else_network',
                thumbnail: thumbnail || false,
                tag: i
            }, function (ret, err) {
                if (ret.status) {
                    if (imgArr[ret.tag].tagName === 'IMG') {
                        imgArr[ret.tag].src = ret.url;
                    } else {
                        $api.css(imgArr[ret.tag], 'background-image:url(' + ret.url + ')');
                    }
                }
            });
        }
    }

    o.showProgress = function (title, text) {
        api.showProgress({
            style: 'default',
            animationType: 'fade',
            title: title || '网络请求中',
            text: text || '请稍后..',
            modal: false
        });
    };

    o.hideProgress = function () {
        api.hideProgress();
    };

    o.fnRefreshLoadDone = function () {
        api.refreshHeaderLoadDone();
    };
    //TODO 自行实现
    o.alert = function (title, msg, buttons, callback) {
        api.alert({
            title: title,
            msg: msg,
            buttons: buttons || ['确认']
        }, function (ret, err) {
            if (typeof callback !== "undefined") {
                callback(ret, err)
            }
        });
    };

    //TODO 自行实现
    o.confirm = function () {
        api.confirm({
            title: 'title',
            msg: 'testmsg',
            buttons: buttonsarray
        }, function (ret, err) {

        });
    }

    o.toast = function (msg) {
        api.toast({
            msg: msg,
            duration: 2000,
            location: 'middle',
            global: false
        });
    };
    window.$app = o;
})(window);

(function (window) {
    var u = {};

    u.mobile = /^1([38]\d|5[0-35-9]|7[3678])\d{8}$/;

    window.$reg = u;
})(window);

(function (window) {
    var d = {};

    d.html = function (root, template, data) {
        var evalText = doT.compile($api.text($api.dom(template)));
        if (typeof root === 'string') {
            $api.html($api.dom(root), evalText(data));
        } else {
            $api.html(root, evalText(data));
        }
    };

    window.$doT = d;
})(window);

(function (window) {
    var h = {};
    var service = new Service();

    h.GET = function (url, data, callback) {
        service.GET(url, data, function (ret, err) {
            //TODO err待处理
            if (typeof callback !== "undefined") {
                callback(ret);
            }
        });
    };

    h.POST = function (url, data, callback) {
        service.POST(url, data, function (ret, err) {
            //TODO err待处理
            if (typeof callback !== "undefined") {
                callback(ret);
            }
        });
    };

    h.DELETE = function (url, data, callback) {
        service.POST(url, data, function (ret, err) {
            //TODO err待处理
            if (typeof callback !== "undefined") {
                callback(ret);
            }
        });
    };

    h.PUT = function (url, data, callback) {
        service.POST(url, data, function (ret, err) {
            //TODO err待处理
            if (typeof callback !== "undefined") {
                callback(ret);
            }
        });
    };
    window.$http = h;
})(window);

(function (window) {
    var l = {};

    l.print = function (data) {
        var str = '';
        if (!$app.DEBUG) {
            return;
        }
        if (typeof api === 'undefined') {
            console.log(data);
            return;
        }
        str = "\n=========   " + api.winName + "/" + api.frameName + '  ==========\n';
        if (typeof data === 'object') {
            str += JSON.stringify(data);
            str += "\n==========================================";
            console.log(str);
        } else {
            str += data;
            str += "\n==========================================";
            console.log(str);
        }
    };

    window.$logger = l;

})(window)

/**
 * http 网络请求基类
 * @constructor
 */
function Service() {
    //是否缓存
    this.__cache = false;
    //Service请求超时
    this.__timeout = 30;
    //是否对url进行编码。传false时底层将不会对url进行编码
    this.__encode = true;
    //字符集
    this.__charset = "utf-8";
    //数据类型 json xml
    this.__dataType = "json";
    //是否上报 文件上传进度
    this.__report = false;
    //是否需要返回所有response信息，为true时，返回的头信息获取方法(ret.headers)，
    //消息体信息获取方法(ret.body)，状态码获取方法((api.systemType=='ios'?ret.info.statusCode:ret.statusCode))
    this.__returnAll = false;

    this.__headers = {
        // "Content-Type": "application/json",
        // "Accept": "application/json"
    };

    if (typeof Service._initialized === 'undefined') {

        /**
         * 网络请求基础方法
         * @param type      请求方式  get  post  delete  put
         * @param url       方法名
         * @param data      数据  get、delete传null
         * @param callback  回调方法
         */
        Service.prototype.BASE = function (type, url, data, callback) {
            var host = /\x20*https?:\/\/.*/gi.test(url) ? '' : HOST;
            api.ajax({
                url: host + url,
                method: type,
                headers: this.__headers,
                encode: this.__encode,
                timeout: this.__timeout,
                dataType: this.__dataType,
                returnAll: this.__returnAll,
                cache: this.__cache,
                charset: this.__charset,
                report: this.__report,
                data: data || null
            }, function (ret, err) {
                if (typeof callback !== 'undefined') {
                    if (ret) {
                        if (ret.code === 200) {
                            callback(ret);
                        } else {
                            $app.hideProgress();
                            $app.fnRefreshLoadDone();
                            $app.toast(ret.message);
                            $logger.print(ret);
                        }
                    } else if (err) {
                        callback(undefined, err);
                        //err.code 0：连接错误、1：超时、2：授权错误、3：数据类型错误
                        $app.hideProgress();
                        $app.fnRefreshLoadDone();
                        $app.toast(err.msg);
                        $logger.print(err);
                    }
                }
            });
        };

        /**
         * get 请求
         * @param url       方法名     /login
         * @param data      数据
         * @param callback  回调方法
         */
        Service.prototype.GET = function (url, data, callback) {
            var arr = [];
            if (data != null) {
                var temp = data.values;
                for (var key in data.values) {
                    arr.push(key + '=' + temp[key]);
                }
            }
            this.BASE('get', url + '?' + arr.join('&'), null, callback);
        };
        /**
         * post 请求
         * @param url       方法名     /login
         * @param data      数据
         * @param callback  回调方法
         */
        Service.prototype.POST = function (url, data, callback) {
            this.BASE('post', url, data, callback);
        };

        /**
         * delete 请求
         * @param url       方法名     /login
         * @param data      数据
         * @param callback  回调方法
         */
        Service.prototype.DELETE = function (url, data, callback) {
            var temp = data.values;
            var arr = [];
            for (var key in data.values) {
                arr.push(key + '=' + temp[key]);
            }
            this.BASE('delete', url + '?' + arr.join('&'), null, callback);
        };
        /**
         * put 请求
         * @param url       方法名     /login
         * @param data      数据
         * @param callback  回调方法
         */
        Service.prototype.PUT = function (url, data, callback) {
            this.BASE('put', url, data, callback);
        };
        Service._initialized = true;
    }
}

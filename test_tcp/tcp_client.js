// var net = require('net');
// var data = '';
// for (var i = 0; i < 5; i++) {
//     data += Date.now() + ""
// };

// var memn = 0;
// var ind = 0;
// var client = net.connect({
//         port: 8124
//     },
//     function() { //'connect' listener
//         console.log('connected to server!');

//         console.time("send");
//         write()
//         console.log(size)
//         // for (var i = 0; i < 100 * 10000; i++) {
//         //     // var data = new Buffer(Date.now() + "");
//         //     var msg = wrapMsg(data);
//         //     if (msg === false) {
//         //         continue;
//         //     };
//         //     var x = client.write(msg);
//         //     if (x === false) {
//         //         memn++;
//         //     };
//         // };
//         console.timeEnd("send")
//         // console.log(memn)
        
//     });
// client.on("drain", function () {
//     console.log("drain", ind)
//     // write();
// });
// var size = 0;
// function write () {
//     while(true){
//         var msg = wrapMsg(data);
        
//         var x = client.write(msg);
//         size+=msg.length;
//         if (x === false) {
//             break;
//         }else{
//             ind++;
//             if (ind> 100*10000) {
//                 return console.timeEnd("send")
//             };
//         }
//     }
// }
// client.on('data', function(data) {
//     console.log(data.toString());
//     // client.end();
// });
// client.on('end', function() {
//     console.log('disconnected from server');
// });

// function wrapMsg (msg) {
//     var msglen = msg.length.toString(16);
//     var lenlen = msglen.length;
//     if (lenlen > 10) {
//         throw new Error("消息过长");
//     };
//     return lenlen + msglen + msg;
// }


// server communicator
var SC = {};

var net = require('net');

var CONNECT_STATE_CONNECTED = 'connected';
var CONNECT_STATE_CONNECTING = 'connecting';
var CONNECT_STATE_DISCONNECT = 'disconnect';

SC._connectState = CONNECT_STATE_DISCONNECT;

SC.connect = function (opt, screct, cb) {
    var _this = this;
    this._client = net.connect(opt, function () {
        _this._connectState = CONNECT_STATE_CONNECTED;
        cb();
    });

    this._client.removeListener('data', _onSocketData)
    this._client.on('data', _onSocketData);
}

function _onSocketData (data) {
    SC._onSocketData(data);
}

SC._onSocketData = function (data) {
    console.log(data.toString())
    this._parseMsg(data.toString());
}

SC._leftmsg = "";

SC._decodeMsg = function (data) {


    if (data.length <= 2) {
        this._leftmsg = data;
        return false;
    };

    var lenlen = parseInt(data.charAt(0));

    // 格式不对
    if (isNaN(lenlen) || lenlen < 1) {
        this._leftmsg = data;
        return false;
    };

    var msglen = parseInt(data.substr(1, lenlen), 16);

    // 剩余长度不够
    if (data.length < msglen + lenlen + 1) {
        this._leftmsg = data;
        return false;
    }

    var ret = data.substr(lenlen + 1, msglen);
    this._leftmsg = data.substr(msglen + lenlen + 1);

        
    return ret;
}

SC._parseMsg = function (msg) {
    msg = this._decodeMsg(msg);

    try {
        msg = JSON.parse(msg);
    }catch(err){
        throw new Error('the type of msg is not json');
    }

    // 触发回调
    var cb = this.CBS[msg.id];
    if (cb) {
        clearTimeout(cb.t);
        cb && cb(msg.msg);
        this.CBS[msg.id] = null;
    };

    return msg;
}


SC._wrapMsg = function (msg) {
    var msglen = msg.length.toString(16);
    var lenlen = msglen.length;
    if (lenlen > 10) {
        throw new Error("the msg is too long, please let it < 10");
    };

    return lenlen + msglen + msg;
}

SC.CBS = {};

SC.send = function (msg, cb) {
    if (this._connectState !== CONNECT_STATE_CONNECTED) {
        // 未连接
    };
    var data = {};
    var id = data.id = this._nextMsgId();
    data.msg = msg;

    data = this._wrapMsg(JSON.stringify(data));

    var ret = this._client.write(data);

    data = null;

    if (cb) {
        this.CBS[id] = function (newmsg) {
            cb(null, newmsg);
        };

        // 超时
        this.CBS[id].t = setTimeout(function () {
            cb(new Error("timeout"), null);
            this.CBS[id] = null;
        }, 5000);
    };

    return ret;

}

SC._msgId = 0;
SC._maxMsgId = 10000000000;
SC._nextMsgId = function () {
    this._msgId++;
    if (this._msgId > this._maxMsgId) {
        this._msgId = 1;
    };
    return this._msgId;
}


;(function () {
    var ind = 0;
    var over = 0;
    var sc = SC;
    sc.connect({
            port: 8124
        }, '', 
        function () {
        console.log("链接成功")

        console.time("send")
        for (var i = 0; i < 500000; i++) {
            var ret = sc.send(i);
            if (ret === false) {
                ind++;
            };
        };
        
        console.timeEnd("send")
        console.log(ind)
    });


})();

;(function () {
    var ind = 0;
    var over = 0;
    var sc = SC;
    sc.connect({
            port: 8124
        }, '', 
        function () {
        console.log("链接成功")

        console.time("send")
        for (var i = 0; i < 1000000; i++) {
            var ret = sc.send(i);
            if (ret === false) {
                ind++;
            };
        };
        
        console.timeEnd("send")
        console.log(ind)
    });


})();

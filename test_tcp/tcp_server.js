// var net = require('net');

// var msg = "";
// var t = "";
// var ind = 0;

// var leftmsg = "";
// var size= 0;
// var server = net.createServer(function(c) { //'connection' listener
// 	console.log('client connected');
// 	c.on('end', function() {
// 		console.log('client disconnected');
// 	});
// 	c.on('data', function (data) {

// 		t = Date.now();
// 		size += data.toString().length;
// 		console.log(++ind, size,data.toString())

// 		var ret = parseMsg(leftmsg + data.toString());
// 		var a = Date.now();
// 		while(true){
// 			if (Date.now() - a > 1000) {
// 				break;
// 			};
// 		}
// 		return;
// 		msg = ret;
// 		while (ret !== false) {	// 长度不够不再解析
// 			// console.log(ret)
// 			ret = parseMsg(leftmsg);
// 			ind++;
// 			if (ret) {
				
// 				msg = ret;
// 			};
// 		}

		
// 	});
// 	// c.write('hello\r\n');
// 	// c.pipe(c);
// });
// server.listen(8124, function() { //'listening' listener
// 	console.log('server bound');
// });

// setInterval(function () {
// 	console.log( t, ind)
// }, 1000)



// function parseMsg (data) {
// 	data = data.toString();

// 	if (data.length <= 2) {
// 		leftmsg = data;
// 		return false;
// 	};

// 	var lenlen = parseInt(data.charAt(0));

// 	// 格式不对
// 	if (isNaN(lenlen) || lenlen < 1) {
// 		leftmsg = data;
// 		return false;
// 	};

// 	var msglen = parseInt(data.substr(1, lenlen), 16);

// 	// 剩余长度不够
// 	if (data.length < msglen + lenlen + 1) {
// 		leftmsg = data;
// 		return false;
// 	}

// 	var ret = data.substr(lenlen + 1, msglen);
// 	leftmsg = data.substr(msglen + lenlen + 1);
// 	return ret;

// }


var net = require('net');
var SCS = {};


SCS.start = function () {
	this._server = net.createServer(function(c) {
		new SCSocket(c);
	});
	this._server.listen(8124, function() {
		console.log('server bound');
	});
}

function SCSocket (connection) {
	this._msgCount = 0;
	this._leftmsg = "";
	this.CBS = {};

	this.con = connection;
	var _this = this;
	this.con.on("data", function (data) {
		_this._onSocketData(data);
	});
	this.con.on('end', function () {});
}

SCSocket.prototype._onSocketData = function (data) {
	var msg = this._parseMsg(this._leftmsg + data.toString());
	while (msg !== false) {	// 长度不够不再解析
		// console.log(ret)
		this._msgCount++;
		msg = this._parseMsg(this._leftmsg);
		
	}
	console.log(this._msgCount)
}


SCSocket.prototype._decodeMsg = function (data) {


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

SCSocket.prototype._parseMsg = function (msg) {
	msg = this._decodeMsg(msg);

	if (msg === false) {
		return false;
	};

	try {
		msg = JSON.parse(msg);
	}catch(err){
		throw new Error('the type of msg is not json');
	}

	// 触发回调
	var cb = this.CBS[msg.id];
	if (cb) {
		clearTimeout(cb.t);
		cb && cb(ret);
		this.CBS[msg.id] = null;
	};

	return msg;
}


SCSocket.prototype._wrapMsg = function (msg) {

	var msglen = msg.length.toString(16);
	var lenlen = msglen.length;
	if (lenlen > 10) {
		throw new Error("the msg is too long, please let it < 10");
	};

	return lenlen + msglen + msg;
}

SCSocket.prototype._send = function (id, msg, cb) {
	// if (this._connectState !== CONNECT_STATE_CONNECTED) {
	// 	// 未连接
	// };
	var data = {};
	data.id = id;
	data.msg = msg;

	data = this._wrapMsg(JSON.stringify(data));

	var ret = this.con.write(data);

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
}

SCSocket.prototype.send = function (msg, cb) {
	this._send(this._nextMsgId(), msg, cb);
}

SCSocket.prototype.respond = function (id, msg, cb) {
	this._send(id, msg, cb);
}


SCS.start();

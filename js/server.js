var io = require('socket.io').listen(9000);

io.sockets.on('connection', function (socket) {
	socket.on('message', function (message) {
		console.log('server got message:', message);

		socket.broadcast.emit('message', message);
	});
});
(function (window) {

var document = window.document,
	navigator = window.navigator;

if (!navigator.getUserMedia) {
	navigator.getUserMedia =
		navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia;
}

if (!window.URL) {
	window.URL =
		window.URL ||
		window.webkitURL ||
		window.msURL ||
		window.oURL;
}

if (!window.RTCPeerConnection) {
	window.RTCPeerConnection =
		window.mozRTCPeerConnection ||
		window.webkitRTCPeerConnection;
}

if (!window.RTCIceCandidate) {
	window.RTCIceCandidate = window.mozRTCIceCandidate;
}

function getURLParams() {
	var params = {},
		query = window.location.search.substring(1).split('&');

	query.forEach(function(pair) {
		var keyValue = pair.split('=');

		params[keyValue[0]] = keyValue[1];
	});

	return params;
}

var app = {
	channels: {},
	peers: {},
	room: null,
	stream: null,

	start: function() {
		var instance = this,
			video = document.getElementById('local'),
			params = getURLParams(),
			constraints;

		instance._setMain(video);

		if (params.media == 'screen') {
			constraints = {
				'video': {
					mandatory: {
				        chromeMediaSource: 'screen',
						maxWidth: 1280,
						maxHeight: 720
					}
				}
			};
		}
		else {
			constraints = {
				'audio': true,
				'video': true
			}
		}

		var success = function(stream) {
			instance._attachStream(video, stream);
			video.muted = true;
			instance.stream = stream;

			socket.emit('join', location.hash);
		};

		var error = function () {
			console.log('cannot access camera');
		};

		navigator.getUserMedia(constraints, success, error);
	},

	_attachStream: function(video, stream) {
		video.autoplay = true;
		video.src = window.URL.createObjectURL(stream);
	},

	_addIceCandidate: function(message) {
		var instance = this,
			peer = instance.peers[message.from];

		peer.addIceCandidate(new RTCIceCandidate(message.payload));
	},

	_answer: function(message) {
		var instance = this,
			peer = instance._createPeerConnection(message.from);

		instance._setRemoteDescription(message);

		var constraints = {
			'mandatory': {
				'OfferToReceiveAudio': true, 
				'OfferToReceiveVideo': true
			}
		};

		peer.createAnswer(instance._setLocalDescription.bind(instance, peer), null, constraints);
	},

	_offer: function(id) {
		var instance = this,
			peer = instance._createPeerConnection(id);

		peer.createOffer(instance._setLocalDescription.bind(instance, peer));
	},

	_createPeerConnection: function(id) {
		var instance = this,
			servers = {
				'iceServers': [
					{'url': 'stun:stun.l.google.com:19302'}
				]
			},
			options = {
				'optional': [
					{'RtpDataChannels': true}
				]
			},
			peer = new RTCPeerConnection(servers, options),
			peers = instance.peers,
			stream = instance.stream,
			channels = instance.channels;

		peer.onicecandidate = instance._onIceCandidate.bind(instance, id);
		peer.onaddstream = instance._onAddStream.bind(instance, id);
		peer.addStream(stream);

		peer.id = id;
		peers[id] = peer;

		channels[id] = peer.createDataChannel('chat', {'reliable': false});
		channels[id].onmessage = instance._onDataChannelMessage.bind(instance);

		return peer;
	},

	_setLocalDescription: function(peer, description) {
		var instance = this;

		peer.setLocalDescription(description);

		socket.emit('relay', {
			'room': instance.room,
			'to': peer.id,
			'payload': description
		});
	},

	_setMain: function(video) {
		var instance = this,
			previous = document.querySelector('video.main'),
			thumbnails = document.querySelectorAll('video.thumbnail').length;

		video.className = 'main';
		video.width = window.innerWidth;

		if (previous) {
			previous.style.top = (thumbnails * 150) + 'px';
			previous.className = 'thumbnail';
		}
	},

	_setRemoteDescription: function(message) {
		var instance = this,
			peer = instance.peers[message.from];

		peer.setRemoteDescription(new RTCSessionDescription(message.payload));
	},

	_onIceCandidate: function(id, event) {
		var instance = this;

		if (event.candidate) {
			var payload = {
				type: 'candidate',
				sdpMLineIndex: event.candidate.sdpMLineIndex,
				candidate: event.candidate.candidate
			};

			socket.emit('relay', {
				'room': instance.room,
				'to': id,
				'payload': payload
			});
		}	
	},

	_onAddStream: function(id, event) {
		var instance = this,
			video = document.createElement('video');

		video.id = id;
		document.body.appendChild(video);
		instance._setMain(video);

		instance._attachStream(video, event.stream);
	},

	_onDataChannelMessage: function(event) {
		console.log('_onDataChannelMessage', event);
	},

	_onLeave: function(id) {
		var instance = this,
			video = document.getElementById(id),
			peers = instance.peers,
			peer = peers[id];

		peer.close();
		delete peers[id];

		video.parentNode.removeChild(video);
	}
};

var socket = io.connect();

socket.on('relay', function (message) {
	var type = message.payload.type;

	if (type === 'offer') {
		app._answer(message);
	}
	else if (type === 'answer') {
		app._setRemoteDescription(message);
	}
	else if (type == 'candidate') {
		app._addIceCandidate(message);
	}
});

socket.on('created', function (room) {
	app.room = room;
});

socket.on('join', function (id) {
	app._offer(id);
});

socket.on('leave', function (id) {
	app._onLeave(id);
});

window.onbeforeunload = function(event) {
	socket.emit('leave', app.room);
};

window.app = app;

})(window);
(function(window) {
	'use strict';

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

	var webrtc = {
		channels: {},
		peers: {},
		room: null,
		stream: null,

		join: function() {
			var instance = this,
				video = document.getElementById('local');

			instance._setMain(video);

			navigator.getUserMedia({
					'audio': true,
					'video': true
				},
				function(stream) {
					instance._attachStream(video, stream);
					video.muted = true;
					instance.stream = stream;

					socket.emit('join', location.hash);
				},
				function() {
					console.log('cannot access camera');
				}
			);
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

		_attachStream: function(video, stream) {
			video.autoplay = true;
			video.src = window.URL.createObjectURL(stream);
		},

		_createPeerConnection: function(id) {
			var instance = this,
				servers = {
					'iceServers': [{
						'url': 'stun:stun.l.google.com:19302'
					}]
				},
				options = {
					'optional': [{
						'RtpDataChannels': true
					}]
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

			channels[id] = peer.createDataChannel('chat', {
				'reliable': false
			});
			channels[id].onmessage = instance._onDataChannelMessage.bind(instance);

			return peer;
		},

		_offer: function(id) {
			var instance = this,
				peer = instance._createPeerConnection(id);

			peer.createOffer(instance._setLocalDescription.bind(instance, peer));
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

		_onLeave: function(id) {
			var instance = this,
				video = document.getElementById(id),
				peers = instance.peers,
				peer = peers[id];

			peer.close();
			delete peers[id];

			video.parentNode.removeChild(video);
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
		}
	};

	var socket = io.connect();

	socket.on('relay', function(message) {
		var type = message.payload.type;

		if (type === 'offer') {
			webrtc._answer(message);
		}
		else if (type === 'answer') {
			webrtc._setRemoteDescription(message);
		}
		else if (type === 'candidate') {
			webrtc._addIceCandidate(message);
		}
	});

	socket.on('created', function(room) {
		webrtc.room = room;
	});

	socket.on('join', function(id) {
		webrtc._offer(id);
	});

	socket.on('leave', function(id) {
		webrtc._onLeave(id);
	});

	window.onbeforeunload = function(event) {
		socket.emit('leave', webrtc.room);
	};

	window.webrtc = webrtc;

	webrtc.join();

})(window);
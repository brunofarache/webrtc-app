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

var client = {
	caller: null,

	start: function() {
		var instance = this,
			caller = instance.caller,
			video1 = document.getElementById('video1');

		navigator.getUserMedia(
			{
				video: true
			},
			function (stream) {
				video1.autoplay = true;
				video1.src = window.URL.createObjectURL(stream);
			},
			function () {
				console.log('cannot access camera');
			}
		);
	}
};

window.client = client;

}(window));
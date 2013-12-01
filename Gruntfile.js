'use strict';

module.exports = function(grunt) {

	grunt.initConfig({
		jshint: {
			files: ['server.js', '**/client.js'],
			options: grunt.file.readJSON('.jshintrc')
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.registerTask('default', ['jshint']);
};
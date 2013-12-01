'use strict';

module.exports = function(grunt) {

	grunt.initConfig({
		jshint: {
			files: ['server.js', 'public/**/client.js'],
			options: grunt.file.readJSON('.jshintrc')
		},

		watch: {
			files: ['server.js', '**/client.js'],
			tasks: ['default']
		}
	});

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', ['jshint']);

};
"use strict"


module.exports = (grunt) ->
  grunt.initConfig
    pkg:
      name: "my blog"
      version: "0.1.0"
      author:
        name: "Matt Greer"

    clean:
      build: ['build']
      css: ['contents/css']
  
    watch:
      stylus:
        files: ['stylus/**/*.styl']
        tasks: ['stylus:debug']

    copy:
      publicdebug:
        cwd: 'src/client/'
        expand: true
        src: [ '**/*.html', 'img/**', '*.ico', '*.txt', 'js/**', 'css/**', 'bower/**', 'fonts/**' ]
        dest: 'public/'

    stylus:
      debug:
        options:
          compress: false
          linenos: true
        files: 'contents/css/blog.css': 'stylus/main.styl'
      prod:
        options:
          compress: true
          linenos: false
        files: 'contents/css/blog.css': 'stylus/main.styl'

    exec:
      winter_build:
        command: 'wintersmith build'

  grunt.loadNpmTasks "grunt-contrib-copy"
  grunt.loadNpmTasks "grunt-contrib-clean"
  grunt.loadNpmTasks "grunt-contrib-watch"
  grunt.loadNpmTasks "grunt-contrib-stylus"
  grunt.loadNpmTasks "grunt-open"
  grunt.loadNpmTasks "grunt-exec"



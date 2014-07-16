var gulp = require('gulp'),
  release = require('github-release'),
  pkg = require('./package.json'),
  exec = require('child_process').exec;

gulp.task('dist', ['upload']);

gulp.task('build', function(cb){
  exec('./node_modules/.bin/lone', function(err){
    if(err) return cb(err);
    cb();
  });
});

gulp.task('upload', ['build'], function(){
  return gulp.src('./.lone/dist/*').pipe(release(pkg));
});

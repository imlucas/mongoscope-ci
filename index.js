var async = require('async'),
  debug = require('debug')('mongoscope-ci'),
  request = require('request'),
  os = require('os'),
  path = require('path'),
  untildify = require('untildify'),
  fs = require('fs-extra'),
  zlib = require('zlib'),
  tar = require('tar'),
  es = require('event-stream'),
  spawn = require('child_process').spawn;

function platform(mongodb){
  var p = os.platform();
  if(mongodb && p === 'darwin') return 'osx';
  return p;
}

function arch(mongodb){
  var a = os.arch();
  if(mongodb && a === 'x64') return 'x86_64';
  return a;
}

function nodejs(){
  return function(fn){
    var debug = require('debug')('mongoscope-ci:nodejs'),
      basename = 'node-v'+config.nodejs+'-'+platform()+'-' + arch(),
      pkg = {
        name: 'nodejs',
        version: config.nodejs,
        artifact: basename+'.tar.gz',
        checksum: '',
        url: 'http://nodejs.org/dist/v'+config.nodejs+'/'+basename+'.tar.gz'
      };

    async.series([download(pkg), extract(pkg)], function(err, res){
      if(err) return fn(err);

      var bin = path.resolve(res[1] + '/bin');
      process.env.PATH = bin + ':' + process.env.PATH;
      debug('add PATH ' + bin);
      fn();
    });
  };
}

function mongodb(){
  return function(fn){
    var debug = require('debug')('mongoscope-ci:mongodb'),
      basename = 'mongodb-'+platform(true)+'-' + arch(true)+'-'+config.mongodb,
      pkg = {
        name: 'mongodb',
        version: config.mongodb,
        artifact: basename+'.tgz',
        checksum: '',
        url: 'http://fastdl.mongodb.org/'+platform(true)+'/'+basename+'.tgz'
      };

    async.series([download(pkg), extract(pkg)], function(err, res){
      if(err) return fn(err);

      var bin = path.resolve(res[1] + '/bin');
      process.env.PATH = bin + ':' + process.env.PATH;
      debug('add PATH ' + bin);
      fn();
    });
  };
}

function extract(pkg){
  return function(fn){
    var debug = require('debug')('mongoscope-ci:' + pkg.name +':extract'),
      tarball = path.resolve(config.cache + '/.artifacts/' + pkg.artifact),
      base = path.resolve(config.cache + '/' + pkg.name),
      dest = path.resolve(base + '/' + pkg.version),
      cleanup = createCleanupCrew('remove incomplete untar', function(){
      fs.removeSync(dest);
      debug('removed', dest);
    });

    fs.exists(dest, function(exists){
      if(exists){
        debug('already extracted', dest);
        cleanup.clear();
        fn(null, dest);
      }
      debug('reading ' + tarball);

      var input = fs.createReadStream(tarball),
        ungzip = zlib.createGunzip(),
        extractor = tar.Extract({path: dest, strip: 1});

      extractor.on('end', function(){
        debug('created', dest);
        cleanup.clear();
        fn(null, dest);
      });

      input.pipe(ungzip);
      ungzip.on('error', function(err){
        debug('error ungziping', err);
        cleanup.clear();
        fn(err, dest);
      }).on('finished', function(){
        debug('ungzipped');
      });

      debug('untar-ing....');
      ungzip.pipe(extractor);
    });
  };
}

function createCleanupCrew(msg, fn){
  var done = function(){
    console.log('process exit!');
    fn();
  };
  process.on('exit', done);
  return {
    clear: function(){
      process.removeListener('exit', done);
    }
  };
}

// @todo: how to checksum?
function download(pkg){
  return function(fn){
    var debug = require('debug')('mongoscope-ci:' + pkg.name +':download'),
      artifacts = path.resolve(config.cache + '/.artifacts'),
      dest = path.resolve(artifacts + '/' + pkg.artifact),
      url = pkg.url,
      cleanup = createCleanupCrew('remove incomplete artifact', fs.unlinkSync.bind(null, dest)),
      start = Date.now();

    fs.mkdirs(artifacts, function(err){
      if(err) return fn(err);

        fs.exists(dest, function(exists){
          if(exists){
            debug('already have artifact ' + dest);
            cleanup.clear();
            return fn();
          }

          debug('downloading ' + url);
          var out = fs.createWriteStream(dest).on('error', fn)
            .on('finish', function(){
              debug('downloaded ' + dest + ' in ' + Math.round((Date.now() - start)/1000, 2)   + ' seconds');
              cleanup.clear();
              fn(null, dest);
            }),
            req = request(url);

          req.pipe(out);
          req.on('error', fn);
        });
    });
  };
}

var config = {};


// @todo: default to 'latest' and resolve dynamically.
function configure(opts, fn){
  var valid = Object.keys(options({}));

  Object.keys(opts).map(function(k){
    if(valid.indexOf(k) === -1){
      delete opts[k];
    }
  });
  config = options(opts);
  debug('configured: \n' + Object.keys(config).map(function(k){
    return '- '+k+': '+config[k];
  }).join('\n'));
  fs.mkdirs(config.cache, function(err){
    if(err) return fn(err);
    fn();
  });
}

function options(opts){
  opts = opts || {};

  opts.nodejs = opts.nodejs || '0.10.29';
  opts.mongodb = opts.mongodb || '2.6.3';
  opts.cache = path.resolve(untildify((opts.cache || '~/.mongoscope-ci')));
  opts.cwd = path.resolve(untildify((opts.cwd || process.cwd())));
  return opts;
}

function run(bin, args, fn){
  if(os.platform() === 'win32') bin += '.exe';

  var debug = require('debug')('mongoscope-ci:run:' + args[1]),
    cmd = bin + ' ' + args.join(' '),
    opts = {cwd: config.cwd, stdio: ['ignore', process.stdout, process.stderr]},
    child, cleanup,
    onExit = function(code){
      cleanup.clear();
      child.removeListener('close', onExit);

      if(code === 0) return fn();
      fn(new Error(cmd + ' exited unexpectedly'));
    };

  debug('running', cmd);
  child = spawn(bin, args, opts);
  cleanup = createCleanupCrew('parent killed', child.kill.bind(child));
  child.on('close', onExit);
}
var tasks = {
  setup: function(){
    return function(fn){
      async.parallel([mongodb(), nodejs()], fn);
    };
  },
  ci: function(){
    return function(fn){
      run('npm', ['run-script', 'ci'], fn);
    };
  },
  dist: function(){
    return function(fn){
      run('npm', ['run-script', 'dist'], fn);
    };
  },
  teardown: function(){
    return function(fn){
      fn();
    };
  }
};

module.exports = function(opts, fn){
  configure(opts, function(err){
    if(err) return fn(err);

    async.series([tasks.setup(), tasks.ci(), tasks.dist(), tasks.teardown()], function(err){
      if(err) return fn(err);
      fn();
    });
  });
};

['setup', 'ci', 'dist', 'teardown'].map(function(name){
  module.exports[name] = function(opts, fn){
    configure(opts, function(err){
      if(err) return fn(err);
      tasks[name].call(null).call(null, fn);
    });
  };
});

module.exports.options = options();

process.env.DEBUG = '*';

var ci = require('../'),
  path = require('path'),
  which = require('which'),
  assert = require('assert');

var PROJECT = path.resolve(__dirname + '/project'),
  CONFIG = {
    cwd: PROJECT,
    cache: path.resolve(__dirname + '/.mongoscope-ci'),
    mongodb: '2.6.3',
    nodejs: '0.10.29'
  };

function bin(name){
  return path.resolve(CONFIG.cache + '/'+name+'/'+CONFIG[name]+'/bin');
}

describe('When I run mongoscope-ci', function(){
  it('should work', function(done){
    ci(CONFIG, done);
  });

  it('should add mongodb to $PATH', function(){
    assert(process.env.PATH.indexOf(bin('mongodb')) > -1);
  });

  it('should add nodejs to $PATH', function(){
    assert(process.env.PATH.indexOf(bin('nodejs') > -1));
  });

  describe('and the managed binaries should be resolveable', function(){

    it('should resolve `mongod`', function(){
      assert(which.sync('mongod').indexOf(bin('mongodb')) > -1);
    });

    it('should resolve `mongo`', function(){
      assert(which.sync('mongo').indexOf(bin('mongodb')) > -1);
    });

    it('should resolve `mongos`', function(){
      assert(which.sync('mongos').indexOf(bin('mongodb')) > -1);
    });

    it('should resolve `node`', function(){
      assert(which.sync('node').indexOf(bin('nodejs')) > -1);
    });

    it('should resolve `npm`', function(){
      assert(which.sync('npm').indexOf(bin('nodejs')) > -1);
    });
  });
});

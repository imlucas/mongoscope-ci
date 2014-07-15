#!/usr/bin/env node

var ci = require('../'),
  yargs = require('yargs')
    .usage([
      'Usage: mongoscope-ci'
    ].join('\n'))
    .alias('c', 'cache')
    .default('c', ci.options.cache)
    .describe('c', 'Artifact cache path')
    .alias('m', 'mongodb')
    .default('m', ci.options.mongodb)
    .describe('m', 'MongoDB version')
    .alias('n', 'nodejs')
    .default('n', ci.options.nodejs)
    .describe('n', 'node.js version'),
  argv = yargs.argv;

if(argv.h || argv.help || (argv._[0] && argv._[0] === 'help')) return yargs.showHelp();

ci(argv, function(err){
  if(err){
    console.error(err);
    yargs.showHelp();
    process.exit(1);
  }
});

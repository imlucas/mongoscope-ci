# mongoscope-ci

[![build status](https://secure.travis-ci.org/imlucas/mongoscope-ci.png)](http://travis-ci.org/imlucas/mongoscope-ci)

Rather than creating yet another bash script that can't be tested,
let's use a bunch of modules we're already created + modules from the future
to simplify all of this madness:

- Install MongoDB and node.js
- Run `npm run-script ci` to start dep processes and run tests
- Run `npm run-script dist` to create a distribution if the tests pass

## Todo

- split off mongodb version manager
- split off nodejs version manager
- add option to install a prebuilt version of mongoscope
- add task to start various mongo instances for testing ([mongodb-runner][mongodb-runner])
- make mongoscope-client use this so it can be completely unhooked from scope.mongodb.land
- respect "engine" semvers in the child project's `package.json`
- windows, mainly tweaking nodejs and mongo recipes that have wacky URL's
- if no `dist|ci` in child project's `package.json`, dont try to run them

## Install

Meant to be installed by grabbing a prebuilt executable.  Now brace yourself,
because this is really hard:

> WIP

```
curl -fsSL http://squirrel.mongodb.land/mongoscope-ci/install | bash
```

## Tests

The initial test run will take some time because the MongoDB tarball
is ridiculously large, but this will make sure all of the setup
and actual command execution

```
npm test
```

[mongodb-runner]: http://github.com/imlucas/mongodb-runner

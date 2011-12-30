/*
 * macros.js: Test macros hook.io module
 *
 * (C) 2011 Marak Squires, Charlie Robbins
 * MIT LICENCE
 *
 */

var assert = require('assert'),
    path = require('path'),
    spawn = require('child_process').spawn,
    fork = require('child_process').fork,
    eyes = require('eyes'),
    request = require('request'),
    carapace = require('../../lib/carapace');

var macros = exports;

macros.assertUse = function (plugins, vows) {
  var names = plugins.map(function (p) { return path.basename(p, '.js') });
  
  var context = {
    topic: function () {
      //
      // should be an array
      // we have to do this because carapace, preloads these plugins
      //
      var scripts = plugins.map(function (plugin) {
        return carapace.load(plugin);
      });
      
      carapace.use(scripts, this.callback.bind(null, null));
    },
    "should have load the plugin(s)": function () {
      assert.isArray(plugins);
      names.forEach(function (name) {
        assert.isFunction(carapace[name]);
      });
    }
  };
  
  return extendContext(context, vows);
};

macros.assertRun = function (script, argv, vows) {
  var context = {
    topic: function () {
      carapace.on('running', this.callback.bind(carapace, null));
      carapace.argv = argv || [];
      carapace.script = script;
      carapace.run();
    },
    "should fire the `carapace::running` event": function () {
      assert.equal(carapace.event, 'running');
    },
    "should rewrite process.argv transparently": function () {
      assert.equal(process.argv[1], script);
    }
  };
  
  return extendContext(context, vows);
};

macros.assertSpawn = function (PORT, script, argv, vows) {
  argv = argv.slice(0);
  
  var context = {
    topic: function () {
      var that = this,
          child = spawn(carapace.bin, ['--hook-port', PORT, script].concat(argv));
      child.stdout.once('data', that.callback.bind(null, null, child));
    },
    "should respond with the proper wrapped script output": function (_, child, data) {
      assert.notEqual(data.toString().indexOf(script), -1);
    }
  }
  
  return extendContext(context, vows);
};

macros.assertParentSpawn = function (options, /*PORT, script, argv, cwd,*/ vows) {
  options.argv = options.argv.slice(0);
  options.argv.push(options.script);
  
  var context = {
    "when spawning a child carapace": {
      topic: function () {
        var that = this,
            child = fork(carapace.bin, options.argv);

        child.on('message', function onPort (info) {
          if (info.data && info.data.port) {
            that.port = info.data.port;
            that.callback(null, info, child);
            child.removeListener('port', onPort);
          }
        });
      },
      "should emit the `port` event": {
        topic: function (info, child) {
          this.callback(null, info, child);
        },
        "with the correct port": function (_, info, child) {
          assert.equal(info.data.port, this.port);
        },
        "should correctly start the HTTP server": {
          topic: function (_, _, _, child) {
            request({ uri: 'http://localhost:' + this.port }, this.callback.bind(null, null, child));
          },
          "that responds with a cwd": function (_, child, err, res, body) {
            if (!options.keepalive) {
              child.kill();
            }
            
            assert.equal(body, options.cwd);
          }
        }
      }
    }
  };
  
  if (options.keepalive) {
    context['when spawning a child carapace'] = extendContext(context['when spawning a child carapace'], vows);
  }
  else {
    context = extendContext(context, vows);
  }
  
  return context;
};

function extendContext (context, vows) {
  if (vows) {
    if (vows.topic) {
      console.log('Cannot include topic at top-level of nested vows:');
      eyes.inspect(vows, 'vows');
      process.exit(1);
    }
    
    Object.keys(vows).forEach(function (key) {
      context[key] = vows[key];
    });
  }
  
  return context;
}

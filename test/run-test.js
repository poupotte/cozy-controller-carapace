/*
 * use-test.js: Basic tests for the carapace module
 *
 * (C) 2011 Nodejitsu Inc
 * MIT LICENCE
 *
 */
 
var assert = require('assert'),
    vows = require('vows'),
    helper = require('./helper/macros.js'),
    carapace = require('../lib/carapace');

var PORT = 5050;
    
vows.describe('carapace/use-plugins').addBatch({
  "When using haibu-carapace":  helper.assertListen(carapace, PORT, {
    "use chdir, chroot" : helper.assertUse(carapace, ['chdir', 'chroot'], {
      "to create the jail" : {
        topic : function () {
          carapace.chroot('../examples/tobechrooted');
          carapace.chdir('.');
          return true;
        },
        "without any errors" : function () {
          assert.isTrue(true);
        },
        "in the in the jail, run `./server.js`" : helper.assertRun(carapace, ['./server.js'])
      }
    })
  })
}).export(module);

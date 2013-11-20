/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
"use strict";

var events = require('events');
var fs = require('fs');
var carrier = require('carrier');


var DEFAULT_FIFO ='/tmp/wifiFIFO';

var DB= 'dB';
var BSSID = 'BSSID:';


var endsWith = function(str, suffix) {
    return (str.indexOf(suffix, str.length - suffix.length) !== -1);
};

var startsWith = function(str, prefix) {
    return (str.indexOf(prefix) === 0);
};

var WifiEmitter = exports.WifiEmitter = function(spec) {
    var self = this;
    events.EventEmitter.call(this);
    this.wifiFIFO = (spec && spec.wifiFIFO) || DEFAULT_FIFO;
    this.fifo = fs.createReadStream(this.wifiFIFO);
    this.fifo.on('error', function(err) { self.emit('error', err);});
    carrier.carry(this.fifo, function(line) {
                      var splitLine = line.split(/ +/);
                      var timestamp = null;
                      var signal = null;
                      var source = null;
//1384912098.012519 11.0 Mb/s 2462 MHz 11b -63dB signal antenna 2 BSSID:2c:76:8a:f9:b4:72
                      splitLine
                          .forEach(function(x, i) {
                                       if (i === 0) {
                                           timestamp =
                                               Math.floor(parseFloat(x)
                                                               * 1000.0);
                                       } else if (endsWith(x, DB))  {
                                           signal =
                                               parseInt(x.substring(0, x.length
                                                                    - DB.length));


                                       } else if (startsWith(x, BSSID)) {
                                           source = x.substring(BSSID.length,
                                                                x.length);
                                       }
                                   });
                      if (timestamp && signal && source) {
                          this.emit('wifiData', {timestamp: timestamp,
                                                 signal: signal,
                                                 source: source});
                      }
                  });
};

util.inherits(WifiEmitter, events.EventEmitter);


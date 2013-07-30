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

var carrier = require('carrier');
var spawn = require('child_process').spawn;


var MAX_SAMPLES = 100;

var DEFAULT_INTERVAL= 2000;

var INTERFACE= 'ath0';


var createWifiData = exports.createWifiData = function(config) {
    if (config.disableWifi) {
        return null;
    } else {
        return new ArDroneWifiData(config);
    }
};


var doScan = function(cb) {
    try {
        var scan = spawn('/sbin/iwlist',[INTERFACE, 'scanning'])
            .on('error', function(err) {
                    cb(err);
                });
        var output = {};
        var key = null;
        var value = null;
        carrier.carry(scan.stdout, function(line) {
                          var reAddress = /Address:/;
                          if (reAddress.exec(line)) {
                              var t1 = line.split(reAddress);
                              var t11 = t1[1].split(' ');
                              // format is: Cell 38 - Address: 04:F0:21:04:56:A9
                              key = t11[1];
                          }
                          //Quality=52/94  Signal level=-43 dBm  Noise level=...
                          var reSignal = /Signal level=/;
                          if (reSignal.exec(line)) {
                              var t2 =  line.split(reSignal);
                              var t22 = t2[1].split(' ');
                              value = t22[0];
                          }
                          if (key && value) {
                              output[key] = parseInt(value);
                              key = null;
                              value = null;
                          }
                      });
        scan.stdout.on('end', function() {
                           cb(null, output);
                       });
        scan.stderr.pipe(process.stderr);
    } catch(ex) {
        // spawn errors are not always mapped into events in 0.8.X
        cb(ex);
    } 
};

var nextScan = function(self) {
    var cb = function(err, data) {
        if (err) {
            console.log("Cannot wifi scan " + JSON.stringify(err));
        } else {
            var now = new Date().getTime();
            self.data.push({now: now, data: data});
            if (self.data.length > self.maxSamples) {
                self.data.shift();
            }
        }
    };
    doScan(cb);
};

var ArDroneWifiData = exports.ArDroneWifiData = function(config) {
    var self = this;
    this.data = [];
    this.maxSamples = config.maxSamples || MAX_SAMPLES;
    this.wifiInterval = config.wifiInterval || DEFAULT_INTERVAL;
    this.intervalId = (this.wifiInterval > 0 ?
                       setInterval(function() {
                                       nextScan(self);
                                   }, this.wifiInterval)
                       : null);
};

ArDroneWifiData.prototype.shutdown = function() {
    (this.intervalId !== null) && clearInterval(this.intervalId);
};


ArDroneWifiData.prototype.all = function() {
    return this.data.slice();
};

ArDroneWifiData.prototype.last = function() {
    return (this.data.length > 0 ? this.data[this.data.length -1] : null);
};

// all gone but the last one.
ArDroneWifiData.prototype.compact = function() {
    var lastEntry = this.last();
    this.data = (lastEntry ? [lastEntry] : []);
};

ArDroneWifiData.prototype.reset = function() {
    this.data = [];
};


ArDroneWifiData.prototype.scan = function() {
    nextScan(this);
    return this;
};

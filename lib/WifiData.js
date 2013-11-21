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
var WifiEmitter = require('./WifiEmitter').WifiEmitter;

var MAX_SAMPLES = 1000;

var DEFAULT_INTERVAL= -1; //(msec) By default no periodic scans

var INTERFACE = 'ath0';

var DEFAULT_WIFI_EMITTER_ON = false;

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

var addSample = function(self, now, data) {
    self.data.push({now: now, data: data});
    if (self.data.length > self.maxSamples) {
        self.data.shift();
    }
};

var nextScan = function(self) {
    var cb = function(err, data) {
        if (err) {
            console.log("Cannot wifi scan " + JSON.stringify(err));
        } else {
            var now = (self.time && self.time.getTime()) ||
                (new Date()).getTime();
            addSample(self, now, data);
        }
    };
    doScan(cb);
};

var ArDroneWifiData = exports.ArDroneWifiData = function(config) {
    var self = this;
    this.data = [];
    this.time = config.time;
    this.maxSamples = config.maxSamples || MAX_SAMPLES;
    this.wifiInterval = config.wifiInterval || DEFAULT_INTERVAL;
    this.intervalId = (this.wifiInterval > 0 ?
                       setInterval(function() {
                                       nextScan(self);
                                   }, this.wifiInterval)
                       : null);
    var wifiEmitterOn = (config.wifiFIFO !== undefined) ||
        DEFAULT_WIFI_EMITTER_ON;
    if (wifiEmitterOn) {
        this.wifiEmitter = new WifiEmitter(config);
        this.wifiEmitter
            .on('wifiData', function(data) {
                    // OS buffering makes (new Date()).getTime() inaccurate
                    var now =
                        (self.time && self.time.correctTime(data.timestamp))
                        || data.timestamp;
                    addSample(self, now, data);
                })
            .on('error', function(err) {
                    console.log('Wifi Emitter Error:' + JSON.stringify(err));
                    self.shutdown();
                });
    }
};

ArDroneWifiData.prototype.shutdown = function() {
    (this.intervalId !== null) && clearInterval(this.intervalId);
    this.wifiEmitter && this.wifiEmitter.shutdown();
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

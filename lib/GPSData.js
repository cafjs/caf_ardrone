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

var gpsd = require('node-gpsd');

var MAX_SAMPLES= 100;

var createGPSData = exports.createGPSData = function(config) {
    return new ArDroneGPSData(config);
};

var ArDroneGPSData = exports.ArDroneGPSData = function(config) {
    var self = this;
    this.data = [];
    this.maxSamples = config.maxSamples || MAX_SAMPLES;
    this.droneIP = config.ip || '127.0.0.1';
    this.gpsPort = config.gpsPort || 2947;
    this.listener = new gpsd.Listener({
                                          port: this.gpsPort,
                                          hostname: this.droneIP,
                                          verbose: false
                                      });
    this.listener.connect(function() {
                              console.log("gps connected");
                              self.listener.watch();
                          });
    this.listener.on('TPV', function(tpv) {
                         if (tpv.mode >= 2) {
                             var now = config.time.getTime();
                             self.data.push({now: now, data: tpv});
                             if (self.data.length > self.maxSamples) {
                                 self.data.shift();
                             }
                         }
                     });
};

ArDroneGPSData.prototype.all = function() {
    return this.data.slice();
};

ArDroneGPSData.prototype.last = function() {
    return (this.data.length > 0 ? this.data[this.data.length -1] : null);
};

// all gone but the last one.
ArDroneGPSData.prototype.compact = function() {
    var lastEntry = this.last();
    this.data = (lastEntry ? [lastEntry] : []);
};

ArDroneGPSData.prototype.reset = function() {
    this.data = [];
};


var fromLastData = function(self, propName) {
    var lastEntry = self.last();
    return (lastEntry ? lastEntry.data[propName] : null);
};

ArDroneGPSData.prototype.lat = function() {
    return fromLastData(this, 'lat');
};

ArDroneGPSData.prototype.lon = function() {
    return fromLastData(this, 'lon');
};

ArDroneGPSData.prototype.alt = function() {
    return fromLastData(this, 'alt');
};

ArDroneGPSData.prototype.track = function() {
    return fromLastData(this, 'track');
};

ArDroneGPSData.prototype.speed = function() {
    return fromLastData(this, 'speed');
};

ArDroneGPSData.prototype.climb = function() {
    return fromLastData(this, 'climb');
};


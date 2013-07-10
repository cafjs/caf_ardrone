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

var MAX_SAMPLES= 100;

var createNavData = exports.createNavData = function(config) {
    return new ArDroneNavData(config);
};


// entries are {now: integer, data: navdata}
//    see https://github.com/felixge/node-ar-drone for navdata format
var ArDroneNavData = exports.ArDroneNavData = function(config) {
    var self = this;
    this.maxSamples = config.maxSamples || MAX_SAMPLES;
    this.data = [];
    config.cl.on('navdata', function(x) {
                     var now = new Date().getTime();
                     self.data.push({now: now, data: x});
                     if (self.data.length > self.maxSamples) {
                          self.data.shift();
                     }
                 });
};

ArDroneNavData.prototype.all = function() {
    return this.data.slice();
};

ArDroneNavData.prototype.last = function() {
    return (this.data.length > 0 ? this.data[this.data.length -1] : null);
};

// all gone but the last one.
ArDroneNavData.prototype.compact = function() {
    var lastEntry = this.last();
    this.data = (lastEntry ? [lastEntry] : []);
};

ArDroneNavData.prototype.reset = function() {
    this.data = [];
};

// some quickies...

ArDroneNavData.prototype.timestamp = function() {
    var lastEntry = this.last();
    return (lastEntry ? lastEntry.now : null);
};

ArDroneNavData.prototype.altitude = function() {
    var lastEntry = this.last();
    return (lastEntry ? lastEntry.data.demo.altitude : null);
};

ArDroneNavData.prototype.batteryPercentage = function() {
    var lastEntry = this.last();
    return (lastEntry ? lastEntry.data.demo.batteryPercentage : null);
};

ArDroneNavData.prototype.pitch = function() {
    var lastEntry = this.last();
    return (lastEntry ? lastEntry.data.demo.theta : null);
};

ArDroneNavData.prototype.roll = function() {
    var lastEntry = this.last();
    return (lastEntry ? lastEntry.data.demo.phi : null);
};

ArDroneNavData.prototype.yaw = function() {
    var lastEntry = this.last();
    return (lastEntry ? lastEntry.data.demo.psi : null);
};

ArDroneNavData.prototype.velocity = function() {
    var lastEntry = this.last();
    return (lastEntry ? lastEntry.data.demo.velocity : null);
};

ArDroneNavData.prototype.flyState = function() {
    var lastEntry = this.last();
    return (lastEntry ? lastEntry.data.demo.flyState : null);
};

ArDroneNavData.prototype.controlState = function() {
    var lastEntry = this.last();
    return (lastEntry ? lastEntry.data.demo.controlState : null);
};

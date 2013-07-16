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

var fromLastDemo = function(self, propName) {
    var lastEntry = self.last();
    return (lastEntry ? lastEntry.data.demo[propName] : null);
};

ArDroneNavData.prototype.altitude = function() {
    return fromLastDemo(this, 'altitude');
};

ArDroneNavData.prototype.batteryPercentage = function() {
    return fromLastDemo(this, 'batteryPercentage');
};

ArDroneNavData.prototype.pitch = function() {
    return fromLastDemo(this, 'pitch');
};

ArDroneNavData.prototype.roll = function() {
    return fromLastDemo(this, 'roll');
};

ArDroneNavData.prototype.yaw = function() {
    return fromLastDemo(this, 'yaw');
};

ArDroneNavData.prototype.velocity = function() {
    return fromLastDemo(this, 'velocity');
};

ArDroneNavData.prototype.flyState = function() {
    return fromLastDemo(this, 'flyState');
};

ArDroneNavData.prototype.controlState = function() {
    return fromLastDemo(this, 'controlState');
};

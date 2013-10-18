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

var collapseMask = exports.collapseMask = function(value, mask) {
    if (value === undefined) {
        return null;
    }
    var result = 0;
    for (var key in value) {
        result = (result | (value[key] * mask[key])) >>>0;
    }
    return result;
};


var expandMask = exports.expandMask = function(value, mask) {
    var result = {};
    for (var key in mask) {
        result[key] = (value & mask[key] ? 1 : 0);
    }
    return result;
};



var pruneNavData = function(x) {
    if (x.droneState) {
        x.droneState = collapseMask(x.droneState, DRONE_STATES);
    }
    if (x.demo) {
        var newDemo = {};
        newDemo.controlState = x.demo.controlState;
        newDemo.flyState = x.demo.flyState;
        newDemo.batteryPercentage = x.demo.batteryPercentage;
        newDemo.pitch = x.demo.frontBackDegrees;
        newDemo.roll =  x.demo.leftRightDegrees;
        newDemo.yaw = x.demo.clockwiseDegrees;
        newDemo.altitude =  x.demo.altitude;
        newDemo.velocity =  x.demo.velocity;
        x.demo = newDemo;
    }
    if (x.visionDetect) {
        var newVision = {};
        newVision.nbDetected = x.visionDetect.nbDetected;
        if (newVision.nbDetected > 0) {
            // do not filter
            newVision = x.visionDetect;
        }
        x.visionDetect = newVision;
    }
    return x;
};

// entries are {now: integer, data: navdata}
//    see https://github.com/felixge/node-ar-drone for navdata format
var ArDroneNavData = exports.ArDroneNavData = function(config) {
    var self = this;
    this.maxSamples = config.maxSamples || MAX_SAMPLES;
    this.data = [];
    config.cl.on('navdata', function(x) {
                     var now = config.time.getTime();
                     self.data.push({now: now, data: pruneNavData(x)});
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


// from ARDrone_SDK_2_0/ARDroneLib/Soft/Common/config.h
var DRONE_STATES = exports.DRONE_STATES = {
    flying                     : 1 << 0,  /*!< FLY MASK : (0) ardrone is landed, (1) ardrone is flying */
    videoEnabled               : 1 << 1,  /*!< VIDEO MASK : (0) video disable, (1) video enable */
    visionEnabled              : 1 << 2,  /*!< VISION MASK : (0) vision disable, (1) vision enable */
    controlAlgorithm           : 1 << 3,  /*!< CONTROL ALGO : (0) euler angles control, (1) angular speed control */
    altitudeControlAlgorithm   : 1 << 4,  /*!< ALTITUDE CONTROL ALGO : (0) altitude control inactive (1) altitude control active */
    startButtonState           : 1 << 5,  /*!< USER feedback : Start button state */
    controlCommandAck          : 1 << 6,  /*!< Control command ACK : (0) None, (1) one received */
    cameraReady                : 1 << 7,  /*!< CAMERA MASK : (0) camera not ready, (1) Camera ready */
    travellingEnabled          : 1 << 8,  /*!< Travelling mask : (0) disable, (1) enable */
    usbReady                   : 1 << 9,  /*!< USB key : (0) usb key not ready, (1) usb key ready */
    navdataDemo                : 1 << 10, /*!< Navdata demo : (0) All navdata, (1) only navdata demo */
    navdataBootstrap           : 1 << 11, /*!< Navdata bootstrap : (0) options sent in all or demo mode, (1) no navdata options sent */
    motorProblem               : 1 << 12, /*!< Motors status : (0) Ok, (1) Motors problem */
    communicationLost          : 1 << 13, /*!< Communication Lost : (1) com problem, (0) Com is ok */
    softwareFault              : 1 << 14, /*!< Software fault detected - user should land as quick as possible (1) */
    lowBattery                 : 1 << 15, /*!< VBat low : (1) too low, (0) Ok */
    userEmergencyLanding       : 1 << 16, /*!< User Emergency Landing : (1) User EL is ON, (0) User EL is OFF*/
    timerElapsed               : 1 << 17, /*!< Timer elapsed : (1) elapsed, (0) not elapsed */
    MagnometerNeedsCalibration : 1 << 18, /*!< Magnetometer calibration state : (0) Ok, no calibration needed, (1) not ok, calibration needed */
    anglesOutOfRange           : 1 << 19, /*!< Angles : (0) Ok, (1) out of range */
    tooMuchWind                : 1 << 20, /*!< WIND MASK: (0) ok, (1) Too much wind */
    ultrasonicSensorDeaf       : 1 << 21, /*!< Ultrasonic sensor : (0) Ok, (1) deaf */
    cutoutDetected             : 1 << 22, /*!< Cutout system detection : (0) Not detected, (1) detected */
    picVersionNumberOk         : 1 << 23, /*!< PIC Version number OK : (0) a bad version number, (1) version number is OK */
    atCodecThreadOn            : 1 << 24, /*!< ATCodec thread ON : (0) thread OFF (1) thread ON */
    navdataThreadOn            : 1 << 25, /*!< Navdata thread ON : (0) thread OFF (1) thread ON */
    videoThreadOn              : 1 << 26, /*!< Video thread ON : (0) thread OFF (1) thread ON */
    acquisitionThreadOn        : 1 << 27, /*!< Acquisition thread ON : (0) thread OFF (1) thread ON */
    controlWatchdogDelay       : 1 << 28, /*!< CTRL watchdog : (1) delay in control execution (> 5ms), (0) control is well scheduled */
    adcWatchdogDelay           : 1 << 29, /*!< ADC Watchdog : (1) delay in uart2 dsr (> 5ms), (0) uart2 is good */
    comWatchdogProblem         : 1 << 30, /*!< Communication Watchdog : (1) com problem, (0) Com is ok */
    emergencyLanding           : 1 << 31  /*!< Emergency landing : (0) no emergency, (1) emergency */
};


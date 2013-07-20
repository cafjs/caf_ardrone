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

var arDrone = require('ar-drone');
var bundle = require('./Bundle');
exports.parseBundle = bundle.parseBundle;
exports.emergencyBundle = bundle.emergencyBundle;
exports.ArDroneBundle = bundle.ArDroneBundle;

var video = require('./Video');

var config = require('./Config');
exports.ArDroneConfig = config.ArDroneConfig;
exports.parseConfig = config.parseConfig;

var navData = require('./NavData');
var gpsData = require('./GPSData');



var client = exports.client = function(spec) {
    spec = spec || {};
    spec.ip = spec.ip || "127.0.0.1";
    var udpCon = arDrone.createUdpControl(spec);
    var udpNav = arDrone.createUdpNavdataStream(spec);
    // we don't want to create another one in 'createClient'
    spec.udpControl = udpCon;
    spec.udpNavdataStream = udpNav;
    var cl = arDrone.createClient(spec);
    //navData & Bundle need cl
    spec.cl = cl;
    return {
        cl : cl,
        udpCon: udpCon,
        video: video.createVideo(spec),
        config: config.createConfig(spec),
        navData: navData.createNavData(spec),
        gpsData: gpsData.createGPSData(spec)
    };
};


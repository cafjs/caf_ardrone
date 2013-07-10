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
exports.ArDroneVideo = video.ArDroneVideo;

var config = require('./Config');
exports.ArDroneConfig = config.ArDroneConfig;

var navData = require('./NavData');
exports.ArDroneNavData = navData.ArDroneNavData;



var client = exports.client = function(config) {
    config = config || {};
    config.ip = config.ip || "127.0.0.1";
    var udpCon = arDrone.createUdpControl(config);
    var udpNav = arDrone.createUdpNavdataStream(config);
    // we don't want to create another one in 'createClient'
    config.udpControl = udpCon;
    config.udpNavdataStream = udpNav;
    var cl = arDrone.createClient(config);
    //navData needs cl
    config.cl = cl;
    return {cl : cl,
            udpCon: udpCon,
            video: video.createVideo(config),
            config: config.createConfig(config),
            navData: navData.createNavData(config)};
};


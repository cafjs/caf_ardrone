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


/**
 * Change drone configuration settings by modifying a map that mirrors the
 * expected configuration.
 *
 * If an entry was not set (or had a different value) we push the change to
 * the drone using client.config.
 *
 * If an entry was already set to the proposed value it gets ignored.
 *
 * If we want to force a retry, we first set it to null.
 */

/* Example system properties that we care about:
 *
 *  'control:euler_angle_max' (between 0 and 0.52, i.e., 30 degrees or PI/6).
 *
 *  'control:altitude_max'  in millimeters
 *
 *  'control:control_vz_max' Max vertical speed  in milimeters per second
 * (max 2000)
 *
 *  'control:control_yaw' Max yaw speed in radians per second (max 6.11 rad/s
 * or 350 degrees per second)
 *
 *  'control:outdoor' true to enable wind estimator
 *
 *  'control:flight_without_shell'  true if the outdoor hull is on.
 *
 *  'video:video_codec' set to 'H264_720P_CODEC' for live stream 720P
 * otherwise 360P.
 *
 */

// fixed for now...
var SESSION_ID = exports.SESSION_ID = '"ad1efdbc"';
var PROFILE_ID = exports.PROFILE_ID = '"992f7f3f"';
var APPLICATION_ID = exports.APPLICATION_ID=  '"510acf96"';


var createConfig = exports.createConfig = function(config) {
    return new ArDroneConfig(config);
};

var ArDroneConfig = exports.ArDroneConfig = function(setupConfig) {
    if (setupConfig) {
        this.udpCon = setupConfig.udpControl;
        // it can take a second to process this, ignoring other requests...
        this.udpCon.raw('CONFIG_IDS', SESSION_ID, PROFILE_ID, APPLICATION_ID);
        this.udpCon.raw('CONFIG', '"custom:session_id"', SESSION_ID);
        this.udpCon.raw('CONFIG_IDS', SESSION_ID, PROFILE_ID, APPLICATION_ID);
        this.udpCon.raw('CONFIG', '"custom:profile_id"', PROFILE_ID);
        this.udpCon.raw('CONFIG_IDS', SESSION_ID, PROFILE_ID, APPLICATION_ID);
        this.udpCon.raw('CONFIG', '"custom:application_id"', APPLICATION_ID);
        this.client = setupConfig.cl;
    }
    this.config = {};
    this.pending = {};
};

var parse = exports.parseConfig = function(str, setupConfig) {
    var contents = JSON.parse(str);
    var result = new ArDroneConfig(setupConfig);
    result.config = contents.config;
    result.pending = contents.pending;
    return result;
};

ArDroneConfig.prototype.toJSON = function() {
    return JSON.stringify({config: this.config, pending: this.pending});
};

ArDroneConfig.prototype.snapshot = function() {
    var self = this;
    var result = {};
    Object.keys(this.config).forEach(function(key) {
                                         result[key] = self.config[key];
                                     });
    Object.keys(this.pending).forEach(function(key) {
                                          var obj = self.pending[key];
                                          if (obj !== self.config[key]) {
                                              if (obj !== null) {
                                                  result[key] = obj;
                                              } else {
                                                  delete result[key];
                                              }
                                          }
                                      });
    return result;
};

ArDroneConfig.prototype.merge = function(newConfig) {
    var mergeF = function(pending, newConfig) {
        newConfig = newConfig || {};
        Object.keys(newConfig).forEach(function(key) {
                                           pending[key] = newConfig[key];
                                       });
    };
    mergeF(this.pending, newConfig);
};

var prefixMultiConfig = exports.prefixMultiConfig = function(udpCon) {
    udpCon.raw('CONFIG_IDS', SESSION_ID, PROFILE_ID, APPLICATION_ID);
};

ArDroneConfig.prototype.update = function(newConfig) {
    var self = this;
    this.merge(newConfig);
    Object.keys(this.pending)
        .forEach(function(key) {
                     var obj = self.pending[key];
                     if (obj !== self.config[key]) {
                         if (obj !== null) {
                             self.config[key] = obj;
                             prefixMultiConfig(self.udpCon);
                             self.udpCon.config(key, obj);
                         } else {
                             // to enable a retry
                             delete self.config[key];
                         }
                     }
                 });
    this.pending = {};
};

// value in radians from 0 to 0.52 (i.e., up to 30 degrees or PI/6)
ArDroneConfig.prototype.euler_angle_max = function(value) {
    this.pending['control:euler_angle_max'] = value;
    return this;
};

// value in millimeters
ArDroneConfig.prototype.altitude_max = function(value) {
    this.pending['control:altitude_max'] = value;
    return this;
};

// vertical speed max value in millimeters per sec (max 2000)
ArDroneConfig.prototype.control_vz_max = function(value) {
    this.pending['control:control_vz_max'] = value;
    return this;
};

// max yaw speed in radians per sec (max 6.11 -or 350 degrees per sec-)
ArDroneConfig.prototype.control_yaw = function(value) {
    this.pending['control:control_yaw'] = value;
    return this;
};

// flying outdoors (with wind!) (true/false)
ArDroneConfig.prototype.outdoor = function(value) {
    this.pending['control:outdoor'] = (value ? 'TRUE' : 'FALSE');
    return this;
};

// flying without a shell (true for outdoor hull/false indoor hull)
ArDroneConfig.prototype.flight_without_shell = function(value) {
    this.pending['control:flight_without_shell'] = (value ? 'TRUE' : 'FALSE');
    return this;
};

var VIDEO_CODEC = exports.VIDEO_CODEC = {
  'P264_CODEC': 0x40,
  'MP4_360P_CODEC': 0x80,
  'H264_360P_CODEC': 0x81,
  'MP4_360P_H264_720P_CODEC': 0x82,
  'H264_720P_CODEC': 0x83,
  'MP4_360P_SLRS_CODEC': 0x84,
  'H264_360P_SLRS_CODEC': 0x85,
  'H264_720P_SLRS_CODEC': 0x86,
  'H264_AUTO_RESIZE_CODEC': 0x87,
  'MP4_360P_H264_360P_CODEC': 0x88
};

// video codec, true for 720p, false for 360p, string (or int)
//   for a custom value
ArDroneConfig.prototype.video_codec = function(value) {
    // multi-config only
    if (typeof value === 'boolean') {
        value = (value ? 'H264_720P_CODEC' : 'H264_360P_CODEC');
    }
    if (typeof value === 'string') {
        value = VIDEO_CODEC[value];
    }
    this.pending['video:video_codec'] = value;
    return this;
};

// frames per second from 15-30
ArDroneConfig.prototype.codec_fps = function(value) {
    this.pending['video:codec_fps'] = value;
    return this;
};

// video bit rate set to a fix value from 500 to 4000 kbps
ArDroneConfig.prototype.bitrate = function(value) {
    // multi-config only
    this.pending['video:max_bitrate'] = value;
    this.pending['video:bitrate_control_mode'] = 0; // VBC_MODE_DISABLED
    return this;
};


// true for head (high resolution) camera, false for bottom one
ArDroneConfig.prototype.video_channel = function(value) {
    this.pending['video:video_channel'] = (value ? 0 : 1);
    return this;
};


//true for sending a reduced set of nav data, false for everything
ArDroneConfig.prototype.navdata_demo = function(value) {
    this.pending['general:navdata_demo'] = value ? 'TRUE': 'FALSE';
    return this;
};


var NAVDATA_OPTIONS= exports.NAVDATA_OPTIONS = {
    DEMO              : 0,
    TIME              : 1,
    RAW_MEASURES      : 2,
    PHYS_MEASURES     : 3,
    GYROS_OFFSETS     : 4,
    EULER_ANGLES      : 5,
    REFERENCES        : 6,
    TRIMS             : 7,
    RC_REFERENCES     : 8,
    PWM               : 9,
    ALTITUDE          : 10,
    VISION_RAW        : 11,
    VISION_OF         : 12,
    VISION            : 13,
    VISION_PERF       : 14,
    TRACKERS_SEND     : 15,
    VISION_DETECT     : 16,
    WATCHDOG          : 17,
    ADC_DATA_FRAME    : 18,
    VIDEO_STREAM      : 19,
    GAMES             : 20,
    PRESSURE_RAW      : 21,
    MAGNETO           : 22,
    WIND_SPEED        : 23,
    KALMAN_PRESSURE   : 24,
    HDVIDEO_STREAM    : 25,
    WIFI              : 26,
    ZIMMU_3000        : 27
};

//An array of strings containing the options enabled (when demo is true)
ArDroneConfig.prototype.navdata_options = function(valueArray) {
    var flags = 0;
    valueArray.forEach(function(value) {
                           if (typeof value === 'string') {
                               flags  = flags | (1 << NAVDATA_OPTIONS[value]);
                           }
                       });
    this.pending['general:navdata_options'] = flags;
    return this;
};

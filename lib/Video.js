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
var net = require('net');



var createVideoControl = exports.createVideoControl = function(config) {
    return new VideoControl(config);
};


var VideoControl = exports.VideoControl = function(config) {
    config = config || {};
    this.pump = null;
    this.currentRetry = 0;
    this.droneIP = config.ip || '127.0.0.1';
    this.videoPort = config.videoPort || 5555;
    this.maxRetry = config.maxRetry || 1000;
    this.timeoutRetry = config.timeoutRetry || 1000;
    this.timeoutSocket = config.timeoutSocket || 1000;
}; 

VideoControl.prototype.connect = function(targetIP, targetPort,
                                          isBottom) {
    //console.log('calling connect');  
    var self = this;
    var cleanupPump = function() {
        if (self.timeout) {
            clearTimeout(self.timeout);
            self.timeout = null;
        }
        if (self.pump) {
            if (self.pump.video) {
                self.pump.video.end();
            } 
            self.pump.end();
            self.pump = null;
        }
    };

    cleanupPump();

    var reconnect = function() {
        //console.log('calling reconnect');        
        if ((self.currentRetry < self.maxRetry) && !self.timeout) {
            self.currentRetry = self.currentRetry + 1;
            self.timeout = 
                setTimeout(function() {
                               self.timeout = null;
                               console.log("Retrying...");
                               self.connect(targetIP, targetPort,
                                            isBottom);
                           }, 
                           self.timeoutRetry);
        }

    };

    if (targetIP && (targetPort !== undefined)) {
        if (isBottom) {
            // TO DO: switch camera
        }
        
        var pump;
        var handlerF = function(msg) {
            return function() {
                console.log(msg);
                if (pump === self.pump) {
                    reconnect();
                }
            };
        };
        pump = net
            .connect({host:targetIP, port:targetPort},
                     function () {
                         var video = net
                             .connect({host: self.droneIP,
                                       port: self.videoPort},
                                      function() {
                                          video.pipe(pump);
                                      });
                         video.setTimeout(self.timeoutSocket);
                         pump.video = video;
                         video.on('error', handlerF('Cannot connect ' +
                                                    'to source'));
                         video.on('end', handlerF('End of source'));
                         video.on('close', handlerF('Close of source'));
                         video.on('timeout',
                                  handlerF('Timeout source'));
                     });
        pump.setTimeout(this.timeoutSocket);

        pump.on('error', handlerF('Cannot connect to destination'));
        pump.on('end', handlerF('End of destination'));
        pump.on('close', handlerF('Close of destination'));
        pump.on('timeout', handlerF('Timeout destination'));

        this.pump = pump;
    }
};


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

var config = require('./Config');

/**
 * A Bundle is a collection of drone commands that are intended to execute
 * atomically and with precise timing.
 * 
 * 
 */

/*
 *  A 'bundle' of commands is represented as:
 *
 *  Array.<{when: <number>, op: <string>,
 *          args: Array.<JSONSerializableObject>}>
 *
 * 'when' offset in milliseconds to perform the task relative to the start of 
 * the previous task.
 *
 * 'op' is one of:
 *      'takeoff'  - no args
 *
 *      'land'     -no args
 *
 *      'emergency'  - no args -  Drone stops by cutting off the engine
 *
 *      'stop' - no args- Drone hovers in place
 *
 *      'move' -with arguments:
 *                 [roll, pitch, gaz, yaw]
 *               all of them are floating point numbers [-1.0...1.0]
 *  representing a relative value to a maximum threshold property:
 *
 *               'roll'  is left/right tilt with maximum angle defined with
 *  property control:euler_angle_max (between 0 and 0.52, i.e., 30 degrees or
 *  PI/6).
 *               'pitch' is front/back tilt with maximum angle defined with
 *  property 'control:euler_angle_max'.
 *               'gaz' is vertical speed with maximum speed defined with
 *  property 'control:control_vz_max' (going up is positive)
 *               'yaw' is angular speed (clockwise is positive) with maximum
 *  angular speed defined with property 'control:control_yaw'
 *
 *      'blink' -with arguments:
 *                  [ledAnimation, rate, duration]
 *
 *       and 'ledAnimation' is any of 'blinkGreenRed', 'blinkGreen', 'blinkRed',
 * 'blinkOrange', 'snakeGreenRed', 'fire', 'standard', 'red', 'green',
 * 'redSnake','blank', 'rightMissile', 'leftMissile', 'doubleMissile',
 * 'frontLeftGreenOthersRed', 'frontRightGreenOthersRed',
 * 'rearRightGreenOthersRed','rearLeftGreenOthersRed', 'leftGreenRightRed',
 * 'leftRedRightGreen','blinkStandard'
 *            'rate' is #blinks per second
 *            'duration' is length of animation in seconds
 *
 *      'video' -with arguments:
 *                 [IP address, port]
 *       to stream video using a tcp socket with destination <IP, port>
 *       or stop sending video if no arguments.
 *
 *      'calibrate' - no arguments
 *       to calibrate the magnetomer
 *
 *      'animate' -with arguments:
 *                  [animation, duration (in msec)]
 *
 *      where animation is 'phiM30Deg', 'phi30Deg', 'thetaM30Deg',
 * 'theta30Deg', 'theta20degYaw200deg', 'theta20degYawM200deg', 'turnaround',
 *  'turnaroundGodown', 'yawShake', 'yawDance', 'phiDance', 'thetaDance',
 *  'vzDance', 'wave', 'phiThetaMixed', 'doublePhiThetaMixed', 'flipAhead',
 *  'flipBehind', 'flipLeft', 'flipRight']
 *
 *      'ftrim' - no arguments
 *     calibrate gyros offsets
 *
 *
 */

var newCommand = function(delay, command, args) {
    return {when: delay || 0, op: command, args: args};
};

var emergency = exports.emergencyBundle = function() {
    return new ArDroneBundle([newCommand(-1, "emergency",[])]);
};

var ArDroneBundle = exports.ArDroneBundle = function(commands) {
    this.commands = commands || [];
    this.tasks = [];
};

var parse = exports.parseBundle = function(str) {
    return new ArDroneBundle(JSON.parse(str));
};

ArDroneBundle.prototype.toJSON = function() {
    return JSON.stringify(this.commands);
};

/**
 * Tracker type is:
 *
 *  {op: <string>, args: Array.<Object>, startedAt: num, shouldStartAt: num,
 *   timeout: <timeoutId>}
 *
 * @return {Array.<Tracker>} Info on scheduled commands for this bundle.
 *
 */
ArDroneBundle.prototype.getTasks = function() {
    return this.tasks;
};

ArDroneBundle.prototype.abort = function() {
    this.tasks.forEach(function(tracker) {
                           if ((!tracker.startedAt) &&
                               (tracker.timeout !== undefined)) {
                               clearTimeout(tracker.timeout);
                           }
                       });
};

/**
 * Schedules this bundle for execution. 
 * 
 * @param client {Object} A client session to talk to the drone.
 * @param startTime {number} Time to start executing the bundle,
 * expressed in miliseconds since 1/1/1970 UTC.
 * @param prologF {function(): void} An optional function that executes
 * just before the first command in the bundle executes. 
 * 
 *  @return {number} 0 if the bundle was ignored because it was too
 * late or the starting time of the last command in the bundle
 * (milliseconds since 1/1/1970 UTC)
 * 
 */
ArDroneBundle.prototype.schedule = function(client, startTime, prologF) {
    var doFun = function(tracker, prolog) {
        var op = tracker.op;
        var args = tracker.args;
        var cl = client.cl;
        var control = client.udpCon;
        var video = client.video;
        var wifi = client.wifiData;
        return function() {
            if (typeof prolog === 'function') {
                prolog();
            }
            tracker.startedAt = new Date().getTime();
            switch (op) {
            case 'emergency':
                control.ref({emergency: true});
                break;
            case 'disableEmergency':
                cl.disableEmergency();
                break;
            case 'takeoff':
                cl.takeoff();
                break;
            case 'land':
                cl.land();
                break;
            case 'stop':
                cl.stop();
                break;
            case 'move':
                cl.right(args[0]); // roll
                cl.back(args[1]);// pitch
                cl.up(args[2]); // gaz
                cl.clockwise(args[3]);// yaw
                break;
            case 'ledAnimation':
                config.prefixMultiConfig(control);
                control.animateLeds(args[0], args[1], args[2]);
                break;
            case 'animate':
                config.prefixMultiConfig(control);
                control.animate(args[0], args[1]);
                break;
            case 'ftrim':
                control.raw('FTRIM');
                break;
            case 'calibrate':
                cl.calibrate(0); // magnetometer
                break;
            case 'video':
                video.connect(args[0], // IP address
                              args[1]); // Port
                break;
            case 'wifiScan':
                wifi && wifi.scan();
                break;
            default:
                console.log("Ignoring command " + op);
                return false;
            }
            /*
            DO NOT FLUSH
             The client  is using the same control channel and flushing it
             every  30 msec. If we flush for each command they will be send
             as separate packets and will likely get ignored (i.e., if #packets
             per second is too high).

             The drawback is that we can only get >30 msec timing precision, but
             clock synchronization  is likely to be worse than that anyway...

            //control.flush();
            */
            return true;
        };
    };
    var now =  new Date().getTime();
    var t = startTime || now;
    if (t < now) {
        console.log('Ignoring bundle: Too late!: time now ' + now +
                    ' and should have started at ' + t);
        return 0;
    } else {
        this.tasks = [];
        var self = this;
        var isFirstCommand = true;
        this.commands.forEach(function(x) {
                                  var tracker = {op: x.op, args: x.args};
                                  var prolog =(isFirstCommand ? prologF : null);
                                  isFirstCommand = false;
                                  var task = doFun(tracker, prolog);
                                  if (x.when >= 0) {
                                      t = t + x.when;
                                      var delay = t - now;
                                      tracker.shouldStartAt = t;
                                      tracker.timeout = setTimeout(task, delay);
                                      self.tasks.push(tracker);
                                  } else {
                                      process.nextTick(task);
                                  }
                              });
        return t;
    }
};

ArDroneBundle.prototype.disableEmergency = function(delay) {
    this.commands.push(newCommand(delay, 'disableEmergency', []));
    return this;
};

ArDroneBundle.prototype.takeoff = function(delay) {
    this.commands.push(newCommand(delay, 'takeoff', []));
    return this;
};


ArDroneBundle.prototype.land = function(delay) {
    this.commands.push(newCommand(delay, 'land', []));
    return this;
};

ArDroneBundle.prototype.stop = function(delay) {
    this.commands.push(newCommand(delay, 'stop', []));
    return this;
};

ArDroneBundle.prototype.move = function(roll, pitch, gaz, yaw, delay) {
    this.commands.push(newCommand(delay, 'move',
                                  [roll, pitch, gaz, yaw]));
    return this;
};

ArDroneBundle.prototype.blink = function(ledAnimation, rate, duration,
                                         delay) {
    this.commands.push(newCommand(delay, 'ledAnimation',
                                  [ledAnimation, rate, duration]));
    return this;
};

ArDroneBundle.prototype.video = function(ipAddress, port, delay) {
    this.commands.push(newCommand(delay, 'video', [ipAddress, port]));
    return this;
};

ArDroneBundle.prototype.wifiScan = function(delay) {
    this.commands.push(newCommand(delay, 'wifiScan', []));
    return this;
};

ArDroneBundle.prototype.ftrim = function(delay) {
    this.commands.push(newCommand(delay, 'ftrim', []));
    return this;
};

ArDroneBundle.prototype.calibrate = function(delay) {
    this.commands.push(newCommand(delay, 'calibrate', []));
    return this;
};

ArDroneBundle.prototype.animate = function(animation, duration, delay) {
    this.commands.push(newCommand(delay, 'animate',
                                  [animation, duration]));
    return this;
};

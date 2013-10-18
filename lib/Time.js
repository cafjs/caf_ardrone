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
 * Corrects current time with a computed offset
 *
 *
 */


// adjuster has a getOffset() method
var Time = exports.Time = function(adjuster) {
    this.adjuster = adjuster;
};

Time.prototype.getTime = function() {
    var result = new Date().getTime();
    if (this.adjuster) {
        result = result + this.adjuster.getOffset();
    }
    return result;
};

Time.prototype.setAdjuster = function(adjuster) {
    this.adjuster = adjuster;
};

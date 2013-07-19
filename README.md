# CAF (Cloud Assistant Framework)

Co-design permanent, active, stateful, reliable cloud proxies with your web app.

See http://www.cafjs.com 

## CAF Library to interact with AR drone hardware 

This is a wrapper to the node.js ar-drone library in

https://github.com/felixge/node-ar-drone

that adds serialization and timing constraints to a bundle of commands.


## API

    var cafDr = require('caf_ardrone');
     
    var b1 = new cafDr.ArDroneBundle();
    b1
    .takeoff(10000) // takeoff in 10 seconds
    .move(0, 0, 0.5, 0, 5000) // 5 sec later move up at half top speed 
    .stop(5000) // 5 sec later hover at that altitude
    .video('15.135.32.12', 9832, 0) // forward  video to that IP/port
    .move(0, 0, 0, 0.05, 2000) // slowly turn around in-place
    .land(100000) // 100 sec later land
    .video(null, 0, 0); // switch off camera
    
    var cl = cafDr.client({ip: '127.0.0.1'}) // node running in the drone
    b1.schedule(cl); // do it now
    b1.schedule(cl, new Date().getTime()+60*60*1000); // do it again in 1 hour
    b1.schedule(cl, new Date().getTime()+120*60*1000); // do it again in 2 hours

    // same actions, different drone
    var cl2 = cafDr.client({ip: '192.168.1.7'}) // node running in laptop
    b1.schedule(cl2, new Date().getTime()+60*60*1000); // do it in 1 hour
    
    // serialize/deserialize bundle
    var s1 = b1.toJSON();
    var b2 = cafDr.parseBundle(s1);
    b2.schedule(cl); // do the same actions now
    
    // change config properties
    cl.config
    .euler_angle_max(0.52) // 30 degrees
    .altitud_max(10000) // 10 meters
    .control_vz_max(1000) // 1 m/sec max vertical speed
    .video_codec('H264_720P_CODEC') // high res video
    .bitrate(4000) // video at 4 mbits/sec
    .update();
    
    // read navdata
    var last = cl.navData.last()  // most recent snapshot of navdata
    console.log('timestamp': last.now + ' data:' + JSON.stringify(last.data));
    var all = cl.navData.all() // array with the last 100 snapshots
    cl.navData.velocity() // safe shortcut to last().data.demo.velocity

    // read gps data (needs gpsd installed in drone and USB GPS dongle)
    var last = cl.gpsData.last()  // most recent snapshot of gpsdata
    console.log('timestamp': last.now + ' data:' + JSON.stringify(last.data));
    var all = cl.gpsData.all() // array with the last 100 snapshots
    cl.gpsData.lat() // safe shortcut to last().data.lat (i.e., lattitude)
        

## Configuration Example

### framework.json

None

### ca.json

None
  
    
        
            
 

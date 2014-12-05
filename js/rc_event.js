//
//  Event Class
//	-----------
//		Basic event characteristics that can be extended with application-specific code
//

function rc_Event( options )
{
	var t = this;

    var defaults = {
    	date	    : 1375416000000,
        start       : '07:00',      // 7am
        duration    : 60,           // 60 minutes
        prep_time   : 0,            // pre-event room preparation time
        cleanup_time: 0,            // post-event room
        resource    : 'none'        // remove from this resource when added to another
        written_to_server : false, 
    };

	t.attr = $extend( true, {}, defaults, options );

	t.attr.end = addMinutes_timeOfDay(
            t.attr.start,
            t.attr.duration
            + t.attr.prep_time
            + t.attr.cleanup_time );
}


//
//	EventManager Class
//  ------------------
//		Tracks events known to the client
//		Manages updates to/from the server
//

function rc_EventManager( )
{
    var t = this;

    var to_write = [];

    t.createEvent = function( options ) {
    	var new_event = new Event( options )
    	to_write.push( new_event );
    	return new_event;
    }

    return t;
}

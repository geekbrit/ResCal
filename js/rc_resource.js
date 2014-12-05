//
//	Resource Class
//	--------------
//		Calendars are associated with one or more resources
//		When a Calendar is rendered, it retrieves a list of Events from each
//		associated Resource for each timeslot being rendered.
//

//  Usage Models:
//		1: transient data initialized from static array loaded from server on startup
//		2: live Ajax retrieval / storage
//		3: live Ajax + localStorage for offline working


//--- TEST DATA -------------------------------------------------------
var init_resource = {
	Room1:{title:"Orca",capacity:250,location:"Rochester North"},
	Room2:{title:"Narwhal",capacity:50,location:"Rochester North"},
	Room3:{title:"Walrus",capacity:500,location:"Rochester East"},
};
var init_resource_events = {
	Room1:[0,1,2,3],
	Room2:[4,5,6,7],
	Room3:[8,9,10,11]
}
//--- END TEST DATA ---------------------------------------------------

//--- Application-specific event acceptance criteria
//--- Example - reject events if the resource does not have the required capacity
var resource_reject_event = function( event, t ){
 		if( event.attendance > t.attr.capacity ) {
 			return "This room does not have the capacity required for the event ("
 				   +event.attendance+")";
 		} 
 		else {
 			return false;
 		}

    }


function Resource( resource_id, init_mode ) {
	var t = this;

	t.eventpool = [];
	t.id = resource_id;

	// initialization
	switch( init_mode )
	{
		case 'localtest': {
			t.attr = init_resource[resource_id];
			t.eventpool = init_resource_events[resource_id];
			break;
		}

		default: alert("unrecognized Resource initialization mode");
	}


	t.AddEvent = function( event ){
		if( reason = resource_reject_event( Events[event], t ) ) {

		}
		else {
			if( -1 == t.eventpool.indexOf(event) ){
				insertIntoSortedList(event,t.eventpool,function(a,b){a.start-b.start})
			}
		}

	}

	t.MoveEvent = function( event, destination ){
	
	}

	return t;
}
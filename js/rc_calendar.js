//
//  Resource Calendar Plugin
//  ========================
//
(function($) {

    var defaults = {
        // view-specific settings
        render          : 'view_week',
        render_event    : 'view_week_render_event',
        get_time_offset : function( event, ui ){return ui.offset.top - event.target.offsetTop;},

        min_time        : '07:00',   // 7am
        max_time        : '20:00',   // 8pm
        interval        : 20,        // minutes
        intervalpixels  : 24, 
        weekends        : false,
        startweek       : 1,        // 0=Sunday, 1=Monday...

        default_duration : 55,      // event duration to apply when dragging a new
                                    // event onto a calendar

        resource_filters : [],
        days        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    };

    $.fn.rc_calendar = function( options ) {

        // method calling
        if (typeof options == 'string') {
            var args = Array.prototype.slice.call(arguments, 1);
            var res;
            this.each(function() {
                var calendar = $.data(this, 'rc_Calendar');
                if (calendar && $.isFunction(calendar[options])) {
                    var r = calendar[options].apply(calendar, args);
                    if (res === undefined) {
                        res = r;
                    }
                    if (options == 'destroy') {
                        $.removeData(this, 'rc_Calendar');
                    }
                }
            });
            if (res !== undefined) {
                return res;
            }
            return this;
        }

        options = $.extend( true, {}, defaults, options );

        this.each(function(i, _element) {
            var element = $(_element);
            var calendar = new Calendar( element, options );
            element.data('rc_Calendar', calendar);
            calendar.render(1375293414903);
        });

        return this;
    }


//
//  Calendar Class
//  ==============
//      Calendar provides rendering services for resources and events
//      within a wrapper calendar element.
//      Calenda also provides callbacks for dragged and dropped events,
//      manages moving events between Resources
//
//
//  Views
//  -----
//      view_day    : day by interval slots vertically, Resources horizontally
//      view_week   : 1 week calendar per Resource, interval slots vertically, days horizontally
//      view_month  : 1 month calendar per Resource, Event titles listed in day slots
//
//      view_day_h  : day by interval slots horizontally, Resources vertically
//      view_week_h : 1 week calendar per Resource, interval slots horizontally, days vertically
//
//
//  Methods
//  -------
//      set_filter( test_name, test_function )
//          Resources.attribute has to pass test to be included in render
//
//      delete_filter( test_name )
//          filters can be disabled by setting their function to always return true,
//          alternatively they can be deleted from the resource_filters list using this function
//

function Calendar( element, options )
{
    var t = this;

//--- Exports ---
    t.element = element;
    t.options = options;

    //
    // look for <resource> elements within the calendar entity,
    // create a resource object for each, and bind it to the calendar
    //
    t.resources = [];
    element.find('resource').each( function(i,element) {
        t.resources[$(this).attr('id')] = new Resource($(this),'localtest');
    });

    t.eventmanager = new rc_EventManager();


//--- Public Methods ---

    t.render  = function( date )
    // date : epoch milliseconds
    {
        // [TODO - filter resources]
        //var resources = filter_resources();
        t[t.options.render]( date, t.resources );

        //
        // Code to handle internal / external events dropped onto a resource
        // Find where/when the event was dropped, create a new event object
        //
        //  Trick... external events have 'in_palette' class
        //

        $('.rc_day_target').droppable({
            drop: function( event, ui ) {
                var dragged     = $(ui.draggable[0]);
                var target      = $(event.target);
                var time_offset = t.options.get_time_offset( event, ui );
                var start_time  = nearest_time( time_offset );
                var date        = new moment( parseInt(target.attr('data-date'),10) ); 
                var resource_id = target.parent().attr('id');

                if( dragged.hasClass('in_palette') ) {
                    // this is a new event dragged from an external palette
                    // the resource onto which this event has dropped *may*
                    // reject it.
                    new_event = t.eventmanager.createEvent(
                        target,
                        t.resources[resource_id],
                        {
                            start    : start_time,
                            date     : date,
                            duration : t.options.default_duration,
                            ev_type  : dragged.attr('data-evtype'),
                            ev_text  : dragged.text(),

                            // [TODO - abstract user-added attributes]
                            capacity : 10
                        },
                        t[t.options.render_event]
                    );
                }
                else
                {
                    // This is an existing event that has been moved
                    var this_event = t.eventmanager.Events[ dragged.attr('id') ];

                    if( t.eventmanager.moveEvent(
                            this_event,
                            target,
                            t.resources[this_event.attr.resource],
                            t.resources[resource_id],
                            {
                                start    : start_time,
                                date     : date,
                            },
                            t[t.options.render_event]
                        ) ) {
                        // was able to render in the new position, delete the original
                        dragged.remove();
                    }

                }
            }
        });
    }

    t.view_week = function( date, resources )
    // date : epoch milliseconds
    // resources : list of resource objects associated with this calendar
    {
        for( resource in resources ) {
            display_week( date,  t.resources[resource] );
        }
    }


    t.view_week_render_event = function( evt )
    // evt : event object
    {
        // Delete the old copy of this element if it exists
        if( $('#'+evt.attr.id).length) {
            $('#'+evt.attr.id).remove( );
        }

        var elapsed_mins= evt.attr.prep_time + evt.attr.duration + evt.attr.cleanup_time;

        evt.attr.end    = addMinutes_timeOfDay(
                            evt.attr.start,
                            elapsed_mins,
                            evt.attr.start ).newtime;


        evt.attr.t_offset = ~~(diffMinutes_timeOfDay( t.options.min_time, evt.attr.start ) / t.options.interval * t.options.intervalpixels);
        evt.attr.t_height = ~~((elapsed_mins / t.options.interval) * t.options.intervalpixels) -2;
        evt.attr.t_prepad = ~~((evt.attr.prep_time / t.options.interval) * t.options.intervalpixels);
        evt.attr.t_postpad= ~~((evt.attr.cleanup_time / t.options.interval) * t.options.intervalpixels);

        var eventdiv = $( render_week_event(evt) );
        var newev = $(eventdiv);

        $('#'+evt.attr.parent).append( newev );

        newev.draggable({
            appendTo : 'body',
            helper   : 'clone',
            zIndex   : 9999,
/*          drag     : function( event, ui ){
                        var time_offset = t.options.get_time_offset( event, ui );
                        var start_time  = nearest_time( time_offset );
                        ui.helper.find(".rc_event_head").text(start_time);
                       }
*/
        }).resizable({
            handles: 's',

            stop: function( event, ui ){
                var snapheight = ~~(ui.size.height/t.options.intervalpixels);
                var total_mins = snapheight*t.options.interval;

                evt.attr.duration = total_mins - (evt.attr.prep_time + evt.attr.cleanup_time);
                ui.helper.css('height',snapheight * t.options.intervalpixels -2 + 'px');
            }

        }).click( function(){
            rc_event_edit( evt, t.view_week_render_event );
        });

        return false;   // this is a fix for form submit callback
    }

    t.external_events_init = function( events ) {
        for( var event = 0; event < events.length; event++ )
        {
            $(events[event]).draggable({
                zIndex: 999,
                revert: true,      // will cause the event to go back to its
                revertDuration: 0,  //  original position after the drag
                helper: 'clone',
                cursorAt: { top: 5, left: 5 }
            });
        }
    }


//--- Private Methods ---
    function nearest_time( offset )
    {
        return addMinutes_timeOfDay(
            t.options.min_time,
            ~~(offset / t.options.intervalpixels) * t.options.interval,
            t.options.max_time
        ).newtime;
    }

    function filter_resources()
    {
        var valid_resources = [];
        for( var resource in t.resources ) {
            var passed = true;
            for( var test in t.options.resource_filters ) {
                if( !test( resource ) ) {
                    passed = false;
                    break;
                }
            }
            if( passed ) {
                valid_resources.push( resource );
            }
        }
        return valid_resources;
    }



    function display_week( date, resource )
    // date : epoch milliseconds
    // resource : resource object containing events for this calendar
    {
        var params = {};
            params.days = [];
            params.months = [];
            params.dows = [];
            params.dates = [];
            params.min_time = t.options.min_time;
            params.max_time = t.options.max_time;
            params.inc_time = t.options.interval;
            params.resource_id = resource.id;
            params.resource_name = resource.attr.title;
            params.resource_location = resource.attr.location;

        if( t.options.weekends ) {
            params.col_class = 'col_7dayweek';
            params.col_count = 7; 
        }
        else
        {
           params.col_class = 'col_5dayweek';
           params.col_count = 5;
        }

        var dcalc = new Date( date_StartOfWeek( date, t.options.startweek ) );

        //--- header ---
        for(var i = 0; i < params.col_count; i++ ) {
            params.dates[i] = dcalc.valueOf();
            params.dows[i]  = t.options.days[ (i+t.options.startweek) % 7 ];
            params.months[i]= (1+dcalc.getMonth());
            params.days[i]  = dcalc.getDate();
            dcalc.setDate( dcalc.getDate() + 1 );
        }

        t.element.append( render_week( params ) );
    }

}


//
//  Event Class
//  -----------
//      Basic event characteristics that can be extended with application-specific code
//

function rc_Event( options )
{
    var t = this;

    var defaults = {
        id          : new Date().getTime(),
        date        : 1375416000000,
        start       : '07:00',          // 7am
        duration    : 60,               // 60 minutes
        prep_time   : 0,                // pre-event room preparation time
        cleanup_time: 0,                // post-event room
        resource    : 'none',           // remove from this resource when added to another
        written_to_server : false 
    };

    t.attr = $.extend( true, {}, defaults, options );
}


//
//  EventManager Class
//  ------------------
//      Tracks events known to the client
//      Manages updates to/from the server
//

function rc_EventManager( )
{
    var to_write = [];
    var t = this;
    t.Events = [];

    t.createEvent = function( parent, resource, options, render ) {
        var new_event = new rc_Event( options );
        var id = new_event.attr.id;

        t.Events[ id ] = new_event;
        to_write[id] = true;

        if( resource.addEvent( new_event ) ) {
            new_event.attr.resource = resource.id;
            new_event.attr.parent   = parent.attr('id');  // div in which this event currently resides
            render( new_event );
        }

        return new_event;
    }

    t.moveEvent = function( evt, parent, old_resource, new_resource, options, render) {
        to_write[evt.attr.id] = true;

        // have to update event attributes before attempting to move the event,
        // but have to be prepared to revert them if the new resource rejects the event

        var stash = evt.attr;

        evt.attr.start   = options.start;
        evt.attr.date    = options.date;      
        evt.attr.t_offset= options.t_offset;


        //
        //  A bit of cunning code that handles inter- and intra- resource moves
        //  lazy-evaluation of boolean tests ensures 'removeEvent' happens only for inter-resource moves
        //
        if(
            ((old_resource.attr.id == new_resource.attr.id) && new_resource.addEvent( evt ))
            || ((old_resource.attr.id != new_resource.attr.id) && new_resource.addEvent( evt ) && old_resource.removeEvent( evt ))
          ) {
            // event accepted
            evt.attr.resource = new_resource.id;
            evt.attr.parent   = parent.attr('id');
            render( evt );
            return true;
        }
        else {
            evt.attr = stash;
            return false;
        }
    }

    return t;
}



//
//  Resource Class
//  --------------
//      Calendars are associated with one or more resources
//      When a Calendar is rendered, it retrieves a list of Events from each
//      associated Resource for each timeslot being rendered.
//

//  Usage Models:
//      1: transient data initialized from static array loaded from server on startup
//      2: live Ajax retrieval / storage
//      3: live Ajax + localStorage for offline working


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


function Resource( resource_element, init_mode ) {
    var t = this;

    //
    //  To optimize searching and drawing times, events are grouped
    //  by date (each event has 'midnight' at the start of the day encoded within it)
    //
    t.eventpool = [];

    t.id = resource_element.attr('id');

    // initialization
    switch( init_mode )
    {
        case 'localtest': {
            t.attr = init_resource[t.id];
            //t.eventpool = init_resource_events[t.id];
            break;
        }

        default: alert("unrecognized Resource initialization mode");
    }

    //
    // Set up automated event acceptance test (application-level function)
    //      This test can be as complex as you like, but should at least
    //      perform basic sanity checking such as ensuring that (for example)
    //      a room can accommodate all of the attendees for a meeting
    t.attr.validateFn = window[resource_element.attr('data-validate')];
    t.attr.validateParams = $.parseJSON(resource_element.attr('data-params'));

    if( !$.isFunction( t.attr.validateFn ) ) {
        t.attr.validateFn = window['void'];     // default to a do-nothing
    }

    //
    //  addEvent
    //  --------
    //      Perform sanity check on whether this event can be placed in this resource
    //      Reasons for rejection may be:
    //          Resource not available on specified day
    //          Event has requirements that the Resource can not provide (eg seating capacity)
    //      "Reasons" are application specific and are registered as callbacks read from the
    //      resource declaration
    //
    //  returns
    //      true : could add the event
    //      false: unable to add the event
    //
    t.addEvent = function( event ){
        if( reason = t.attr.validateFn( event.attr, t.attr.validateParams ) ) {
            rc_notify('Unable to add the event','The '+reason+' requirement was not met', 'error');
            return false;
        }
        else {

                // [TODO - add in policy code for overlapping events, locked events]



            if( "undefined" == typeof( t.eventpool[event.attr.date] ) ){
                t.eventpool[event.attr.date] = [];
            }

            t.eventpool[event.attr.date][event.attr.id] = event;
            
            var formatted_date = new moment( event.attr.date ).format("dddd, Do MMM YYYY");

            rc_notify('Success',
                    'Added '+event.attr.ev_text+' to '+t.attr.title+' at '+event.attr.start+' on '+formatted_date,
                    'success');
        }
        return true;
    }

    t.removeEvent = function( event ){
        t.eventpool[event.attr.date][event.attr.id] = undefined;
    }

    //t.findCollisions = function( event )

    return t;
}

}(jQuery))



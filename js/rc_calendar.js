//=============================================================================
//
//  Resource Calendar Plugin
//  ========================
//      Flexible booking management system. This file contains:
//          rc_calendar - routes rendering of calendars and bookings to
//                        app-specific rendering functions (examples
//                        provided in test.html)
//                      - handles DOM events related to bookings
//
//          rc_resource - groups bookings for a particular resource such as a
//                        room or member of staff. When rendering a calendar
//                        for a particular day, the associated Resource returns
//                        a list of bookings for that day
//
//          rc_eventManager
//                      - manages movement of bookings between resources
//                      - calls user-supplied functions for booking retrieval,
//                        persistence and deletion
//=============================================================================
//  Author    : Peter Maloy, August 2013
//  Repository: https://github.com/geekbrit/ResCal
//=============================================================================
(function($) {

    var defaults = {
        // view-specific settings
        startdate       : new moment().valueOf(),
        render          : 'view_week',
        render_event    : 'view_week_render_event',
        postcalrender   : function(){},

        // get_time_offset calculates distance in pixels of booking from start-of-day
        get_time_offset : function( draggable, droppable ){         
                                return draggable.offset.top - droppable.offset().top;
                          },

        // persistent event storage accessor functions
        // (override with application functions in rc_calendar constructor call)
        persist         : function( evt ){},
        retrieve        : function(){ return [] },
        remove          : function(){},

                          // default insert_policy is simple - do nothing, allow overlaps:
        insert_policy   : function( event_list, evt, end_of_day ){}, 

        min_time        : '07:00',   // 7am
        max_time        : '20:00',   // 8pm

        get_open_time   : function( date_ms, resource ){ return ['07:00','20:00']; },

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
            calendar.render( options.startdate );
            calendar.initialize_events();
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
    var global_timeformat;

//--- Exports ---
    t.element = element;
    t.options = options;
    t.options.baseminutes = convert_to_minutes(t.options.min_time); // used for event rendering

    global_timeformat = t.options.min_time[-1] == 'm';  // true if times in am/pm format
                                                        // almost certainly a localization
                                                        // problem here

    //
    // look for <resource> elements within the calendar entity,
    // create a resource object for each, and bind it to the calendar
    //
    t.resources = [];
    element.find('resource').each( function(i,element) {
        t.resources[$(this).attr('id')] = new rc_resource( $(this), t.options.get_open_time );
    });
    t.resources['unassigned_event_resource'] = new rc_resource( $('#unassigned_event_resource'), function(){return[t.options.min_time,t.options.max_time]} );

    t.initialize_events = function(){
        t.eventmanager = new rc_EventManager( t.options.retrieve,
                                              t.options.persist,
                                              t.options.remove,
                                              t.options.insert_policy,
                                              t.resources,
                                              t[t.options.render_event] );
    }


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

                // event.target gets confused if the viewport is smaller than the droppable,
                // and the scrolled droppable 'virtually' overlaps droppables from another viewport.
                // This function call ensures that the visible droppable is used
                var target_id    = findDroppable( ui );
                
                // the other half to this problem is that this function gets called twice,
                // once for the calendar that you dropped the event on, and once for the
                // "shadow" calendar hidden underneath it.

                if( target_id != event.target.id ) {
                    return; // oops... wrong one
                }

                var target = $('#'+target_id);

                var time_offset = t.options.get_time_offset( ui, target );
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
                            date     : date.valueOf(),
                            duration : t.options.default_duration,
                            ev_type  : dragged.attr('data-evtype'),
                            ev_text  : dragged.text(),

                            // [TODO - abstract user-added attributes]
                            capacity : 10
                        }
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
                                date     : date.valueOf(),
                            }
                        ) ) {
                        // was able to render in the new position, delete the original
                        dragged.remove();
                    }

                }
            }
        });

        // let the application do any required post-render cleanup:
        t.options.postcalrender( t );
    }


    t.view_day = function( date, resources )
    // date : epoch milliseconds
    // resources : list of resource objects associated with this calendar
    {
        display_day( date,  resources );
    }

    t.view_week = function( date, resources )
    // date : epoch milliseconds
    // resources : list of resource objects associated with this calendar
    {
        for( resource in resources ) {
            if( resource != "unassigned_event_resource" ){
                display_week( date,  t.resources[resource] );
            }
        }
    }


    t.view_week_render_event = function( evt, date_changed )
    // evt : event object
    {
        // Delete the old copy of this element if it exists
        if( $('#'+evt.attr.id).length) {
            $('#'+evt.attr.id).remove( );
        }

        // find new parent if the date has changed
        // not a valid operation if the event is in the unassigned resource
        if( date_changed && "unassigned_event_resource" != evt.attr.resource ){ 
            $('#'+evt.attr.resource+' > .rc_day_target').each( function(){
                if( evt.attr.date == $(this).attr('data-date') ){
                    evt.attr.parent = $(this).attr('id');
                    return;
                }
            });
        }

        evt.attr.t_offset = ~~(evt.attr.startmins - t.options.baseminutes) / t.options.interval * t.options.intervalpixels;
        evt.attr.t_height = ~~(((evt.attr.endmins-evt.attr.startmins) / t.options.interval) * t.options.intervalpixels) -2;
        evt.attr.t_prepad = ~~((evt.attr.prep_time / t.options.interval) * t.options.intervalpixels);
        evt.attr.t_postpad= ~~((evt.attr.cleanup_time / t.options.interval) * t.options.intervalpixels);

        $('#'+evt.attr.parent).append( render_calendar_event(evt) );
        var newev = $('#'+evt.attr.id);

        newev.find('.deleteevent').click(function(event){
            event.stopPropagation();

            if( confirm("You are about to delete this event; this action can not be undone! Confirm deletion?") ){
                t.eventmanager.deleteEvent( evt.attr.id );
            }
                     


        });

        if( !evt.attr.locked ){
            newev.draggable({
                scroll   : true,
                appendTo : 'body',
                helper   : 'clone',
                zIndex   : 9999,
                drag     : function( event, ui ){
                            
                            var target = findDroppable( ui );

                            if( target ){
                                var tgtdiv = $('#'+target);
                                var time_offset = t.options.get_time_offset( ui, tgtdiv );
                                var start_time  = nearest_time( time_offset );
                                ui.helper.find(".rc_event_head").text(start_time);
                            }

                        }
            }).resizable({
                handles: 's',

                stop: function( event, ui ){
                    var snapheight = ~~((ui.size.height+(t.options.intervalpixels/2))/t.options.intervalpixels);
                    var total_mins = snapheight*t.options.interval;

                    evt.set_duration( total_mins - (evt.attr.prep_time + evt.attr.cleanup_time) );
                    ui.helper.css('height',snapheight * t.options.intervalpixels -2 + 'px');
                    t.view_week_render_event(evt);
                    t.options.persist(evt);

                }
            })
        }

        newev.click( function(){
            rc_event_edit( evt, function(evt, date_changed){
                t.view_week_render_event(evt, date_changed);
                t.options.persist(evt);
                return false;
            });
        });

        return false;   // this is a fix for form submit callback
    }

    //
    //  External Events Initialization
    //
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
            ~~((offset + t.options.intervalpixels/2) / t.options.intervalpixels) * t.options.interval,
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

    //
    //  findDroppable
    //  =============
    //      Called during dragging and on drop, this function returns the id of a div beneath
    //      the draggable object, if that div is visible and a droppable target.
    //
    function findDroppable( ui )
    {
        retval = false;
        var pos = ui.offset;

        // [TODO] should probably cache this selection...
        $('.ui-droppable').each(function(){

            var parent = $(this).parent();
            // fixed elements get left behind in the coordinate system when the page is scrolled
            var adjust_scroll = (parent.css('position') == 'fixed') ? $('body').scrollTop() : 0;
            var viewableTop = parent.position().top + adjust_scroll;
            var viewableBottom = viewableTop + parent.height() + adjust_scroll;

            if( viewableTop == viewableBottom ){
                viewableBottom = viewableTop + $(this).height() + adjust_scroll;
            }

            if( pos.top  > viewableTop &&
                pos.top  < viewableBottom &&
                (pos.left + 20) > $(this).position().left &&
                pos.left < $(this).position().left + $(this).width() ){
                return retval = $(this).attr('id');
             }
        })

        return retval;
    }

    function display_day( date_ms, resources ) 
    // date : epoch milliseconds
    // resources : all resource objects
    {
        var date = new Date( date_ms );
        var dcalc = new moment( date );
        dcalc.startOf('day');

        var params = {};
            params.date_ms = dcalc.valueOf();
            params.months  = (1+date.getMonth());
            params.days = date.getDate();
            params.date = t.options.days[ date.getDay() ]
                        + " " + (1+date.getMonth())
                        + "/" + date.getDate();
            params.min_time = t.options.min_time;
            params.max_time = t.options.max_time;
            params.inc_time = t.options.interval;

            params.resources = [];
            for( i in resources ) {
                var openclose = t.options.get_open_time( date_ms, resources[i] );
                resources[i].opentime  = ((diffMinutes_timeOfDay( t.options.min_time, openclose[0] )/ t.options.interval) * t.options.intervalpixels);
                resources[i].closetime = ((diffMinutes_timeOfDay( openclose[1], params.max_time )/ t.options.interval) * t.options.intervalpixels);
                params.resources.push( resources[i] );
            }

        t.element.append( render_calendar( params ) );

        // show all known events for this resource
        for(var i in resources ) {
            var todays_events = resources[i].listEvents(dcalc.valueOf());

            if( undefined != todays_events ){
                for( var j in todays_events) {
                    t[t.options.render_event]( todays_events[j] );
                }
            }
        }
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
            params.opentime = [];
            params.closetime = [];
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

            var openclose = t.options.get_open_time( params.dates[i], resource );
            params.opentime[i]  = ((diffMinutes_timeOfDay( t.options.min_time, openclose[0] )/ t.options.interval) * t.options.intervalpixels);
            params.closetime[i] = ((diffMinutes_timeOfDay( openclose[1], params.max_time )/ t.options.interval) * t.options.intervalpixels);

            params.dows[i]  = t.options.days[ (i+t.options.startweek) % 7 ];
            params.months[i]= (1+dcalc.getMonth());
            params.days[i]  = dcalc.getDate();
            dcalc.setDate( dcalc.getDate() + 1 );
        }

        t.element.append( render_calendar( params ) );

        // show all known events for this resource
        for(var i = 0; i < params.col_count; i++ ) {
            var todays_events = resource.listEvents(params.dates[i]);

            if( undefined != todays_events ){
                for( var j in todays_events) {
                    t[t.options.render_event]( todays_events[j] );
                }
            }
        }
    }

}


//
//  Event Class
//  -----------
//      Basic event characteristics that can be extended with application-specific code
//
//  [REVIEW]
//  Ambivalent about global_timeformat; could be eliminated here and managed 
//  only in convert_to_time( t, ampm ) helper function.
//
function rc_Event( options )
{
    var t = this;

    t.set_start_time = function( s ) {
        if( "number" == typeof(s) ){
            t.attr.startmins = s;
            t.attr.start     = convert_to_time( s, global_timeformat ) ;
            t.attr.ampm      = global_timeformat;
        }
        else {
            t.attr.start     = s; 
            t.attr.startmins = convert_to_minutes( s );
            t.attr.ampm      = ( 'm' == s[-1] ); // if true, show times in 12hr am/pm format
        }

        t.attr.endmins   = t.attr.startmins + t.attr.duration + t.attr.prep_time + t.attr.cleanup_time;
        t.attr.end       = convert_to_time( t.attr.endmins, t.attr.ampm );
    }

    t.set_duration = function( d ) {
        t.attr.endmins += ( d - t.attr.duration );
        t.attr.duration = d;
        t.attr.end      = convert_to_time( t.attr.endmins, t.attr.ampm );
    }

    var defaults = {
        id          : new Date().getTime(),
        date        : 1375416000000,
        start       : '07:00',          // 7am
        duration    : 60,               // 60 minutes
        prep_time   : 0,                // pre-event room preparation time
        cleanup_time: 0,                // post-event room
        resource    : 'none',           // remove from this resource when added to another
        locked      : false,            // when locked, can not be dragged, resized, or bumped
        written_to_server : false
    };

    t.attr = $.extend( true, {}, defaults, options );

    // prepare internal representation of times
    t.set_start_time( t.attr.start );

    return t;
}


//
//  EventManager Class
//  ------------------
//      Tracks events known to the client
//      Manages updates to/from the server
//

function rc_EventManager( retrieve_events, save_event, delete_event, insert_policy, resources, display )
{
    var render        = display;
    var persistEvent  = save_event;
    var killEvent     = delete_event;
    var insert_policy = insert_policy;

    var t = this;

    t.Events = [];
    attrs = retrieve_events();

    for( var i in attrs ) {
        var evt = new rc_Event( attrs[i].attr );
        t.Events[evt.attr.id] = evt;
        if( undefined != resources[evt.attr.resource] ) {
            resources[evt.attr.resource].addEvent( evt );
            render( evt );
        }
    }

    t.moveEvent = function( evt, parent, old_resource, new_resource, options ) {

        // have to update event attributes before attempting to move the event,
        // but have to be prepared to revert them if the new resource rejects the event

        var stash = $.extend({},evt.attr);

        evt.set_start_time( options.start );
        evt.attr.date    = options.date;
        evt.attr.t_offset= options.t_offset;


        //
        //  A bit of cunning code that handles inter- and intra- resource moves
        //  lazy-evaluation of boolean tests ensures 'removeEvent' happens only for inter-resource moves
        //
        if(
            ((old_resource.id == new_resource.id) && new_resource.addEvent( evt ))
            || ((old_resource.id != new_resource.id) && new_resource.addEvent( evt ) && old_resource.removeEvent( evt ))
          ) {

            // event accepted, but may yet fail the insertion-overlap criteria test
            // unassigned event resource always accepts drop-ins
            if( 'unassigned_event_resource' == new_resource.id 
                || ! insert_policy( new_resource.listEvents( evt.attr.date ),
                                 evt,
                                 new_resource.get_open_time( evt.attr.date ),
                                 render,
                                 persistEvent ) ) {

                evt.attr.resource = new_resource.id;
                evt.attr.parent   = parent.attr('id');
                render( evt );
                persistEvent( evt );

                if(isNaN(evt.attr.date)){
                        rc_notify('Success',
                            'Added '+evt.attr.ev_text+' to Unassigned Events list',
                            'success');
                }
                else {
                    var formatted_date = new moment( evt.attr.date ).format("dddd, Do MMM YYYY");
                        rc_notify('Success',
                            'Added '+evt.attr.ev_text+' to '+new_resource.attr.title+' at '+evt.attr.start+' on '+formatted_date,
                            'success');
                }

                return false;

            }
        }
        
        // failed to insert into resource, or failed to fit into calendar
        new_resource.removeEvent( evt );
        evt.attr = $.extend({},stash);

        if( "none" == evt.attr.resource ) {
            killEvent( evt.attr.id );   // Was freshly dragged from the new events palette
        }
        else {
            old_resource.addEvent( evt );
            render( evt );          
        }

        return true;

    }

    t.createEvent = function( parent, resource, options ) {
        var new_event = new rc_Event( options );
        var id = new_event.attr.id;

        t.Events[ id ] = new_event;

        t.moveEvent( new_event, parent, resource, resource, options )

        return new_event;
    }

    t.deleteEvent = function( id ){
        t.Events[ id ] = undefined;
        $('#'+id).remove();
        killEvent( id );
    }

    return t;
}



//
//  rc_resource Class
//  -----------------
//      Calendars are associated with one or more resources
//      When a Calendar is rendered, it retrieves a list of Events from each
//      associated Resource for each timeslot being rendered.
//

//  Usage Models:
//      1: transient data initialized from static array loaded from server on startup
//      2: live Ajax retrieval / storage
//      3: live Ajax + localStorage for offline working


function rc_resource( resource_element, get_open_time ) {
    var t = this;

    //
    //  To optimize searching and drawing times, events are grouped
    //  by date (each event has 'midnight' at the start of the day encoded within it)
    //
    t.eventpool = {};

    t.id   = resource_element.attr('id');
    t.get_open_time = get_open_time;

    t.attr = $.parseJSON(resource_element.attr('data-attr'));

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
    //      no_confirm parameter allows known events to be populated on page load without
    //          causing "success" notifications to be generated
    //
    //  returns
    //      true : could add the event
    //      false: unable to add the event
    //
    t.addEvent = function( evt ){
        if( $.isFunction( t.attr.validateFn ) && (reason = t.attr.validateFn( evt.attr, t.attr.validateParams )) ) {
            rc_notify('Unable to add the event','The '+reason+' requirement was not met', 'error');
            return false;
        }
        else {

            if( "undefined" == typeof( t.eventpool[evt.attr.date] ) ){
                t.eventpool[evt.attr.date] = {};
            }

            t.eventpool[evt.attr.date][evt.attr.id] = evt;
        }
        return true;
    }

    t.removeEvent = function( evt ){
        if(    !isNaN(evt.attr.date) && "undefined" != typeof(t.eventpool[evt.attr.date]) ) {
            delete t.eventpool[evt.attr.date][evt.attr.id];
        }
        return true;
    }

    t.listEvents = function( date ){
        return t.eventpool[date];
    }

    return t;
  }

}(jQuery))



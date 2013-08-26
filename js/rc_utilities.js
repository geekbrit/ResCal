//=============================================================================
//
//  Interface & Helper Functions for rc_calendar.js
//  ===============================================
//      These functions are abstracted for two reasons:
//          1)  They may duplicate existing code in your application,
//              in which case they can be omitted or simplified to call
//              your functions.
//
//          2)  They provide generic interfaces to external plugins, allowing
//              you to replace the plugins used during rc_calendar development
//              with your preferred alternative. 
//
//              As an example, Pines Notify is used for notifications and modal
//              forms, but by retargeting the functions in this file you can
//              replace Pines Notify with your choice of plugin without
//              modifying rc_calendar.js.
//
//=============================================================================
//  Author    : Peter Maloy, August 2013
//  Repository: https://github.com/geekbrit/ResCal
//=============================================================================

function rc_notify( title, text, type ) {
    $.pnotify({
        title  : title,
        text   : text,
        type   : type,
        history: false,
        styling: 'jqueryui'
    });
}

function rc_event_edit( evt, callback ) {

    // check for guard element
    if( $('#nodupe-'+evt.attr.id).length ){
        return false;
    }

    var notice = $.pnotify({
        text: $('#form_event_edit').html(),
        icon: false,
        width: 'auto',
        hide: false,
        closer: true,
        sticker: false,
        insert_brs: false,
        styling: 'jqueryui'
    });

    var datepick = notice.find('.form_datepicker');
    datepick.datepicker({defaultDate:new Date(evt.attr.date)});

    // populate form fields
    notice.find('.pf-field').each( function(){
        var t = $(this);
        if( t.attr('id') in evt.attr ) {
            t.val(evt.attr[t.attr('id')]);
            // handle checkboxes
            if( t.attr('type') == 'checkbox' ) {
                t.prop("checked", evt.attr[t.attr('id')] );
            }
        }
    });

    // Add guard element
    notice.append("<input type='hidden' id='nodupe-"+evt.attr.id+"'>");

    notice.find('form.pf-form').submit(function() {
        
        // recover date
        var old_date  = evt.attr.date;
        evt.attr.date = datepick.datepicker("getDate").valueOf();

        //!!!! [TO DO] Validate form here

        /*
        var username = $(this).find('input[name=username]').val();
        if (!username) {
            alert('Please provide a username.');
            return false;
        }
        */

        // Update Event
        notice.find('.pf-field').each( function(){
            var t = $(this);
            if( t.attr('id') in evt.attr ) {
                if( t.attr('type') == 'checkbox' ) {
                    evt.attr[t.attr('id')] = t.prop("checked");
                }
                else if(typeof(evt.attr[t.attr('id')]) == 'number' ) {
                    evt.attr[t.attr('id')] = parseInt(t.val(),10);
                }
                else {
                    evt.attr[t.attr('id')] = t.val();
                }

                
            }
        });

        // Close the form
        $('#nodupe-'+evt.attr.id).remove();
        notice.pnotify({
            title: 'Thank you',
            text: 'Record successfully updated',
            icon: true,
            width: $.pnotify.defaults.width,
            hide: true,
            closer: true,
            sticker: true,
            type: 'success',
            styling: 'jqueryui'
        });

        return  callback( evt, evt.attr.date != old_date );        // Rerender the event
    });
}


//
//  insertIntoSortedList
//  ====================
//
function insertIntoSortedList(element, array, sortfunc) {
  array.splice(locationOf(element, array)+1, 0, element);
  return array;
}

//
//  locationOf
//  ==========
//      Used for insert into sorted list
//
function locationOf(element, array, start, end, sortfunc) {
  start = start || 0;
  end = end || array.length-1;
  var pivot = parseInt(start + (end - start) / 2);
  if( end-start <= 1 || 0 == sortfunc(array[pivot], element) ) return pivot;
  if( sortfunc(array[pivot], element) ) {
    return locationOf(element, array, pivot, end, sortfunc);
  } else {
    return locationOf(element, array, start, pivot, sortfunc);
  }
}


//
//  date_StartOfWeek
//  ================
//      return a date object corresponding to the start of
//      the week containing the specified week
//
function date_StartOfWeek( date, first_day_of_week )
// date : epoch milliseconds
// first_day_of_week : Sunday=0 through to Saturday=6
{
    var dcalc = new moment( date );
    var dow   = dcalc.day();

    dcalc.startOf('day');
    dcalc.subtract( 'days', (dow - first_day_of_week) );

    return dcalc;
}

//
//  addMinutes_timeOfDay
//  ====================
//      given a time of day as a string  in either military format (20:30)
//      or am/pm format (8:30pm), add the specified number of minutes and
//      return as a string in the same format, with a flag showing if the
//      result is greater than a 'target' value (aids for loops)
//
function addMinutes_timeOfDay( start, increment, end )
{
    var startmins = convert_to_minutes( start );
    var endmins   = convert_to_minutes( end );
    var newmins   = startmins + increment;

    var newtime = convert_to_time( newmins, ( 'm' == start[-1] ) );

    return { newtime:newtime, over:newmins >= endmins };
}

//
//  diffMinutes_timeOfDay
//  =====================
//      given two time of day strings  in either military format (20:30)
//      or am/pm format (8:30pm), return the difference between them in 
//      minutes.
//
//      Positive result implies t2 is equal to, or after t1
//
function diffMinutes_timeOfDay( t1, t2 )
{
    return convert_to_minutes( t2 ) - convert_to_minutes( t1 );
}

function convert_to_minutes( t )
{
    var parts = t.split(':');
    if( parts.length == 1 ){
        console.log( "Incorrect time format found in function addMinutes_timeOfDay - missing ':'");
        return 1440;
    }

    if( 'm' == t[-1] ){
        parts[1] = parts[1].splice(2,2);

        if( 'p' == t[-2] ){
            parts[0] = parseInt(parts[0],10) + 12;
        }
    }
    return 60 * parseInt(parts[0],10) + parseInt(parts[1]);
}

function convert_to_time( t, ampm )
{
    var hours = ~~(t/60);
    var mins  = t - (hours * 60);
    if( ampm ){
        if( hours > 12 ){
            hours -= 12;
            mins += 'pm';
        }
        else {
            mins += 'am';
        }
    }
    if(hours < 10){ hours = "0"+hours; }
    if(mins  < 10){ mins  = "0"+mins; }
    return hours + ':' + mins;
}


//
//  insert_shuffle_meeting
//  ======================
//      This is an example callback function that is called when an event is dropped onto
//      a resource calendar day.
//
//      This example attempts to insert the new event; if the new event overlaps an earlier
//      event, then it is bumped forward to the end of the existing meeting. Any existing
//      meetings starting at or after the new meeting are bumped forward, with gaps between
//      meetings being reduced to minimize disruptions to existing meetings.
//
//      The insert will fail if it would require a locked meeting to be bumped, or if a moved
//      meeting would be pushed beyond the end-of-day for the calendar.
//

function insert_shuffle_meeting( event_list, evt, open_times, persist, render ){

    var revert = {};
    var keys = [];

    for (var key in event_list) {
        if (event_list.hasOwnProperty(key)) {
            keys.push(key);
            revert[key] = $.extend({},event_list[key].attr);
        }
    }

    var sorted_event_list = keys.sort(function(a,b){ return event_list[a].attr.startmins - event_list[b].attr.startmins });
    
    var error;
    if( ( error = insert_shuffle_item( event_list, evt, sorted_event_list, open_times, persist, render )) )
    {
        // failed - report & revert to original start times
        rc_notify( "Failed to place event", error, "error" )

        for( var i = 0; i < keys.length; i++ ) {
            var this_evt = event_list[keys[i]];
            this_evt.attr = $.extend({},revert[keys[i]]);
            render( this_evt );
            persist( this_evt );
        }
        return true;    // failed to insert
    }

    return false;       // no error

}

//
// separated out only to make error reporting & revert to original times cleaner
//

function insert_shuffle_item( event_list, insert_evt, sorted_keys, open_times, persist, render ){
    //  Parameters:
    //      event_list  - events for a specific date, returned by a resource
    //      insert_evt  - event that has just been added (exists in event_list)
    //      sorted_keys - chronologically sorted index into event_list
    //      open_times  - [start, end of day] time for this date:resource
    //      persist     - function to call to save changes to modified events
    //      render      - function to call to rerender modified events
    
    // Find events that overlap the newly-dropped event, move down.
    // Fail if this causes an event to be bumped off of the current day
    // Bump new event forward if it overlaps an earlier event

    var start_of_day   = convert_to_minutes( open_times[0] );
    var end_of_day = convert_to_minutes( open_times[1] );

    // make sure this event is being inserted after the resource becomes available
    if( insert_evt.attr.startmins < start_of_day ) {
        return "Events can not be placed before the start of day";
    }

    // Find insertion point in sorted list
    var i = sorted_keys.length;
    var key = insert_evt.attr.id;
    do { i--; } while( i && key != sorted_keys[i] )

    // check for overlap with the immediately-previous event, if any
    var previous_evt = event_list[sorted_keys[i-1]];
    if( i &&  previous_evt.attr.id != insert_evt.attr.id
          &&  insert_evt.attr.startmins >= previous_evt.attr.startmins
          &&  insert_evt.attr.startmins <  previous_evt.attr.endmins ) {

        var confirmed = true;
        confirmed = confirm("This event overlaps an earlier event; move this event after the earlier event?");
        if( !confirmed )
        {
            if( confirm("Allow this event to overlap?") )
            {
                return false
            }
            else
            {
                return "Reverting the event to its previous time";
            }
        }
        insert_evt.set_start_time( previous_evt.attr.end );

        render( insert_evt );
        persist( insert_evt );
    }

    if( insert_evt.attr.endmins > end_of_day  ){
        return "This change would cause the meeting to extend beyond the end of the day";
    }

    // i points to inserted event; while there is an overlap with a later event, 
    // bump the later event forward
    
    var first = true;

    while( ++i < sorted_keys.length
       &&  event_list[sorted_keys[i-1]].attr.endmins > event_list[sorted_keys[i]].attr.startmins ){

        if( first ){
            first = false;
            if( !confirm("This event overlaps a later event; move later event(s)?") )
            {
                return "Insufficient time available to accommodate event";
            }
        }

        var this_evt       = event_list[sorted_keys[i]];
            previous_event = event_list[sorted_keys[i-1]];

        if( this_evt.attr.locked ){
            return "This change can't be made due to a locked event";
        }

        this_evt.set_start_time( previous_event.attr.end );

        if( this_evt.attr.endmins > end_of_day  ){
            return "This change would cause a meeting to extend beyond the end of the day";
        }

        render( this_evt );
        persist( this_evt );
    }

    return false;   // completed without error
}


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

    var newtime = convert_to_time( startmins + increment, ( 'm' == start[-1] ) );

    return { newtime:newtime, over:(startmins+increment)>=endmins };
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
// Unfortunately, Pines Notify does not have a "confirm" function, which would be nice for consistency
//  Using a jquery ui dialog, code lifted/adapted from here:
//       http://www.vrusso.com.br/blog/2011/03/unobtrusive-confirm-javascript-replacement-with-jquery-ui-dialog/
//
function confirm(message, callback, param) {
    $('body').append('<div id="confirm" style="display:none">'+message+'</div>'); // dont forget to hide this!
    $( "#confirm" ).dialog({
        resizable: false,
        title: 'Please Confirm',
        modal: true,
        buttons: [
            {
                text: "Yes",
                click: function() {
                    $(this).dialog("close");
                    if ($.isFunction(callback)) {   
                        callback( param );
                    }
                
                }
            },{
                text: "No",
                click: function() { $(this).dialog("close");}
            }
        ],
        close: function(event, ui) { 
            $('#confirm').remove();
        }
    });
}


//
//  insert_shuffle_meeting
//  ======================
//      This is an example callback function that is called when an event is dropped onto
//      a resource calendar day. Parameters are a list of all events for that resource on
//      that day, the event that has been dropped onto the calendar, 
///?????and the function that
//      is called to rerender moved events.????? 
//
//      This example attempts to insert the new event; if the new event overlaps an earlier
//      event, then it is bumped forward to the end of the existing meeting. Any existing
//      meetings starting at or after the new meeting are bumped forward, with gaps between
//      meetings being reduced to minimize disruptions to existing meetings.
//
//      The insert will fail if it would require a locked meeting to be bumped, or if a moved
//      meeting would be pushed beyond the end-of-day for the calendar.
//
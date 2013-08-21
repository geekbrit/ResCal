
//
// This function is registered as "postcalrender", a callback to be executed
//  after every rerender of the calendars
//
//  calendar_state gives access to the public state of the calendar
//
function adjust_calendar_width( calendar_state )
{
  // expand width of containers to accommodate pesky scrollbar
  // this is specific to the template used in the test system, but the techniques used
  // may be useful in similar templates where the calendar is scrollable
  var first_week = $('.rc_bodyweek').first();
  var days  = $(first_week).find('.rc_day_target');
  var first = $(days).first();
  var last  = $(days).last();
  var retries = 5;
  while( --retries && $(first).offset().top != $(last).offset().top ){
    $('.rc_week').animate({width: "+=10px"},0);
  }
}


//
// Compile Render Functions
//
function compileTemplate( id )
{
  var entities = [
        ['apos', '\''],
        ['amp', '&'],
        ['lt', '<'],
        ['gt', '>']
    ];
  var text = $('#'+id).html();
  for (var i = 0, max = entities.length; i < max; ++i) {
        text = text.replace(new RegExp('&'+entities[i][0]+';', 'g'), entities[i][1]);
  }
    return doT.template(text);
}

var render_week = compileTemplate( 'render_week' );
var render_week_event = compileTemplate( 'render_week_event' );



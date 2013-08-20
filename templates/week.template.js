// Multiline Function String - Nate Ferrero - Public Domain
(function(){}).__proto__.heredoc = function() {
    return this.toString().replace(/.*\/\*\n([\s\S]*)\n\*\/.*/m, "$1");
};


// [TODO] Add support for per-day opening/closing times 

//
//  Template for a calendar for a single resource
//
var render_week = doT.template((function(){/*
<div class="rc_week clearfix">
  <div class="rc_headerweek clearfix">
  <span class='rc_name'>{{=it.resource_name}}</span>
  <span class='rc_location'>{{=it.resource_location}}</span>
  </div>
  <div class="rc_headerweek"><div class="rc_gutter" style='relative'>
    <img src='img/CalendarIcon.gif' alt='click here to change date range' class='calimg'/>
  </div>
  {{ for(var i = 0; i < it.col_count; i++ ) { }}
    <div class="{{=it.col_class}}">{{=it.dows[i]+' '+it.months[i]+'/'+it.days[i]}}</div>
  {{ } }}
  </div>
  <div class="rc_bodyweek clearfix" id='{{=it.resource_id}}'>
  <div class="rc_gutter">
  {{var hrcount =0; var t = it.min_time; do { }}
  	<div class='rc_hour_slot'>{{=t}}</div>
  	{{ var r = addMinutes_timeOfDay(t,60,it.max_time); }}
  	{{ t = r.newtime; hrcount += 1;}}
  {{ } while(!r.over);}}
  </div>

  {{ for(var i = 0; i < it.col_count; i++ ) { }}
    <div class="rc_day_target {{=it.col_class}}" id="{{= it.resource_name+'_'+it.months[i]+'_'+it.days[i] }}" data-date="{{=it.dates[i]}}">
      {{ for(var j = 0; j < hrcount; j++ ) { }}
        {{? it.inc_time == 15 }}
	        <div class="rc_quarters_slot"></div>
	        <div class="rc_quarters_slot"></div>
	        <div class="rc_quarters_slot"></div>
	        <div class="rc_quarters_slot"></div>
        {{?? it.inc_time == 20 }}
          <div class="rc_thirds_slot"></div>
          <div class="rc_thirds_slot"></div>
          <div class="rc_thirds_slot"></div>
        {{?? it.inc_time == 30 }}
          <div class="rc_halves_slot"></div>
          <div class="rc_halves_slot"></div>
        {{?? it.inc_time == 60 }}
          <div class="rc_hour_slot"></div>
        {{??}}        
        {{?}}
      {{ } }}
    </div>
  {{ } }}
  </div>
</div>
{{
    $('.calimg').click(function(){ $(this).datepicker( "dialog", {{= it.baseDate }}, dateSelect ) });
}}

*/}).heredoc());


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
//  Template for an event in the calendar
//
var render_week_event = doT.template((function(){/*
<div class="rc_event event {{=it.attr.ev_type}}" id="{{=it.attr.id}}"
{{? it.attr.resource == "unassigned_event_resource"}}
    style="height:40px;margin:4px auto;">
    <div class="rc_event_head">Unassigned
{{??}}
    style="top:{{=it.attr.t_offset}}px;height:{{=it.attr.t_height}}px;">
    <div class="rc_event_prepad" style="height:{{=it.attr.t_prepad}}px;"></div>
    <div class="rc_event_head">{{=it.attr.start}} - {{=it.attr.end}}
{{?}}
  <div class='deleteevent'>X</div></div>
  <div class="rc_event_body">{{=it.attr.ev_text}}
    {{? it.attr.locked }}<img class='lockedevent' alt='locked' src='img/padlock.png'></img>{{?}}
  </div>
  <div class="rc_event_postpad" style="height:{{=it.attr.t_postpad}}px;"></div>
</div>
*/}).heredoc());

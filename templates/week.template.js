/*
//
//  Template for a calendar for a single resource
//
<div class="rc_week clearfix">
  <div class="rc_headerweek clearfix">
  <span class='rc_name'>{{=it.resource_name}}</span>
  <span class='rc_location'>{{=it.resource_location}}</span>
  </div>
  <div class="rc_headerweek"><div class="rc_gutter">&amp;nbsp;</div>
  {{ for(var i = 0; i < it.col_count; i++ ) { }}
    <div class="{{=it.col_class}}">{{=it.dows[i]+' '+it.months[i]+'/'+it.days[i]}}</div>
  {{ } }}
  <div class="rc_bodyweek" id='{{=it.resource_id}}'>
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
*/

// Compiled on http://olado.github.io/doT/

var render_week = 
function anonymous(it /**/) { var out='<div class="rc_week clearfix"> <div class="rc_headerweek clearfix"> <span class=\'rc_name\'>'+(it.resource_name)+'</span> <span class=\'rc_location\'>'+(it.resource_location)+'</span> </div> <div class="rc_headerweek"><div class="rc_gutter">&nbsp;</div> '; for(var i = 0; i < it.col_count; i++ ) { out+=' <div class="'+(it.col_class)+'">'+(it.dows[i]+' '+it.months[i]+'/'+it.days[i])+'</div> '; } out+=' <div class="rc_bodyweek" id=\''+(it.resource_id)+'\'> <div class="rc_gutter"> ';var hrcount =0; var t = it.min_time; do { out+=' <div class=\'rc_hour_slot\'>'+(t)+'</div> '; var r = addMinutes_timeOfDay(t,60,it.max_time); out+=' '; t = r.newtime; hrcount += 1;out+=' '; } while(!r.over);out+=' </div> '; for(var i = 0; i < it.col_count; i++ ) { out+=' <div class="rc_day_target '+(it.col_class)+'" id="'+( it.resource_name+'_'+it.months[i]+'_'+it.days[i] )+'" data-date="'+(it.dates[i])+'"> '; for(var j = 0; j < hrcount; j++ ) { out+=' ';if(it.inc_time == 15){out+=' <div class="rc_quarters_slot"></div> <div class="rc_quarters_slot"></div> <div class="rc_quarters_slot"></div> <div class="rc_quarters_slot"></div> ';}else if(it.inc_time == 20){out+=' <div class="rc_thirds_slot"></div> <div class="rc_thirds_slot"></div> <div class="rc_thirds_slot"></div> ';}else if(it.inc_time == 30){out+=' <div class="rc_halves_slot"></div> <div class="rc_halves_slot"></div> ';}else if(it.inc_time == 60){out+=' <div class="rc_hour_slot"></div> ';}else{out+=' ';}out+=' '; } out+=' </div> '; } out+=' </div></div>';return out; }



/*
//
//  Template for an event in the calendar
//
<div class="rc_event event {{=it.attr.ev_type}}"
     style="top:{{=it.attr.t_offset}}px;height:{{=it.attr.t_height}}px;"
     id="{{=it.attr.id}}">
  <div class="rc_event_prepad" style="height:{{=it.attr.t_prepad}}px;"></div>
  <div class="rc_event_head">{{=it.attr.start}} - {{=it.attr.end}}</div>
  <div class="rc_event_body">{{=it.attr.ev_text}}</div>
  <div class="rc_event_postpad" style="height:{{=it.attr.t_postpad}}px;"></div>
</div>
*/
var render_week_event =
function anonymous(it /**/) { var out='<div class="rc_event event '+(it.attr.ev_type)+'" style="top:'+(it.attr.t_offset)+'px;height:'+(it.attr.t_height)+'px;" id="'+(it.attr.id)+'"> <div class="rc_event_prepad" style="height:'+(it.attr.t_prepad)+'px;"></div> <div class="rc_event_head">'+(it.attr.start)+' - '+(it.attr.end)+'</div> <div class="rc_event_body">'+(it.attr.ev_text)+'</div> <div class="rc_event_postpad" style="height:'+(it.attr.t_postpad)+'px;"></div></div>';return out; }
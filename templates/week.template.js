//=============================================================================
//  Author    : Peter Maloy, August 2013
//  Repository: https://github.com/geekbrit/ResCal
//=============================================================================

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



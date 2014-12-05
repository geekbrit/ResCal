# Resource Calendar

A demo/test page using the files in this repository can be found at [codesprite.com/rc/test.html](http://codesprite.com/rc/test.html)

## Objective
To create an alternative to the FullCalendar jquery plugin. Improvements over FullCalendar include:
* Tableless layout
* Overridable rendering functions
* Events become independent objects that can be transferred between Calendars
* Events support pre-meeting and post-meeting gaps built into the event
* A new Resource container class, giving a hierarchy of Calendar -> one or more Resources -> zero or more Events
* Extensible Policies - locked events, nudge later events on insert


## Status
Working framework in place, currently feature-complete for the first calendar view (view one week for each resource associated with a calendar, time slots arranged vertically). At this point you can:
* Drag one of the predefined meeting types onto any of the resource calendars
* Drag meetings within and between resources
* Click on meetings to open an event-editing box
* Drag the bottom edge of a meeting to change its overall duration
* Delete an event by clicking on the 'X' in the top-right corner of the event
* Click on the calendar icon to change to a different week
* Configure 7-day, or 5-day weeks, with choice of start-of-week day

The test/demo system uses localStorage to provide event persistence. In a real implementation, this would be
replaced by, or enhanced with server-side storage using Ajax transactions. The demo system passes in functions
event persistence when creating the calendar; these can be replaced without modifying the calendar plugin.


## Implementation Notes
Some existing code will be refactored to group customizable functionality in easy to find locations. To a large extent
in the code that has been implemented so far, anything that is application-specific has been abstracted out, but
this is a work in progress.

There is a dependency on "moment.js", a javascript Date extension. Since this project is heavily dependent on date
manipulation it has been included at this point in order to simplify these operations; if it turns out to be under-utilized,
it shall be eliminated.

Examples of customizability include:
* Rendering of calendars and events is carried out by doT javascript template functions. These can be found in the test.html file as "SCRIPT" blocks of type "text/plain". The templates use the doT syntax format, and are compiled on page load
* The functions used to render the calendars and events are defined in the rc_calendar default settings at the top of rc_calendar.js, but can be overridden by options passed into the rc_calendar constructor. Currently only view_week functions are available; view_day and view_month function will follow
* The resources associated with the calendar are defined in <resource> tags in the html code (see test.html). I'm not sure this is good practice, so may replace it with an alternative method
* The resource definitions include a reference to a js validation function, and a set of parameters that is passed to the
validator when an event is dropped onto the resource. The example function in test.html shows how the data parameters can
be used to perform bounds checking on event attributes, without writing additional code
* The test system uses Pine Notifications to provide system notifications and for editing the event attributes.
This is abstracted through functions in rc_utitlies.js, allowing another notification system to be used if prefered

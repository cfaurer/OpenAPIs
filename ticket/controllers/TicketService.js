'use strict';

var FSM = require('javascript-state-machine');
var myFSM = function() {    // my constructor function
  this.startup();
};

myFSM.prototype = {
  onbeforestart: function(event, from, to) { console.log("STARTING UP");},
  onstart: function(event, from, to) { console.log("READY");},
  onReject: function(event, from, to) { console.log("On Reject");},
  onAcknowledge: function(event, from, to) { console.log("On Acknowledge");},
  onCancel: function(event, from, to) { console.log("On Cancel");},
  onPend: function(event, from, to) { console.log("On Pend");},
  onHold: function(event, from, to) { console.log("On Hold");},
  onResolve: function(event, from, to) { console.log("On Resolve");},
  onClose: function(event, from, to) { console.log("On Close");},
};

// Request is used to callout to an API

var request = require('request');
require('request-debug')(request);

// Setup to compile swagger.json and build ticket model

const config = require('../config');

var swaggerMongoose = require('swagger-mongoose');
var mongoose = require('mongoose');
// var db = mongoose.connect('mongodb://penny:diglet@ds139567.mlab.com:39567/amkb-db');
var db = mongoose.connect(config.get('MONGO_URL'));

var fs = require('fs');
var swagger = fs.readFileSync('./api/swagger.json');
var smTicket = swaggerMongoose.compile(swagger);

// Makes the Hub model available to other modules, in particular the HubService

exports.retrieveHubModel = function(Hub) {
  var Hub = smTicket.models.Hub;
  // console.log('Hub: ' + JSON.stringify(Hub, null, 2))
  return Hub;
};

var Ticket = smTicket.models.Ticket;
var TicketStateChangeNotification = smTicket.models.TicketStateChangeNotification;
var TicketlUpdateNotification = smTicket.models.TicketlUpdateNotification;
var TicketClearanceRequestNotification = smTicket.models.TicketClearanceRequestNotification;
var TicketInformationRequiredNotification = smTicket.models.TicketInformationRequiredNotification;

var Hub = smTicket.models.Hub;
var hub = new Hub();

exports.createTicket = function(args, res, next) {
  // *
  //  * parameters expected in the args:
  // * ticket (Ticket)
  // *

  var ticket = new Ticket(args.ticket.value);  // set the ticket body (comes from the request)
  // console.log('new ticket: ' + JSON.stringify(ticket, null, 2));
  if(ticket) {
    res.setHeader('Content-Type', 'application/json');

    // save the ticket and check for errors
    ticket.status = 'Submitted';
    ticket.creationDate = new Date().toISOString();
	const project_url = config.get('GCLOUD_PROJECT_URL')
	console.log('host url = ' + project_url);
    ticket.href = project_url + ticket._id;
    ticket.id = ticket._id;
    // console.log('ticket to persist: ' + JSON.stringify(ticket, null, 2));
    ticket.save(function(err) {
    if (err)
      return res.send(err);
    });

    // console.log('body: ' + JSON.stringify(args.ticket.value, null, 2));
    // console.log('ticket to be returned: ' + JSON.stringify(ticket, null, 2));

    // console.log('State Change Notification: ' + JSON.stringify(ticketStateChangeNotification, null, 2));
    // console.log('State Change Notification Event: ' + JSON.stringify(ticketStateChangeNotification.event.ticket, null, 2));

    var hubs = [];
    Hub.find().exec(function(err, foundHubs) {
        if (err)
          return res.send(err);

        foundHubs.forEach(myFunction);

        function myFunction(item,index,arr) {
          hub = foundHubs[index].toObject();
          console.log('index ' + index + ', hub: ' + item);

          var ticketStateChangeNotification = new TicketStateChangeNotification();
          ticketStateChangeNotification.eventId = ticketStateChangeNotification._id;
          ticketStateChangeNotification.event.ticket = ticket;
          ticketStateChangeNotification.eventType = 'TicketStateChangeNotification';
          ticketStateChangeNotification.eventTime = new Date().toISOString();

          var options = {
            uri: hub.callback, // listener 'http://localhost:8090/listener/message'
            headers: {
              'Content-type': 'application/json'
            },
            body: JSON.stringify(ticketStateChangeNotification, null, 2)
          };

          // send request to listeners
          console.log('calling listener at: ' + options.uri);
          console.log('calling listener with body: ' + options.body);

          request.post(options, function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
              console.log('Successfully called listener at: ' + options.uri);
            }
            else {
              console.log("Listener notification failed with error: " + error);
              res.end();
            }
          });
          return;
        }
      });

    res.end(JSON.stringify(ticket, null, 2));
  }
  else {
    res.end();
  }
}

exports.deleteTicket = function(args, res, next) {
  /**
   * parameters expected in the args:
  * id (String)
  **/
  // no response value expected for this operation
  
  Ticket.remove({_id: args.id.value}, function(err, ticket) {

    if (err)
      return res.send(err);

    res.end();
  });
}

exports.fullyUpdateTicket = function(args, res, next) {
  /**
   * parameters expected in the args:
  * id (String)
  * ticket (Ticket)
  **/
  
  res.setHeader('Content-Type', 'application/json');

  Ticket.findById(args.id.value, function(err, ticket) {

    if (err)
      return res.send(err);
    else {

      // save the ticket
      Ticket.update({_id: args.id.value}, args.ticket.value, {overwrite: false}, function(err) {
        if (err)
          return res.send(err);

        else{
          Ticket.findById(args.id.value, function(err, ticket) {

            if (err)
              return  res.send(err);

            return res.end(JSON.stringify(ticket));
          });      
        }
      });
    }
  });
}

exports.partiallyUpdateTicket = function(args, res, next) {
  /**
   * parameters expected in the args:
  * id (String)
  * ticket (Ticket)
  **/
  var inTicket = args.ticket.value;
  res.setHeader('Content-Type', 'application/json');

  Ticket.findById(args.id.value, function(err, ticket) {

    if (err)
      return res.send(err);
    else {

      var startState = ticket.status;
      FSM.StateMachine.create({
          target: myFSM.prototype,
          events: [
          {name: 'startup', from: 'none', to: startState},
          {name: 'Reject', from: 'Submitted', to: 'Rejected'},
          {name: 'Acknowledge', from: 'Submitted', to: 'Acknowledged'},
          {name: 'Cancel', from: 'Acknowledged', to: 'Cancelled'},
          {name: 'Pend', from: 'Acknowledged', to: 'InProgressPending'},
          {name: 'Hold', from: 'Acknowledged', to: 'InProgressHeld'},
          {name: 'Resolve', from: ['InProgressHeld', 'InProgressPending'], to: 'Resolved'},
          {name: 'Close', from: 'Resolved', to: 'Closed'}
          ]
        });

      var fsm = new myFSM();
      var hasTransitioned = false;
      var successMsg = 'partiallyUpdateTicket: Transition from state ' + fsm.current + ' to state ' + inTicket.status;
      var failMsg = 'partiallyUpdateTicket: Transition from state ' + fsm.current + ' to state ' + inTicket.status + ' is not allowed';
      switch(inTicket.status){
        case 'Rejected':
        if (fsm.can('Reject')) {fsm.Reject(); hasTransitioned = true;}
        break;
        case 'Acknowledged':
        if (fsm.can('Acknowledge')) {fsm.Acknowledge(); hasTransitioned = true;}
        break;
        case 'Cancelled':
        if (fsm.can('Cancel')) {fsm.Cancel(); hasTransitioned = true;}
        break;
        case 'InProgressPending':
        if (fsm.can('Pend')) {fsm.Pend(); hasTransitioned = true;}
        break;
        case 'InProgressHeld':
        if (fsm.can('Hold')) {fsm.Hold(); hasTransitioned = true;}
        break;
        case 'Resolved':
        if (fsm.can('Resolve')) {fsm.Resolve(); hasTransitioned = true;}
        break;
        case 'Closed':
        if (fsm.can('Close')) {fsm.Close(); hasTransitioned = true;}
        break;
        default:
          console.log('Ticket status = ' + inTicket.status);
          return res.status(500).send({status: 500, message: failMsg});
      }
        if (hasTransitioned) {
          var statusChangeDate = new Date().toISOString();
          Ticket.update({_id: args.id.value}, {statusChangeDate: statusChangeDate}, {overwrite: false}, function(err) {
            if (err)
              return res.send(err);
          });
          var ticketStateChangeNotification = new TicketStateChangeNotification();
          ticketStateChangeNotification.eventId = ticketStateChangeNotification._id;
          ticketStateChangeNotification.eventTime = statusChangeDate;
          ticketStateChangeNotification.eventType = 'TicketStateChangeNotification';
          ticketStateChangeNotification.event.ticket = ticket;
          console.log(JSON.stringify(ticketStateChangeNotification));
          console.log(JSON.stringify(ticketStateChangeNotification.event.ticket));
          console.log(successMsg)
        }
        else {
          console.log(failMsg);
          return res.status(500).send({status: 500, message: failMsg});
        }
    }

    // save the ticket
    Ticket.update({_id: args.id.value}, inTicket, {overwrite: false}, function(err) {
      if (err)
        return res.send(err);
      else {
        Ticket.findById(args.id.value, function(err, ticket) {

          if (err)
            return  res.send(err);
          else {
            ticket = ticket.toObject();
            delete ticket["_id"];
            delete ticket["__v"];
            delete ticket.relatedObject[0]["_id"];
            delete ticket.relatedParty[0]["_id"];
            delete ticket.note[0]["_id"];
            return res.end(JSON.stringify(ticket));
          }
        });      
      }
    });
  });
}

exports.retrieveTicket = function(args, res, next) {
  /**
   * parameters expected in the args:
  * id (String)
  * fields (String)
  **/
  
  var fields = {};
  if (args.fields.value) {
    var fields = 'id href creationDate';
    fields = fields + ' ' + args.fields.value;
  };
  console.log('fields = ' + JSON.stringify(fields));

  res.setHeader('Content-Type', 'application/json');
  Ticket.findById(args.id.value).select(fields).exec(function(err, ticket) {

    if (err)
      return  res.send(err);

    return res.end(JSON.stringify(ticket));
  });
}

exports.retrieveTickets = function(args, res, next) {
  /**
   * parameters expected in the args:
  * fields (String)
  **/

  var query = {};

  if (args.severity.value) {query['severity'] = args.severity.value;};
  if (args.type.value) {query['type'] = args.type.value;};
  if (args.status.value) {query['status'] = args.status.value;};
  if (args.targetResolutionDate.value) {
    // query['targetResolutionDate'] = {$gte: args.targetResolutionDate.value};
    // query['targetResolutionDate'] = args.targetResolutionDate.value.replace("\""/g, "");
    //query['targetResolutionDate'] = "{$" + args.targetResolutionDate.value + "}";
    var queryDate = {"$gte": "2016-01-01T17:12:30.617Z"};
    query['targetResolutionDate'] = queryDate;
  };
  console.log('query = ' + JSON.stringify(query));

  var fields = '-_id -__v -note._id -relatedParty._id -relatedObject._id';

  if (args.fields.value) {
    var fields = fields + 'id href creationDate';
    fields = fields + ' ' + args.fields.value;
  };
  console.log('fields = ' + JSON.stringify(fields));

  res.setHeader('Content-Type', 'application/json');
  
  Ticket.find(query).select(fields).exec(function(err, tickets) {

    if (err)
      return res.send(err);

    return res.end(JSON.stringify(tickets));
  }); 
}


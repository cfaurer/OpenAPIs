'use strict';

var Ticket = require('./TicketService.js');
var Hub = Ticket.retrieveHubModel();

exports.createHub = function(args, res, next) {
  /**
   * parameters expected in the args:
  * hub (Hub)
  **/
  
  var hub = new Hub(args.hub.value);  // set the hub body (comes from the request)
  hub.id = hub._id;

  if(hub) {
    res.setHeader('Content-Type', 'application/json');

    // save the hub and check for errors
    console.log('hub to persist: ' + JSON.stringify(hub, null, 2));
    hub.save(function(err) {
    if (err)
      return res.send(err);
  });

    res.end(JSON.stringify(hub, null, 2));
  }
  else {
    res.end();
  }
}

exports.deleteHub = function(args, res, next) {
  /**
   * parameters expected in the args:
  * id (String)
  **/
  // no response value expected for this operation
  
  Hub.remove({_id: args.id.value}, function(err, hub) {

    if (err)
      return res.send(err);

    res.end();
  });
}

exports.retrieveHub = function(args, res, next) {
  /**
   * parameters expected in the args:
  * id (String)
  * fields (String)
  **/
  
  console.log('args: ' + JSON.stringify(args));

  var fields = {};
  if (args.fields.value) {
    var fields = 'id';
    fields = fields + ' ' + args.fields.value;
  };
  
  console.log('fields = ' + JSON.stringify(fields));

  res.setHeader('Content-Type', 'application/json');
  Hub.findById(args.id.value).select(fields).exec(function(err, hub) {

    if (err)
      return  res.send(err);

    hub = hub.toObject();
    delete hub["_id"];
    delete hub["__v"];
    return res.end(JSON.stringify(hub));
  });
}

exports.retrieveHubs = function(args, res, next) {
  /**
   * parameters expected in the args:
  **/
  
  res.setHeader('Content-Type', 'application/json');
  
  Hub.find().exec(function(err, hubs) {

    if (err)
      return res.send(err);

    return res.end(JSON.stringify(hubs));
  }); 
}


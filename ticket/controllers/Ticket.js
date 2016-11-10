'use strict';

var url = require('url');

var Ticket = require('./TicketService');

module.exports.retrieveHubModel = function retrieveHubModel (Hub) {
	Ticket.retrieveHubModel(Hub);
};

module.exports.createTicket = function createTicket (req, res, next) {
  Ticket.createTicket(req.swagger.params, res, next);
};

module.exports.deleteTicket = function deleteTicket (req, res, next) {
  Ticket.deleteTicket(req.swagger.params, res, next);
};

module.exports.fullyUpdateTicket = function fullyUpdateTicket (req, res, next) {
  Ticket.fullyUpdateTicket(req.swagger.params, res, next);
};

module.exports.partiallyUpdateTicket = function partiallyUpdateTicket (req, res, next) {
  Ticket.partiallyUpdateTicket(req.swagger.params, res, next);
};

module.exports.retrieveTicket = function retrieveTicket (req, res, next) {
  Ticket.retrieveTicket(req.swagger.params, res, next);
};

module.exports.retrieveTickets = function retrieveTickets (req, res, next) {
  Ticket.retrieveTickets(req.swagger.params, res, next);
};

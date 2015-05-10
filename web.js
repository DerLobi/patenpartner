var MongoStore = require('ac-node').MongoStore;
var ack = require('ac-koa').require('hipchat');
var pkg = require('./package.json');
var app = ack(pkg);
var Patenpartner = require('./lib/patenpartner');
var addon = app.addon()
	.hipchat()
	.allowRoom(true)
	.allowGlobal(true)
	.scopes('send_notification');

var addonStore = MongoStore(process.env[app.config.MONGO_ENV], 'patenpartner');

addon.webhook('room_enter', function *() {
  // instead of scheduling a message (for which we would have to save the tenant
	// and construct our own room client) we go the easy route and check on every
	// room_enter if enough time has passed and we should send a message
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var shouldSendNotification = yield patenpartner.shouldSendNotificationsForRoom(this.room)
	if (shouldSendNotification) {
		var patenpartner = Patenpartner(addonStore, this.tenant);
		var partners = yield patenpartner.getRandomPeople();
		yield patenpartner.setPartners(partners[0], partners[1]);
		yield this.roomClient.sendNotification('Partners are: ' + partners[0] + " and " + partners[1] );
	}
});


// print who the patenpartners are
addon.webhook('room_message', /^\/patenpartner$/i, function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var partners = yield patenpartner.currentPartners();
	if (partners.length === 0) {
		yield this.roomClient.sendNotification('Currently no patenpartners set');
	} else {
		yield this.roomClient.sendNotification('Patenpartners are ' + partners.join(', '));
	}
});

// designate two people as patenpartners
addon.webhook('room_message', /^\/patenpartner set (\w+) (\w+)$/i, function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var person1 = this.match[1];
	var person2 = this.match[2];
	yield patenpartner.setPartners(person1, person2);
	yield this.roomClient.sendNotification('Partners are: ' + person1 + " and " + person2 );
});

// designate two random people as patenpartners
addon.webhook('room_message', /^\/patenpartner set random$/i, function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var partners = yield patenpartner.getRandomPeople();
	yield patenpartner.setPartners(partners[0], partners[1]);
	yield this.roomClient.sendNotification('Partners are: ' + partners[0] + " and " + partners[1] );
});

// add someone as potential patenpartner
addon.webhook('room_message', /^\/patenpartner add (\w+)$/i, function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var person = this.match[1];
	yield patenpartner.addPerson(person);

	yield this.roomClient.sendNotification('Added ' + person + " as potential patenpartner");
});

// list available people
addon.webhook('room_message', /^\/patenpartner list$/i, function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var people = yield patenpartner.listPeople();
	var listOfPeople = "";
	if (people.length === 0) {
		yield this.roomClient.sendNotification("No patenpartners set, start adding people by typing e.g. '/patenpartner add " + this.sender.mention_name + "'");
	} else {
		yield this.roomClient.sendNotification('The following people can be chosen as patenpartners:\n' + people.join(', '));
	}
});

// notify about new patenpartners in the current room, or disable notifications
addon.webhook('room_message', /^\/patenpartner notify (on|off)\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)?$/i, function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	if (this.match[1] === "on") {
		var weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
		var matchedDay = this.match[2] || "monday"
		yield patenpartner.enableNotifications(this.room, weekdays.indexOf(matchedDay));
		yield this.roomClient.sendNotification("I will notify you every " + matchedDay + " about the new patenpartners in the room '" + this.room.name + "'");
	} else {
		yield patenpartner.disableNotifications();
		yield this.roomClient.sendNotification("I will not notify you about new patenpartners anymore");
	}
});

// remove someone as potential patenpartner
addon.webhook('room_message', /^\/patenpartner remove (\w+)$/i, function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var person = this.match[1];
	yield patenpartner.removePerson(person);

	yield this.roomClient.sendNotification('Removed ' + person + " as potential patenpartner");
});

// mention the patenpartners and print the given message
addon.webhook('room_message', /^(.*)@patenpartner(.*)$/i, function *() {
	var firstPart = this.match[1];
	var secondPart = this.match[2];
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var partners = yield patenpartner.currentPartners();
	if (partners.length === 0) {
		yield this.roomClient.sendNotification('No patenpartners set yet');
	} else {
		var mentions = "@" + partners.join(" @");
		yield this.roomClient.sendNotification(firstPart + mentions + secondPart);
	}

});

app.listen();

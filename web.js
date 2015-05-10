var MongoStore = require('ac-node').MongoStore;
var ack = require('ac-koa').require('hipchat');
var pkg = require('./package.json');
var config = pkg.patenpartnerConfig;
var app = ack(pkg);
var Patenpartner = require('./lib/patenpartner');
var Localize = require('localize');
var localization = new Localize('./translations', null, 'default');
// localization.throwOnMissingTranslation(false);
var addon = app.addon()
	.hipchat()
	.allowRoom(true)
	.allowGlobal(true)
	.scopes('send_notification');

var addonStore = MongoStore(process.env[app.config.MONGO_ENV], 'patenpartner');
var keyword = config.keyword || "patenpartner"
localization.setLocale(config.locale || "en")

addon.webhook('room_enter', function *() {
  // instead of scheduling a message (for which we would have to save the tenant
	// and construct our own room client) we go the easy route and check on every
	// room_enter if notifications are enabled and it is the right point in time
	// to send a message to this room
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var shouldSendNotification = yield patenpartner.shouldSendNotificationsForRoom(this.room)
	if (shouldSendNotification) {
		var patenpartner = Patenpartner(addonStore, this.tenant);
		var partners = yield patenpartner.getRandomPeople();
		yield patenpartner.setPartners(partners[0], partners[1]);
		var msg = localization.translate("partners_are", partners[0], partners[1]);
		yield this.roomClient.sendNotification(msg);
	}
});

// print who the patenpartners are
addon.webhook('room_message', new RegExp("^/" + keyword + " (usage|help)$", "i"), function *() {
		var usage = localization.translate("usage_supported_commands");
		var usage = usage + "<pre>"
		var usage = usage +"/" + keyword + "                             " + localization.translate("usage_print_partners") + "<br>"
		var usage = usage +"/" + keyword + " list" + "                        " + localization.translate("usage_list_people") + "<br>"
		var usage = usage +"/" + keyword + " add <name>" + "                  " + localization.translate("usage_add") + "<br>"
		var usage = usage +"/" + keyword + " remove <name>" + "               " + localization.translate("usage_remove") + "<br>"
		var usage = usage +"/" + keyword + " set <name1> <name2>" + "         " + localization.translate("usage_set") + "<br>"
		var usage = usage +"/" + keyword + " set random" + "                  " + localization.translate("usage_set_random") +"<br>"
		var usage = usage +"/" + keyword + " notify (on|off) [weekday]" + "   " + localization.translate("usage_notify") + "<br>"
		var usage = usage +"@" + keyword + " [message]" + "                   " + localization.translate("usage_alias") + "<br>"
		var usage = usage +"/" + keyword + " usage" + "                       " + localization.translate("usage_usage") + "<br>"
		var usage = usage + "</pre>"
		yield this.roomClient.sendNotification(usage);
});

// print who the patenpartners are
addon.webhook('room_message', new RegExp("^/" + keyword + "$", "i"), function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var partners = yield patenpartner.currentPartners();
	if (partners.length === 0) {
		var msg = localization.translate('no_partners_set', keyword, this.sender.mention_name)
		yield this.roomClient.sendNotification(msg);
	} else {
		var msg = localization.translate("partners_are", partners[0], partners[1]);
		yield this.roomClient.sendNotification(msg);
	}
});

// designate two people as patenpartners
addon.webhook('room_message', new RegExp("^/" + keyword + " set (\w+) (\w+)$", "i"), function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var person1 = this.match[1];
	var person2 = this.match[2];
	yield patenpartner.setPartners(person1, person2);
	var msg = localization.translate("partners_are", person1, person2);
	yield this.roomClient.sendNotification(msg);
});

// designate two random people as patenpartners
addon.webhook('room_message', new RegExp("^/" + keyword + " set random$","i"), function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var partners = yield patenpartner.getRandomPeople();
	yield patenpartner.setPartners(partners[0], partners[1]);
	var msg = localization.translate("partners_are", partners[0], partners[1]);
	yield this.roomClient.sendNotification(msg);
});

// list available people
addon.webhook('room_message', new RegExp("^/" + keyword + " list$", "i"), function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var people = yield patenpartner.listPeople();
	var listOfPeople = "";
	if (people.length === 0) {
		var msg = localization.translate('no_partners_set', keyword, this.sender.mention_name)
		yield this.roomClient.sendNotification(msg);
	} else {
		var msg = localization.translate('people_available', people.join(', '))
		yield this.roomClient.sendNotification(msg);
	}
});

// add someone as potential patenpartner
addon.webhook('room_message', new RegExp("^/" + keyword + " add (\w+)$", "i"), function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var person = this.match[1];
	yield patenpartner.addPerson(person);
	var msg = localization.translate('add_person', person)
	yield this.roomClient.sendNotification(msg);
});

// remove someone as potential patenpartner
addon.webhook('room_message', new RegExp("^/" + keyword + " remove (\w+)$", "i"), function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var person = this.match[1];
	yield patenpartner.removePerson(person);
	var msg = localization.translate('remove_person', person)
	yield this.roomClient.sendNotification(msg);
});

// notify about new patenpartners in the current room, or disable notifications
addon.webhook('room_message', new RegExp("^/" + keyword + " notify (on|off)\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)?$", "i"), function *() {
	var patenpartner = Patenpartner(addonStore, this.tenant);
	if (this.match[1] === "on") {
		var weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
		var matchedDay = this.match[2] || "monday"
		yield patenpartner.enableNotifications(this.room, weekdays.indexOf(matchedDay));
		var localizedDay = localization.translate(matchedDay)
		var msg = localization.translate('notify_enable', localizedDay, this.room.name)
		yield this.roomClient.sendNotification(msg);
	} else {
		yield patenpartner.disableNotifications();
		var msg = localization.translate('notify_disable')
		yield this.roomClient.sendNotification(msg);
	}
});

// mention the patenpartners and print the given message
addon.webhook('room_message', new RegExp("^(.*)@" + keyword + "(.*)$", "i"), function *() {
	var firstPart = this.match[1];
	var secondPart = this.match[2];
	var patenpartner = Patenpartner(addonStore, this.tenant);
	var partners = yield patenpartner.currentPartners();
	if (partners.length === 0) {
		var msg = localization.translate('no_partners_set', keyword, this.sender.mention_name)
		yield this.roomClient.sendNotification(msg);
	} else {
		var mentions = "@" + partners.join(" @");
		yield this.roomClient.sendNotification(firstPart + mentions + secondPart, {format: "text"});
	}

});

app.listen();

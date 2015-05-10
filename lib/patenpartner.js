var crypto = require('crypto');
var _ = require('lodash');

function Patenpartner(addonStore, tenant) {
  if (!(this instanceof Patenpartner)) {
    return new Patenpartner(addonStore, tenant);
  }
  var groupKey = crypto.createHash('sha1')
    .update(String(tenant.group))
    .update(tenant.links.capabilities)
    .digest('hex');

  this._store = addonStore.narrow(groupKey);
}

var proto = Patenpartner.prototype;

proto.currentPartners = function () {
  var self = this;
  return function *() {
    var partners = yield self._store.get('currentPartners');
    return partners || [];
  };
};

proto.setPartners = function (partner1, partner2) {
  var self = this;
  return function *() {
    yield self._store.set('currentPartners', [partner1.toLowerCase(), partner2.toLowerCase()]);
  };
};

proto.getRandomPeople = function () {
  var self = this;
  return function *() {
    var people = yield self.listPeople();
    people = _.shuffle(people);
    var person1 = _.head(people);
    people = _.tail(people);
    people = _.shuffle(people);
    var person2 = _.head(people);

    return [person1, person2];
  };
};

proto.listPeople = function () {
  var self = this;
  return function *() {
    var people = yield self._store.get('people');
    return people || [];
  };
};

proto.addPerson = function (person) {
  var self = this;
  return function *() {
    var people = yield self.listPeople();
    people.push(person.toLowerCase())
    people = _.uniq(people)
    yield self._store.set('people', people)
  };
};

proto.removePerson = function (person) {
  var self = this;
  return function *() {
    var people = yield self.listPeople();
    _.pull(people, person.toLowerCase())
    yield self._store.set('people', people);
  }
};

module.exports = Patenpartner;

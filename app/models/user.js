var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true
  // links: function() {
  //   return this.hasMany(Link);
  // },
  // todo: salt + bcrypt password??, maybe set initial values like in link.js??
  // initialize: function(){
  //   this.on('creating', function(model, attrs, options){
  //     var shasum = crypto.createHash('sha1');
  //     shasum.update(model.get('url'));
  //     model.set('code', shasum.digest('hex').slice(0, 5));
  //   });
  // }
});

module.exports = User;

/*
db.knex.schema.hasTable('users').then(function(exists) {
  if (!exists) {
    //create the table
    db.knex.schema.createTable('users', function (user) {
      user.increments('id').primary();
      user.string('username', 255);
      user.string('password', 255); //todo: salt + bcrypt
      user.timestamps();
    }).then(function (table) {
      console.log('Created Table', table);
    });
  }
});
*/
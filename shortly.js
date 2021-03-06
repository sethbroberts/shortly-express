var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

var hour = 3600000;
var minute = 60000;
var interval = hour;

app.use(cookieParser()); //**
//app.use(session({secret: '1234567890QWERTY'}));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: '1234567890QWERTY',
  resave: false,
  saveUninitialized: true
}));

app.get('/', util.checkUser, function(req, res) {
  console.log(req.session.loggedIn, '*********');
  res.render('index');
  // if (req.session.loggedIn) {
  //   //req.session.cookie.expires = new Date(Date.now() + interval);
  //   //console.log(req.session.loggedIn, req.session.cookie._expires);
  //   res.render('index');
  // } else {
  //   res.redirect('login');
  // }
});

app.get('/create', util.checkUser, function(req, res) {
  res.render('index');
  // if (req.session.loggedIn) {
  //   res.render('index');
  // } else {
  //   res.redirect('login');
  // }
});

app.get('/links', util.checkUser, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
  // if (req.session.loggedIn) {
  //   Links.reset().fetch().then(function(links) {
  //     res.send(200, links.models);
  //   });
  // } else {
  //   res.redirect('login');
  // }
});

app.post('/links', util.checkUser, function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });

  // if (req.session.loggedIn) {
  //   var uri = req.body.url;

  //   if (!util.isValidUrl(uri)) {
  //     console.log('Not a valid url: ', uri);
  //     return res.send(404);
  //   }

  //   new Link({ url: uri }).fetch().then(function(found) {
  //     if (found) {
  //       res.send(200, found.attributes);
  //     } else {
  //       util.getUrlTitle(uri, function(err, title) {
  //         if (err) {
  //           console.log('Error reading URL heading: ', err);
  //           return res.send(404);
  //         }

  //         var link = new Link({
  //           url: uri,
  //           title: title,
  //           base_url: req.headers.origin
  //         });

  //         link.save().then(function(newLink) {
  //           Links.add(newLink);
  //           res.send(200, newLink);
  //         });
  //       });
  //     }
  //   });
  // } else {
  //   res.redirect('login');
  // }
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/logout', function(req, res) {
  //todo: more logic here to stop session 
  req.session.loggedIn = false;
  res.render('login');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.post('/login', function(req, res) {
  //console.log(req.body);
  var username = req.body.username;
  var password = req.body.password;
  
  new User({ username: req.body.username })
    .fetch()
    .then(function(user) {
    if (!user) {
      console.log('no user!');
      res.redirect('/login');
    } else {
      bcrypt.compare(password, user.get('password'), function(err, match) {
        if (match) {
          util.createSession(req, res, user);
          console.log('match', match);
          // req.session.cookie.expires = new Date(Date.now() + interval);
          // req.session.cookie.maxAge = interval;
          // req.session.loggedIn = true;
          // return res.redirect('/');
        } else {
          res.redirect('/login');
        }
      });
      // console.log(user.attributes.username, req.session.loggedIn, req.session.cookie.expires);
    }
  });
});

app.get('/signup', function(req, res) {
  res.render('signup');
});

app.post('/signup', function(req, res) {
  //console.log(req.body.username);
  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username })
    .fetch()
    .then(function(user) {
      console.log('the user object is: ', user);
      if (!user) {
        //make bcrypt psswd and save
        var salt = bcrypt.genSaltSync(10);
        bcrypt.hash(password, salt, null, function(err, hash) {
          Users.create({
            username: username,
            password: hash
          }).then(function(user) {
            //create session
            util.createSession(req, res, user);

            // req.session.cookie.expires = new Date(Date.now() + interval);
            // req.session.cookie.maxAge = interval;
            // req.session.loggedIn = true;
            // return res.redirect('/');
          });
        });
      } else {
        console.log('Account already exists');
        res.redirect('/signup');
      }
    });

  //this was our stuff...
  // var user = new User({
  //   username: req.body.username,
  //   password: req.body.password
  // });
  // user.save().then(function () {
  //   return res.redirect('/');
  // });
  
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  //console.log(req.params);
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      //a pattern for retrieving table row??
      var click = new Click({
        link_id: link.get('id')
      });
      //a pattern for saving a new table row??
      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);

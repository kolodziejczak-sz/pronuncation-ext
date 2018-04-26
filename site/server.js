require('marko/node-require').install();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')
const session = require('express-session')

const port = 4200;
const isProduction = false;

require('lasso').configure({
  plugins: [
      'lasso-marko' // Allow Marko templates to be compiled and transported to the browser
  ],
  outputDir: __dirname + '/static', // Place all generated JS/CSS/etc. files into the "static" dir
  bundlingEnabled: isProduction, // Only enable bundling in production
  minify: isProduction, // Only minify JS and CSS code in production
  fingerprintsEnabled: isProduction, // Only add fingerprints to URLs in production
});


const home = require('./src/routes/home');
const login = require('./src/routes/login');
const profile = require('./src/routes/home');
const register = require('./src/routes/register');

const user = require('./src/lib/middleware/user');

app.use(require('lasso/middleware').serveStatic());
app.use(cookieParser())
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60*1000 }
}))
app.use(user);

app.get('/', home);
app.get('/register', register.form);
app.post('/register', register.submit);
app.get('/login', login.form);
app.post('/login', login.submit);
app.get('/logout', login.logout);


app.listen(port, function() {
  console.log('App is listening on port', port);
  mongoose.connect('mongodb://localhost/pronouncation', (err) => {
    if(err) {
      console.error(err);
      return;
    }
    console.log('Connected with Mongodb');
  });

  if (process.send) {
    process.send('online');
  }
})
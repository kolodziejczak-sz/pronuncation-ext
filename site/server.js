require('marko/node-require').install();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const paypal = require('paypal-rest-sdk');
const lasso = require('lasso');

const https = require('https');
const path = require('path');
const fs = require('fs');

const certOptions = {
  key: fs.readFileSync(path.resolve('./cert/server.key')),
  cert: fs.readFileSync(path.resolve('./cert/server.crt'))
}

const port = 4200;
const isProduction = false;

lasso.configure({
  plugins: [
      'lasso-marko' // Allow Marko templates to be compiled and transported to the browser
  ],
  outputDir: __dirname + '/static', // Place all generated JS/CSS/etc. files into the "static" dir
  bundlingEnabled: isProduction, // Only enable bundling in production
  minify: isProduction, // Only minify JS and CSS code in production
  fingerprintsEnabled: isProduction, // Only add fingerprints to URLs in production
});

paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'Af7OMjur7kCjRAIyCCbgiCzTNZ2mYz0wIZyOXf8EywM7wby8OFkVqCi-koauOc3htI8_CKpMSvwH46Tv',
  'client_secret': 'EG8kfvQQX1vSCfyvr7OC_vfpJVnw_-U5fddng_LkpJgKSN2ht5eBkZqnNNX_Y6d19dnfLATopS9R-HJ_'
})


const home = require('./src/routes/home');
const login = require('./src/routes/login');
const license = require('./src/routes/license');
const profile = require('./src/routes/profile');
const pricing = require('./src/routes/pricing');
const register = require('./src/routes/register');

const user = require('./src/lib/middleware/user');

app.use(require('lasso/middleware').serveStatic());
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 15*60*1000 }
}))
app.use(user);

app.get('/', home);
app.get('/pricing', pricing);
app.get('/profile', profile.site);
app.get('/profile/:viewId', profile.site);

app.post('/session', profile.deleteSession);
app.get('/register', register.form);

app.get('/license', license.license);
app.get('/payment', license.payment);

app.post('/editaccount', register.edit);
app.post('/register', register.submit);
app.get('/login', login.form);
app.post('/login', login.submit);
app.get('/logout', login.logout);

app.post('/api/login', login.apiLogin);
app.post('/api/session', profile.session);


https.createServer(certOptions, app).listen(port, function() {
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
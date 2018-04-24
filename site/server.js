require('marko/node-require').install();
const express = require('express');
const app = express();
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


app.use(require('lasso/middleware').serveStatic());
app.get('/', home);


app.listen(port, function() {
  console.log('App is listening on port', port);

  // The browser-refresh module uses this event to know that the
  // process is ready to serve traffic after the restart
  if (process.send) {
    process.send('online');
  }
})
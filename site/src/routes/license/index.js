const paypal = require('paypal-rest-sdk');
const template = require('./template.marko');
const profileUrl = '/profile/2';

exports.license = function (req, res) {
  const user = (res.locals.user || req.user);
  if(!user) {
    exports.render(req, res, 'Creating payment failed. Please try again later');
    return;
    res.redirect('/login');
  }
  user.getCurrLicense((err, license) => {
    if(err) {
      res.redirect(profileUrl);
    }
    paypal.payment.create(create_payment_json, (err, payment) => {
      if(err) {
        exports.render(req, res, 'Creating payment failed. Please try again later');
        return;
      }
      const approvalUrl = payment.links.find(l => l.rel === 'approval_url');
      if(approvalUrl) {
        res.redirect(approvalUrl.href);
      } else {
        exports.render(req, res, 'Creating payment failed. Please try again later');
      }
    });
  });
}

exports.payment = function (req, res) {
  const paymentId = req.query.paymentId;
  const payerId = req.query.PayerID;
  const user = (res.locals.user || req.user);

  if(!user) {
    exports.render(req, res);
  }

  paypal.payment.execute(paymentId, execute_payment_json(payerId), (err, payment) => {
    if(err) {
      exports.render(req, res, 'Executing payment failed. The transaction didnt materialize. Please try again later');
      return;
    }
    const license = user.newLicense();
    license.save(() => {
      exports.render(req, res, 'You just bought license. Have fun and thanks for your support!')
    });
  })
}

const create_payment_json = {
  "intent": "sale",
  "payer": {
      "payment_method": "paypal"
  },
  "redirect_urls": {
      "return_url": "https://localhost:4200/payment",
      "cancel_url": "https://localhost:4200/profile/2"
  },
  "transactions": [{
      "item_list": {
          "items": [{
              "name": "Pronuncation extension",
              "sku": "item",
              "price": "5.00",
              "currency": "USD",
              "quantity": 1
          }]
      },
      "amount": {
          "currency": "USD",
          "total": "5.00"
      },
      "description": "Monthly premium license for pronuncation extension."
  }]
};

const execute_payment_json = (payerId) => { return {
  "payer_id": payerId,
  "transactions": [{
    "amount": {
      "currency": "USD",
      "total": "5.00"
    }
  }]
}};

exports.render = function(req, res, msg) {
  const user = (res.locals.user || req.user);
  if(!user) {
    msg = 'Payment failed due to session expiration. Log in again and try again.';
  }
  const viewBag = {
    user,
    msg
  };
  template.render(viewBag, res);
}


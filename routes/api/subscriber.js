const express = require('express');
const { check, validationResult } = require('express-validator');

const { getMonthName, scheduleJob } = require('../../Utils/cronJob');
const auth = require('../../middleware/auth');

const Subscriber = require('../../models/Subscriber');

const router = express.Router();

// Add New Subscriber

router.post(
  '/addSubscriber',
  [
    auth,
    check('firstName', 'Name is required')
      .not()
      .isEmpty(),
    check('lastName', 'Last Name is required')
      .not()
      .isEmpty(),
    check('fatherName', 'Father Name is required')
      .not()
      .isEmpty()
  ],
  async (req, res) => {
    var d = new Date();
    var month = d.getMonth();
    var year = d.getFullYear();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      let ar = errors.array();
      return res.status(400).json({ msg: ar[0].msg });
    }

    const { firstName, lastName, fatherName } = req.body;

    try {
      let user = await Subscriber.findOne({
        firstName: { $regex: new RegExp(firstName, 'i') },
        lastName: { $regex: new RegExp(lastName, 'i') },
        fatherName: { $regex: new RegExp(fatherName, 'i') }
      });
      // Check if user exists
      if (user) {
        return res.status(400).json({ msg: 'User already exists' });
      }

      let subscriber = new Subscriber({
        firstName,
        lastName,
        fatherName,
        subscription: true,
        payment: [
          {
            year,
            month: getMonthName(month + 1),
            status: false
          }
        ]
      });

      await subscriber.save();

      scheduleJob(subscriber.id);

      res.json({ msg: 'Subscriber Created Successfully' });
    } catch (E) {
      console.log(E.message);
      res.status(500).json({ msg: 'Server Error' });
    }
  }
);

// Get, filter all subscribers and due

router.get('/allSubscribers', auth, async (req, res) => {
  const { filter } = req.query;

  try {
    let subscriber, totalRecords;
    if (!filter || filter.toUpperCase() == 'ALL') {
      totalRecords = await Subscriber.countDocuments();
      subscriber = await Subscriber.find(
        {},
        {
          firstName: 1,
          lastName: 1,
          fatherName: 1,
          subscription: 1,
          'payment.status': 1
        }
      );
    } else if (filter.toUpperCase() == 'PENDING') {
      totalRecords = await Subscriber.countDocuments();
      subscriber = await Subscriber.find(
        {
          'payment.status': false
        },
        {
          firstName: 1,
          lastName: 1,
          fatherName: 1,
          subscription: 1,
          'payment.status': 1
        }
      );
    }

    let allUsers = [];

    let promises = subscriber.map(item => {
      let count = 0;
      item.payment.map(item2 => {
        if (!item2.status) {
          count++;
        }
      });
      allUsers.push({
        _id: item.id,
        firstName: item.firstName,
        lastName: item.lastName,
        fatherName: item.fatherName,
        subscription: item.subscription,
        due: count * 150 // Modify number as per your subscription charge
      });
    });

    Promise.all(promises)
      .then(() => {
        res.json({
          totalRecords,
          users: allUsers
        });
      })
      .catch(E => {
        console.log(E.message);
        res.status(500).json({ msg: 'Server Error' });
      });
  } catch (E) {
    console.log(E.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Get payment list by month (monthly payment)

router.get('/payment/:id', auth, async (req, res) => {
  try {
    let user = await Subscriber.find(
      { _id: req.params.id },
      {
        payment: 1,
        _id: 0
      }
    );
    res.json({ payments: user[0].payment });
  } catch (E) {
    console.log(E.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Receive payment  by month (monthly payment)

router.put('/receivePayment/:id/:payment_id', auth, async (req, res) => {
  try {
    await Subscriber.updateOne(
      { _id: req.params.id, 'payment._id': req.params.payment_id },
      {
        $set: { 'payment.$.status': true }
      }
    );
    res.json({ msg: 'Payment Received' });
  } catch (E) {
    console.log(E.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Delete  payment  for spsecific month

router.delete('/deletePayment/:id/:payment_id', auth, async (req, res) => {
  try {
    await Subscriber.updateOne(
      { _id: req.params.id },
      {
        $pull: { payment: { _id: req.params.payment_id } }
      }
    );
    res.json({ msg: 'Month Removed' });
  } catch (E) {
    console.log(E.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Remove Subscription

router.delete('/removeSubscription/:id', auth, async (req, res) => {
  try {
    await Subscriber.updateOne(
      { _id: req.params.id },
      {
        $set: { subscription: false }
      }
    );
    res.json({ msg: 'Subscription Removed' });
  } catch (E) {
    console.log(E.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Re add Subscription

router.put('/readdSubscription/:id', auth, async (req, res) => {
  try {
    await Subscriber.updateOne(
      { _id: req.params.id },
      {
        $set: { subscription: true }
      }
    );
    scheduleJob(req.params.id);
    res.json({ msg: 'Subscription Readded' });
  } catch (E) {
    console.log(E.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Remove Subscriber

router.delete('/removeSubscriber/:id', auth, async (req, res) => {
  try {
    const user = await Subscriber.findById(req.params.id);
    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    await user.remove();

    res.json({ msg: 'Subscriber removed' });
  } catch (E) {
    console.log(E.message);
    res.status(500).json({ msg: 'Server Error' });
  }
});
module.exports = router;

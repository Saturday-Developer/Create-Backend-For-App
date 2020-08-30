const cron = require('node-cron');
const Subscriber = require('../models/Subscriber');

const monthName = [
  '',
  'Jan',
  'Feb',
  'March',
  'April',
  'May',
  'June',
  'July',
  'Aug',
  'Sept',
  'Oct',
  'Nov',
  'Dec'
];

const getMonthName = month => {
  return monthName[month];
};

const scheduleJob = async id => {
  var d = new Date();
  d.setDate(d.getDate() + 30);
  var min = d.getMinutes();
  var date = d.getDate();
  var seconds = d.getSeconds();
  var month = d.getMonth();
  var year = d.getFullYear();
  var hour = d.getHours();

  try {
    console.log(
      `${seconds >= 59 ? 59 : seconds} ${
        min > 59 ? 59 : min
      } ${hour} ${date} ${month + 1} *`
    );
    cron.schedule(
      `${seconds >= 59 ? 59 : seconds} ${
        min > 59 ? 59 : min
      } ${hour} ${date} ${month + 1} *`,
      async () => {
        let subscriber = await Subscriber.findOne({
          _id: id,
          subscription: true
        });

        if (!subscriber) {
          return true;
        }

        await Subscriber.updateOne(
          { _id: id },
          {
            $push: {
              payment: {
                month: getMonthName(month + 1),
                year: year,
                status: false
              }
            }
          }
        );

        console.log(`Task completed for ${id} at ${date} / ${hour} : ${min}`);

        scheduleJob(id);
      },
      {
        scheduled: true,
        timezone: 'Asia/Kolkata'
      }
    );
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  getMonthName,
  scheduleJob
};

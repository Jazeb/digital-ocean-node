const express = require("express");
const mongoose = require("mongoose");
const app = express();
const giveAwayapp = express();

app.use(express.json());
giveAwayapp.use(express.json());

const MONGO_URI = "mongodb://127.0.0.1:27017/serialKeys";
const SerialKeys = require("./serialKeys");
const KeysCollection = require("./keysCollection");
const User = require("./User");
const ConsumedGiveAways = require("./ConsumedQuota");

const mongoConfig = { useNewUrlParser: true, useUnifiedTopology: true };

mongoose
  .connect(MONGO_URI, mongoConfig)
  .then((_) => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.get("/user", async (req, res) => {
  const key = req.query.key;
  if (!key) return res.status(400).json({ status: false, msg: "Invalid key" });

  const user = await User.findOne({ key });
  return res.status(200).json({ status: true, msg: user });
});

app.post("/user", async (req, res) => {
  const user = new User(req.body);
  await user.save();
  return res.status(200).json({ status: true, msg: req.body });
});

app.get("/add", (req, res) => {
  const data = require("./keys");
  data.forEach(async (d) => {
    const newInsert = new KeysCollection({ serialKey: d });
    newInsert.save(d);
  });
  console.log("Keys added successfully");
  return res.status(200).json({ status: true, msg: "Keys added successfully" });
});

app.post("/assign/serialKey", async function (req, res) {
  const { machineId, userId, serialKey } = req.body;
  if (!(machineId && userId && serialKey))
    return res.status(400).json({ status: false, msg: "Provide required fields" });

  try {
    const isValidKey = await KeysCollection.findOne({ serialKey });
    if (!isValidKey) return res.status(400).json({ status: false, msg: "Invalid serial key" });

    const currentSerialKey = await SerialKeys.findOne({ serialKey });
    if (currentSerialKey) return res.status(400).json({ status: false, msg: "This key is already used" });

    const key = new SerialKeys(req.body);
    await key.save();
    return res.status(200).json({ status: true, msg: "Serial key added for the user" });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
});

function getTodayQuota(c) {
  const giveAways = {
    stickers: 3168,
    chocolates: 6336,
    giftCards: 320,
    TShirts: 288,
  };

  const totalShops = 24;
  const events = 6;

  const stickers = giveAways.stickers / totalShops;
  const chocos = giveAways.chocolates / totalShops;
  const giftCards = giveAways.giftCards / totalShops;
  const tshirts = giveAways.TShirts / totalShops;

  const giveAwayTypes = {
    STICKERS: stickers / events,
    CHOCOLATES: chocos / events,
    GIFT_CARDS: giftCards / events,
    T_SHIRTS: tshirts / events,
  };

  return c.giveAwayConsumed >= giveAwayTypes[c.giveAwayType];
}

let api_hits = 0;
const no = 100;

const megaGiveAwayConsumed = {
  TWIX: 0,
  GALAXY: 0,
};

const getTodayGiveAway = (consumed = []) => {
  const giveAways = ["STICKERS", "CHOCOLATES", "T_SHIRTS"];
  const diffArr = giveAways.filter((o) => !consumed.includes(o));

  return diffArr[Math.floor(Math.random() * diffArr.length)];
};

giveAwayapp.get("/giveAway", async (req, res) => {
  api_hits++;
  const { shopId, date } = req.query;

  // return await ConsumedGiveAways.deleteOne({
  //   shopId,
  // });
  let shouldReturn = false;
  const megaAwardNotCompleted = megaGiveAwayConsumed.GALAXY < 2 || megaGiveAwayConsumed.TWIX < 2;

  if (api_hits == no && megaAwardNotCompleted) {
    // mega award

    const mega_give_aways = ["TWIX", "GALAXY"];
    const today_mega_give_away = mega_give_aways[Math.floor(Math.random() * mega_give_aways.length)];

    if (megaGiveAwayConsumed[today_mega_give_away] == 2) {
      const index = mega_give_aways.indexOf(today_mega_give_away) ^ 1;

      megaGiveAwayConsumed[mega_give_aways[index]]++;
      api_hits = 0;
      return res.status(200).json({
        status: true,
        today_mega_give_away: megaGiveAwayConsumed[mega_give_aways[index]],
      });
    } else {
      megaGiveAwayConsumed[today_mega_give_away]++;
      api_hits = 0;
      return res.status(200).json({ status: true, todayGiveAway: today_mega_give_away });
    }
  } else {
    let todayGiveAway = "";

    const previouslyConsumed = await ConsumedGiveAways.findOne({
      shopId,
    });

    if (previouslyConsumed) {
      const { consumedGiveAways } = previouslyConsumed;

      const todayGiveAways = consumedGiveAways.filter((g) => g.date == date);

      if (todayGiveAways.length) {
        const consumedToday = [];
        for (const c of todayGiveAways) {
          const isQuotaCompleted = getTodayQuota(c);
          if (isQuotaCompleted) consumedToday.push(c.giveAwayType);
        }

        todayGiveAway = getTodayGiveAway(consumedToday);
        const consumedString = previouslyConsumed.consumedGiveAways.map((c) => c.giveAwayType);

        previouslyConsumed.consumedGiveAways.map((c) => {
          if (c.giveAwayType == todayGiveAway && c.date == date) c.giveAwayConsumed++;
          else {
            // no giveaway for today and for this type

            if (!consumedString.includes(todayGiveAway)) {
              consumedString.push(todayGiveAway);
              consumedGiveAways.push({
                giveAwayType: todayGiveAway,
                giveAwayConsumed: 1,
                date,
              });
            }
          }
        });

        if (!todayGiveAway && consumedToday.length == 3) {
          shouldReturn = true;
          return res.status(200).json({ status: false, todayGiveAway: "Try Again" });
        } else {
          console.log("Updating\n", previouslyConsumed);
          const newUpdated = new ConsumedGiveAways(previouslyConsumed);
          await newUpdated.save();
        }
      } else {
        // no giveaway for today and for this type
        todayGiveAway = getTodayGiveAway();
        previouslyConsumed.consumedGiveAways.push({
          giveAwayType: todayGiveAway,
          giveAwayConsumed: 1,
          date,
        });

        const _newGiveAway = new ConsumedGiveAways(previouslyConsumed);
        await _newGiveAway.save();
      }
    } else {
      todayGiveAway = getTodayGiveAway();
      const _newGiveAway = new ConsumedGiveAways({
        shopId,
        consumedGiveAways: [
          {
            giveAwayType: todayGiveAway,
            giveAwayConsumed: 1,
            date,
          },
        ],
      });
      await _newGiveAway.save();
    }
    if (shouldReturn) return;

    return res.status(200).json({ status: true, todayGiveAway });
  }
});

app.listen(3000, (_) => console.log("Server is running"));
giveAwayapp.listen(4000, (_) => console.log("Give Away server running"));

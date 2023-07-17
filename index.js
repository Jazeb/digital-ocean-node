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
    return res
      .status(400)
      .json({ status: false, msg: "Provide required fields" });

  try {
    const isValidKey = await KeysCollection.findOne({ serialKey });
    if (!isValidKey)
      return res.status(400).json({ status: false, msg: "Invalid serial key" });

    const currentSerialKey = await SerialKeys.findOne({ serialKey });
    if (currentSerialKey)
      return res
        .status(400)
        .json({ status: false, msg: "This key is already used" });

    const key = new SerialKeys(req.body);
    await key.save();
    return res
      .status(200)
      .json({ status: true, msg: "Serial key added for the user" });
  } catch (err) {
    return res.status(500).json({ status: false, msg: err.message });
  }
});

function getTodayQuota(todayGiveAway) {
  const giveAways = {
    stickers: 2964,
    chocolates: 2964,
    giftCards: 312,
    TShirts: 312,
  };

  const totalShops = 26;
  const events = 6;

  const stickers = giveAways.stickers / totalShops;
  const chocos = giveAways.chocolates / totalShops;
  const giftCards = giveAways.giftCards / totalShops;
  const tshirts = giveAways.TShirts / totalShops;

  const typeEvents = {
    STICKERS: stickers / events,
    CHOCOLATES: chocos / events,
    GIFT_CARDS: giftCards / events,
    T_SHIRTS: tshirts / events,
  };

  return typeEvents[todayGiveAway];
}

// async function addNewGiveAway(shopId, newObj) {
//   try {
//     const previouslyConsumed = await ConsumedGiveAways.findOne({
//       shopId,
//     });

//     previouslyConsumed.consumedGiveAways.push(newObj);

//     const updated = new ConsumedGiveAways(previouslyConsumed);
//     await updated.save();
//     return true;
//   } catch (error) {
//     console.error(error);
//     return;
//   }
// }

let api_hits = 0;
const no = 100;

const megaGiveAwayConsumed = {
  TWIX: 0,
  GALAXY: 0,
};

giveAwayapp.get("/giveAway", async (req, res) => {
  api_hits++;
  const { shopId, date, resetMegaAward } = req.query;

  // return await ConsumedGiveAways.deleteOne({
  //   shopId,
  // });

  // if (resetMegaAward) {
  //   megaGiveAwayConsumed.GALAXY = 0;
  //   megaGiveAwayConsumed.TWIX = 0;
  // }

  const megaAwardNotCompleted =
    megaGiveAwayConsumed.GALAXY < 2 || megaGiveAwayConsumed.TWIX < 2;

  if (api_hits == no && megaAwardNotCompleted) {
    // mega award

    const mega_give_aways = ["TWIX", "GALAXY"];
    const today_mega_give_away =
      mega_give_aways[Math.floor(Math.random() * mega_give_aways.length)];

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
      return res.status(200).json({ status: true, today_mega_give_away });
    }
  } else {
    if (!shopId || !date)
      return res
        .status(400)
        .json({ status: false, msg: "Provide shop id and date" });

    const _todayGiveAway = ["STICKERS", "CHOCOLATES", "GIFT_CARDS", "T_SHIRTS"];
    const todayGiveAway =
      _todayGiveAway[Math.floor(Math.random() * _todayGiveAway.length)];

    const todayQuota = getTodayQuota(todayGiveAway);

    const previouslyConsumed = await ConsumedGiveAways.findOne({
      shopId,
    });

    let quotaCompleted = false;
    if (previouslyConsumed) {
      const { consumedGiveAways } = previouslyConsumed;

      const hasTodayGiveAway = consumedGiveAways.filter(
        (g) => g.giveAwayType == todayGiveAway && g.date == date
      );

      if (hasTodayGiveAway.length) {
        let shouldUpdate = false;

        previouslyConsumed.consumedGiveAways.map(async (c) => {
          if (c.giveAwayType == todayGiveAway && c.date == date) {
            if (c.giveAwayConsumed < todayQuota) {
              c.giveAwayConsumed++;
              shouldUpdate = true;
            } else quotaCompleted = true;
          }
        });
        if (shouldUpdate) {
          const newUpdated = new ConsumedGiveAways(previouslyConsumed);
          await newUpdated.save();
        }
      } else {
        // no giveaway for today and for this type
        previouslyConsumed.consumedGiveAways.push({
          giveAwayType: todayGiveAway,
          giveAwayConsumed: 1,
          date,
        });

        const _newGiveAway = new ConsumedGiveAways(previouslyConsumed);
        await _newGiveAway.save();
      }
    } else {
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
    // const newG = await ConsumedGiveAways.findOne({
    //   shopId,
    // });

    // console.log(newG);

    if (quotaCompleted) {
      return res.status(200).json({
        status: true,
        msg: `Try Again`,
      });
    } else {
      return res.status(200).json({ status: true, todayGiveAway });
    }
  }
});

app.listen(3000, (_) => console.log("Server is running"));
giveAwayapp.listen(4000, (_) => console.log("Give Away server running"));

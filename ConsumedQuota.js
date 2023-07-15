const mongoose = require("mongoose").set("debug", true);
const Schema = mongoose.Schema;

const consumedGiveAways = Schema(
  {
    shopId: {
      type: String,
      required: true,
      unique: true,
    },

    consumedGiveAways: [
      {
        giveAwayType: {
          type: String,
          required: true,
        },
        giveAwayConsumed: {
          type: Number,
          required: true,
        },
        date: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { collection: "consumedGiveAways" },
  { __v: false }
);

module.exports = mongoose.model("consumedGiveAways", consumedGiveAways);

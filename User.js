const mongoose = require("mongoose").set("debug", true);
const Schema = mongoose.Schema;

const UsersCollection = Schema(
  {
    userName: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
    },
    phoneNumber: {
      type: String,
      required: false,
    },
    questionOneAnswer: {
      type: String,
      required: false,
    },
    questionTwoAnswer: {
      type: String,
      required: false,
    },
    questionThreeAnswer: {
      type: String,
      required: false,
    },
  },
  { collection: "UsersCollection" },
  { __v: false }
);

module.exports = mongoose.model("UsersCollection", UsersCollection);

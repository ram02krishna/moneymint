/**
 * One-time clean-up for data saved while the validators still HTML-escaped input
 * ("McDonald's" was stored as "McDonald&#x27;s", "Rent/Utilities" as "Rent&#x2F;Utilities").
 *
 * Usage (from /Backend):   node scripts/decode-legacy-entities.js          # preview only
 *                          node scripts/decode-legacy-entities.js --apply  # write the changes
 * Run it once: running it again would also decode text a user typed on purpose.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const User = require("../models/User");

const ENTITIES = [
  [/&lt;/g, "<"],
  [/&gt;/g, ">"],
  [/&quot;/g, '"'],
  [/&#x27;/g, "'"],
  [/&#x2F;/g, "/"],
  [/&#x5C;/g, "\\"],
  [/&#96;/g, "`"],
  [/&amp;/g, "&"], // last, so "&amp;lt;" becomes "&lt;" and not "<"
];

const decode = (value) => ENTITIES.reduce((text, [pattern, char]) => text.replace(pattern, char), value);

const TARGETS = [
  [Expense, ["title", "category", "description"]],
  [Income, ["title", "source", "category", "note"]],
  [Budget, ["category"]],
  [Goal, ["title"]],
  [User, ["fullName"]],
];

(async () => {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGO_URI);

  let changed = 0;
  for (const [Model, fields] of TARGETS) {
    for await (const doc of Model.find({}).cursor()) {
      const update = {};
      fields.forEach((field) => {
        const current = doc.get(field);
        if (typeof current === "string" && /&(?:amp|lt|gt|quot|#x27|#x2F|#x5C|#96);/.test(current)) {
          update[field] = decode(current);
        }
      });

      if (Object.keys(update).length) {
        changed += 1;
        console.log(`${Model.modelName} ${doc._id}:`, update);
        if (apply) await Model.updateOne({ _id: doc._id }, { $set: update });
      }
    }
  }

  console.log(`\n${changed} document(s) ${apply ? "updated" : "would be updated (re-run with --apply)"}.`);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

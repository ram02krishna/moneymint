const Goal = require("../models/Goal");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateObjectId } = require("../utils/queryValidator");

// create a goal
exports.createGoal = asyncHandler(async (req, res) => {
  let { title, icon, targetAmount, deadline } = req.body;

  let goal = await Goal.create({
    user: req.user.id,
    title,
    icon: icon || "🎯",
    targetAmount,
    deadline: deadline || null,
  });

  res.status(201).json({ status: "success", data: { goal } });
});

// get all goals of the user
exports.getGoals = asyncHandler(async (req, res) => {
  let goals = await Goal.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    status: "success",
    results: goals.length,
    data: { goals },
  });
});

// update goal details (not the saved amount)
exports.updateGoal = asyncHandler(async (req, res, next) => {
  let gId = validateObjectId(req.params.id, "Goal ID");
  let uId = validateObjectId(req.user.id, "User ID");

  let { title, icon, targetAmount, deadline } = req.body;
  let update = { title, targetAmount, deadline: deadline || null };
  if (icon) update.icon = icon;

  let goal = await Goal.findOneAndUpdate({ _id: gId, user: uId }, update, {
    new: true,
    runValidators: true,
  });

  if (!goal) return next(new AppError("Cannot find goal to update", 404));

  res.status(200).json({ status: "success", data: { goal } });
});

// add money to a goal (negative amount = withdraw)
exports.addContribution = asyncHandler(async (req, res, next) => {
  let gId = validateObjectId(req.params.id, "Goal ID");
  let uId = validateObjectId(req.user.id, "User ID");

  let amount = Number(req.body.amount);
  let note = req.body.note;

  let goal = await Goal.findOne({ _id: gId, user: uId });
  if (!goal) return next(new AppError("Cannot find goal", 404));

  if (goal.savedAmount + amount < 0) {
    return next(new AppError("Cannot withdraw more than saved amount", 400));
  }

  goal.savedAmount = goal.savedAmount + amount;
  goal.contributions.push({ amount, note });
  await goal.save();

  res.status(200).json({ status: "success", data: { goal } });
});

// delete goal
exports.deleteGoal = asyncHandler(async (req, res, next) => {
  let gId = validateObjectId(req.params.id, "Goal ID");
  let uId = validateObjectId(req.user.id, "User ID");

  let goal = await Goal.findOneAndDelete({ _id: gId, user: uId });
  if (!goal) return next(new AppError("Cannot find goal to delete", 404));

  res.status(204).json({ status: "success", data: null });
});

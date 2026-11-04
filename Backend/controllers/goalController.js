const Goal = require("../models/Goal");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateObjectId } = require("../utils/queryValidator");

exports.createGoal = asyncHandler(async (req, res) => {
  const { title, icon, targetAmount, deadline } = req.body;

  const goal = await Goal.create({
    user: req.user.id,
    title,
    icon: icon || "🎯",
    targetAmount,
    deadline: deadline || null,
  });

  res.status(201).json({ status: "success", data: { goal } });
});

exports.getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
  res.status(200).json({ status: "success", results: goals.length, data: { goals } });
});

// update goal details (not the saved amount)
exports.updateGoal = asyncHandler(async (req, res, next) => {
  const { title, icon, targetAmount, deadline } = req.body;
  const update = { title, targetAmount, deadline: deadline || null };
  if (icon) update.icon = icon;

  const goal = await Goal.findOneAndUpdate(
    { _id: validateObjectId(req.params.id, "Goal ID"), user: req.user.id },
    update,
    { new: true, runValidators: true },
  );
  if (!goal) return next(new AppError("Cannot find goal to update", 404));

  res.status(200).json({ status: "success", data: { goal } });
});

// add money to a goal (negative amount = withdraw)
exports.addContribution = asyncHandler(async (req, res, next) => {
  const goalId = validateObjectId(req.params.id, "Goal ID");
  const amount = Number(req.body.amount);
  const { note } = req.body;

  // One atomic update: the saved amount can never go negative, even with two requests at once.
  const filter = { _id: goalId, user: req.user.id };
  if (amount < 0) filter.savedAmount = { $gte: -amount };

  const goal = await Goal.findOneAndUpdate(
    filter,
    { $inc: { savedAmount: amount }, $push: { contributions: { amount, note } } },
    { new: true },
  );

  if (!goal) {
    const exists = await Goal.exists({ _id: goalId, user: req.user.id });
    return next(
      exists
        ? new AppError("Cannot withdraw more than saved amount", 400)
        : new AppError("Cannot find goal", 404),
    );
  }

  res.status(200).json({ status: "success", data: { goal } });
});

exports.deleteGoal = asyncHandler(async (req, res, next) => {
  const goal = await Goal.findOneAndDelete({
    _id: validateObjectId(req.params.id, "Goal ID"),
    user: req.user.id,
  });
  if (!goal) return next(new AppError("Cannot find goal to delete", 404));
  res.status(204).end();
});

import React, { useState, useEffect, useMemo, useContext } from "react";
import {
  LuReceipt,
  LuPlus,
  LuTrash2,
  LuUsers,
  LuCalendar,
  LuFileText,
  LuLayers,
} from "react-icons/lu";
import Modal from "../layouts/Modal";
import ModernDatePicker from "../Inputs/ModernDatePicker";
import { UserContext } from "../../context/UserContextDefinition";
import {
  CATEGORIES,
  SPLIT_METHODS,
  previewShares,
  formatCurrency,
} from "../../utils/splitHelper";

const AddSplitExpenseModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  groups = [],
  friends = [],
  defaultGroupId = null,
  loading = false,
}) => {
  const { user } = useContext(UserContext);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food & Dining");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(defaultGroupId || "");
  const [splitMethod, setSplitMethod] = useState("equal");

  // Single payer or multiple payers
  const [isMultiplePayers, setIsMultiplePayers] = useState(false);
  const [singlePayerKey, setSinglePayerKey] = useState("currentUser");
  const [multiplePayers, setMultiplePayers] = useState({});

  // Participants selection & shares
  const [selectedMemberKeys, setSelectedMemberKeys] = useState(new Set());
  const [exactShares, setExactShares] = useState({});
  const [percentageShares, setPercentageShares] = useState({});
  const [ratioShares, setRatioShares] = useState({});

  // Itemized split state
  const [items, setItems] = useState([
    { id: 1, name: "Item 1", price: "", assignedTo: [] },
  ]);
  const [tax, setTax] = useState("");
  const [tip, setTip] = useState("");

  const [formError, setFormError] = useState("");

  // Determine available pool of members (from selected group, or from friends + self)
  const availableMembers = useMemo(() => {
    const list = [];
    const selfKey = user?._id || "currentUser";

    // Self always present
    list.push({
      key: selfKey,
      id: user?._id || null,
      user: user?._id || null,
      name: user?.fullName ? `${user.fullName} (You)` : "You",
      email: user?.email || "",
      isSelf: true,
    });

    if (selectedGroupId) {
      const grp = groups.find((g) => String(g._id) === String(selectedGroupId));
      if (grp && Array.isArray(grp.members)) {
        grp.members.forEach((m) => {
          const mKey = m.user ? String(m.user) : (m._id ? String(m._id) : m.name);
          const isUser =
            (m.user && String(m.user) === String(user?._id)) ||
            (m.email && m.email.toLowerCase() === user?.email?.toLowerCase());

          if (!isUser) {
            list.push({
              key: mKey,
              id: m.user || m._id || null,
              user: m.user || null,
              name: m.name,
              email: m.email || "",
              isSelf: false,
            });
          }
        });
      }
    } else {
      // Non-group: show all friends
      friends.forEach((fr) => {
        const frKey = fr.friendUser
          ? String(fr.friendUser._id || fr.friendUser)
          : String(fr._id);
        list.push({
          key: frKey,
          id: fr.friendUser?._id || fr.friendUser || fr._id,
          user: fr.friendUser?._id || fr.friendUser || null,
          name: fr.name,
          email: fr.email || "",
          isSelf: false,
        });
      });
    }

    return list;
  }, [user, selectedGroupId, groups, friends]);

  // Reset or initialize state
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setTitle(initialData.title || "");
      setAmount(initialData.amount ? String(initialData.amount) : "");
      setCategory(initialData.category || "Food & Dining");
      setDate(
        initialData.date
          ? new Date(initialData.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
      );
      setNotes(initialData.notes || "");
      setSelectedGroupId(initialData.group?._id || initialData.group || "");
      setSplitMethod(initialData.splitMethod || "equal");

      // Payers
      if (initialData.paidBy && initialData.paidBy.length > 1) {
        setIsMultiplePayers(true);
        const map = {};
        initialData.paidBy.forEach((p) => {
          const k = p.user ? String(p.user) : p.name;
          map[k] = p.amount;
        });
        setMultiplePayers(map);
      } else if (initialData.paidBy && initialData.paidBy[0]) {
        setIsMultiplePayers(false);
        const p0 = initialData.paidBy[0];
        setSinglePayerKey(p0.user ? String(p0.user) : "currentUser");
      }

      // Participants
      const partSet = new Set();
      const exMap = {};
      const pctMap = {};
      const ratMap = {};

      (initialData.participants || []).forEach((p) => {
        const k = p.user ? String(p.user) : p.name;
        partSet.add(k);
        if (p.shareAmount != null) exMap[k] = p.shareAmount;
        if (p.percentage != null) pctMap[k] = p.percentage;
        if (p.shares != null) ratMap[k] = p.shares;
      });

      setSelectedMemberKeys(partSet);
      setExactShares(exMap);
      setPercentageShares(pctMap);
      setRatioShares(ratMap);

      if (initialData.itemDetails && initialData.itemDetails.length > 0) {
        setItems(
          initialData.itemDetails.map((it, idx) => ({
            id: idx + 1,
            name: it.name,
            price: it.price,
            assignedTo: it.assignedTo || [],
          })),
        );
      }
      setTax(initialData.tax ? String(initialData.tax) : "");
      setTip(initialData.tip ? String(initialData.tip) : "");
    } else {
      // New expense defaults
      setTitle("");
      setAmount("");
      setCategory("Food & Dining");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setSelectedGroupId(defaultGroupId || "");
      setSplitMethod("equal");
      setIsMultiplePayers(false);
      setSinglePayerKey(user?._id || "currentUser");
      setMultiplePayers({});
      setItems([{ id: 1, name: "Item 1", price: "", assignedTo: [] }]);
      setTax("");
      setTip("");
      setFormError("");

      // Default: select all available members in group, or self + first friend
      const defaultSet = new Set();
      const selfKey = user?._id || "currentUser";
      defaultSet.add(selfKey);

      if (defaultGroupId) {
        const grp = groups.find((g) => String(g._id) === String(defaultGroupId));
        if (grp && Array.isArray(grp.members)) {
          grp.members.forEach((m) => {
            const k = m.user ? String(m.user) : (m._id ? String(m._id) : m.name);
            defaultSet.add(k);
          });
        }
      } else if (friends.length > 0) {
        const fr = friends[0];
        const frKey = fr.friendUser
          ? String(fr.friendUser._id || fr.friendUser)
          : String(fr._id);
        defaultSet.add(frKey);
      }

      setSelectedMemberKeys(defaultSet);
      setExactShares({});
      setPercentageShares({});
      setRatioShares({});
    }
  }, [isOpen, initialData, defaultGroupId, user, groups, friends]);

  // When selectedGroupId changes, update selected members to match group members
  const handleGroupChange = (newGroupId) => {
    setSelectedGroupId(newGroupId);
    const newSet = new Set();
    const selfKey = user?._id || "currentUser";
    newSet.add(selfKey);

    if (newGroupId) {
      const grp = groups.find((g) => String(g._id) === String(newGroupId));
      if (grp && Array.isArray(grp.members)) {
        grp.members.forEach((m) => {
          const k = m.user ? String(m.user) : (m._id ? String(m._id) : m.name);
          newSet.add(k);
        });
      }
    }
    setSelectedMemberKeys(newSet);
  };

  const toggleMember = (memberKey) => {
    setSelectedMemberKeys((prev) => {
      const next = new Set(prev);
      if (next.has(memberKey)) {
        if (next.size <= 1) return prev; // At least one participant required
        next.delete(memberKey);
      } else {
        next.add(memberKey);
      }
      return next;
    });
  };

  // Filtered active participants list
  const activeParticipants = useMemo(() => {
    return availableMembers.filter((m) => selectedMemberKeys.has(m.key));
  }, [availableMembers, selectedMemberKeys]);

  // Calculate live share preview
  const previewedShares = useMemo(() => {
    const participantsData = activeParticipants.map((p) => ({
      ...p,
      shareAmount: exactShares[p.key] || 0,
      percentage: percentageShares[p.key] || 0,
      shares: ratioShares[p.key] || 1,
    }));

    return previewShares({
      amount: Number(amount) || 0,
      splitMethod,
      participants: participantsData,
      itemDetails: items,
      tax: Number(tax) || 0,
      tip: Number(tip) || 0,
    });
  }, [
    activeParticipants,
    amount,
    splitMethod,
    exactShares,
    percentageShares,
    ratioShares,
    items,
    tax,
    tip,
  ]);

  // Validation checks for split methods
  const validationInfo = useMemo(() => {
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) return { valid: false, message: "" };

    if (splitMethod === "exact") {
      const sumExact = activeParticipants.reduce(
        (sum, p) => sum + (Number(exactShares[p.key]) || 0),
        0,
      );
      const diff = Math.round((numAmount - sumExact) * 100) / 100;
      if (Math.abs(diff) > 0.01) {
        return {
          valid: false,
          message:
            diff > 0
              ? `₹${diff.toFixed(2)} remaining to allocate`
              : `Allocated ₹${Math.abs(diff).toFixed(2)} too much`,
        };
      }
    }

    if (splitMethod === "percentage") {
      const sumPct = activeParticipants.reduce(
        (sum, p) => sum + (Number(percentageShares[p.key]) || 0),
        0,
      );
      const diff = Math.round((100 - sumPct) * 10) / 10;
      if (Math.abs(diff) > 0.05) {
        return {
          valid: false,
          message:
            diff > 0
              ? `${diff}% remaining (must equal 100%)`
              : `Total is ${sumPct}% (must equal 100%)`,
        };
      }
    }

    if (isMultiplePayers) {
      const sumPaid = availableMembers.reduce(
        (sum, p) => sum + (Number(multiplePayers[p.key]) || 0),
        0,
      );
      const diff = Math.round((numAmount - sumPaid) * 100) / 100;
      if (Math.abs(diff) > 0.01) {
        return {
          valid: false,
          message:
            diff > 0
              ? `₹${diff.toFixed(2)} remaining from payers`
              : `Payers paid ₹${Math.abs(diff).toFixed(2)} more than total`,
        };
      }
    }

    return { valid: true, message: "" };
  }, [
    amount,
    splitMethod,
    activeParticipants,
    exactShares,
    percentageShares,
    isMultiplePayers,
    availableMembers,
    multiplePayers,
  ]);

  // Itemized split handlers
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: `Item ${prev.length + 1}`,
        price: "",
        assignedTo: [],
      },
    ]);
  };

  const removeItem = (id) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
    );
  };

  const toggleItemAssignment = (itemId, memberKey) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const assigned = new Set(it.assignedTo || []);
        if (assigned.has(memberKey)) assigned.delete(memberKey);
        else assigned.add(memberKey);
        return { ...it, assignedTo: Array.from(assigned) };
      }),
    );
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const numAmount = Number(amount);
    if (!title.trim()) {
      setFormError("Please enter an expense title");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Please enter a valid positive amount");
      return;
    }
    if (activeParticipants.length === 0) {
      setFormError("Please select at least one participant");
      return;
    }
    if (!validationInfo.valid && validationInfo.message) {
      setFormError(validationInfo.message);
      return;
    }

    // Build paidBy array
    let paidByList = [];
    if (isMultiplePayers) {
      paidByList = availableMembers
        .filter((m) => Number(multiplePayers[m.key]) > 0)
        .map((m) => ({
          user: m.user || null,
          name: m.name.replace(" (You)", ""),
          email: m.email || "",
          amount: Number(multiplePayers[m.key]),
        }));
    } else {
      const payer =
        availableMembers.find((m) => m.key === singlePayerKey) ||
        availableMembers.find((m) => m.isSelf) ||
        availableMembers[0];

      paidByList = [
        {
          user: payer.user || null,
          name: payer.name.replace(" (You)", ""),
          email: payer.email || "",
          amount: numAmount,
        },
      ];
    }

    // Build participants array
    const participantsList = activeParticipants.map((p) => {
      const preview = previewedShares.find((ps) => ps.key === p.key);
      return {
        user: p.user || null,
        name: p.name.replace(" (You)", ""),
        email: p.email || "",
        shareAmount: preview ? preview.shareAmount : 0,
        percentage:
          splitMethod === "percentage" ? Number(percentageShares[p.key]) : null,
        shares: splitMethod === "shares" ? Number(ratioShares[p.key] || 1) : null,
      };
    });

    const payload = {
      title: title.trim(),
      amount: numAmount,
      category,
      date,
      group: selectedGroupId || null,
      notes: notes.trim(),
      paidBy: paidByList,
      splitMethod,
      participants: participantsList,
      itemDetails:
        splitMethod === "itemized"
          ? items.map((it) => ({
              name: it.name,
              price: Number(it.price) || 0,
              assignedTo: it.assignedTo,
            }))
          : [],
      tax: splitMethod === "itemized" ? Number(tax) || 0 : 0,
      tip: splitMethod === "itemized" ? Number(tip) || 0 : 0,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setFormError(err?.response?.data?.message || err.message || "Failed to save expense");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Shared Expense" : "Add Shared Expense"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {formError}
          </div>
        )}

        {/* Group / Context selection */}
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <LuUsers className="text-purple-600" />
            Group or Context
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="input-box !mt-1.5 !mb-0 cursor-pointer"
          >
            <option value="">Non-Group (Direct with Friends)</option>
            {groups.map((grp) => (
              <option key={grp._id} value={grp._id}>
                {grp.icon} {grp.name} ({grp.members?.length || 0} members)
              </option>
            ))}
          </select>
        </div>

        {/* Title & Amount Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <LuReceipt className="text-purple-600" />
              Expense Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Dinner, Airbnb, Groceries"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-box !mt-1.5 !mb-0"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              Total Amount (₹) *
            </label>
            <div className="relative !mt-1.5">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-box !mt-0 !mb-0 pl-8 font-semibold text-base"
                required
              />
            </div>
          </div>
        </div>

        {/* Category & Date Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <LuLayers className="text-purple-600" />
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-box !mt-0 !mb-0 cursor-pointer h-11"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <LuCalendar className="text-purple-600" />
              Date
            </label>
            <ModernDatePicker
              label={null}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              colorTheme="purple"
              inputClassName="py-2.5 h-11"
            />
          </div>
        </div>

        {/* Paid By Section */}
        <div className="p-3.5 bg-gray-50/80 dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Paid by:
            </span>
            <button
              type="button"
              onClick={() => setIsMultiplePayers(!isMultiplePayers)}
              className="text-xs font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 cursor-pointer"
            >
              {isMultiplePayers ? "Single Payer" : "Multiple Payers"}
            </button>
          </div>

          {!isMultiplePayers ? (
            <select
              value={singlePayerKey}
              onChange={(e) => setSinglePayerKey(e.target.value)}
              className="input-box !mt-0 !mb-0 bg-white dark:bg-gray-700 cursor-pointer"
            >
              {availableMembers.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-2 mt-2">
              {availableMembers.map((m) => (
                <div
                  key={m.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300 text-xs">
                    {m.name}
                  </span>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={multiplePayers[m.key] || ""}
                      onChange={(e) =>
                        setMultiplePayers({
                          ...multiplePayers,
                          [m.key]: e.target.value,
                        })
                      }
                      className="w-full text-xs pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Participants Selection */}
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
            Split between ({activeParticipants.length} selected):
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableMembers.map((m) => {
              const selected = selectedMemberKeys.has(m.key);
              return (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => toggleMember(m.key)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    selected
                      ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-purple-300"
                  }`}
                >
                  {selected ? "✓ " : "+ "}
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Method Tabs */}
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">
            Split Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl">
            {SPLIT_METHODS.map((sm) => {
              const active = splitMethod === sm.id;
              return (
                <button
                  key={sm.id}
                  type="button"
                  onClick={() => setSplitMethod(sm.id)}
                  className={`text-xs font-semibold py-1.5 px-2 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                    active
                      ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  <span className="text-sm">{sm.symbol}</span>
                  <span className="text-[11px]">{sm.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Split Method Inputs */}
        <div className="p-3.5 bg-gray-50/80 dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700">
          {splitMethod === "equal" && (
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>Each person pays an equal portion.</p>
              {Number(amount) > 0 && (
                <p className="font-semibold text-purple-600 dark:text-purple-400 text-sm mt-2">
                  Share per person:{" "}
                  {formatCurrency((Number(amount) / activeParticipants.length) || 0)}
                </p>
              )}
            </div>
          )}

          {splitMethod === "exact" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Enter exact amount for each:</span>
                <span
                  className={
                    validationInfo.valid ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"
                  }
                >
                  {validationInfo.message || "✓ All allocated"}
                </span>
              </div>
              {activeParticipants.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {p.name}
                  </span>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={exactShares[p.key] || ""}
                      onChange={(e) =>
                        setExactShares({ ...exactShares, [p.key]: e.target.value })
                      }
                      className="w-full text-sm pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {splitMethod === "percentage" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Enter percentages:</span>
                <span
                  className={
                    validationInfo.valid ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"
                  }
                >
                  {validationInfo.message || "✓ 100% Total"}
                </span>
              </div>
              {activeParticipants.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {p.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="relative w-24">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={percentageShares[p.key] || ""}
                        onChange={(e) =>
                          setPercentageShares({
                            ...percentageShares,
                            [p.key]: e.target.value,
                          })
                        }
                        className="w-full text-sm pr-7 pl-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        %
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 w-20 text-right">
                      {formatCurrency(
                        ((Number(amount) || 0) * (Number(percentageShares[p.key]) || 0)) /
                          100,
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {splitMethod === "shares" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">
                Specify portions (e.g. 1 share, 2 shares):
              </p>
              {activeParticipants.map((p) => (
                <div key={p.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {p.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      value={ratioShares[p.key] || "1"}
                      onChange={(e) =>
                        setRatioShares({ ...ratioShares, [p.key]: e.target.value })
                      }
                      className="w-20 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-center"
                    />
                    <span className="text-xs text-gray-400">shares</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {splitMethod === "itemized" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Line Items
                </span>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <LuPlus className="text-sm" /> Add Item
                </button>
              </div>

              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Item ${idx + 1}`}
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={item.price}
                        onChange={(e) => updateItem(item.id, "price", e.target.value)}
                        className="w-full text-sm pl-6 pr-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <LuTrash2 className="text-sm" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-gray-400 mr-1 self-center">
                      Split with:
                    </span>
                    {activeParticipants.map((p) => {
                      const isAssigned = (item.assignedTo || []).includes(p.key);
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => toggleItemAssignment(item.id, p.key)}
                          className={`text-[11px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            isAssigned
                              ? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-600"
                              : "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-600"
                          }`}
                        >
                          {p.name.split(" ")[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Tax Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="input-box text-sm py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Tip Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={tip}
                    onChange={(e) => setTip(e.target.value)}
                    className="input-box text-sm py-2"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Breakdown Preview */}
          {Number(amount) > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-500 block mb-2">
                Calculated Share Breakdown:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {previewedShares.map((ps) => (
                  <div
                    key={ps.key}
                    className="p-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 text-xs"
                  >
                    <p className="text-gray-500 dark:text-gray-400 truncate">
                      {ps.name}
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                      {formatCurrency(ps.shareAmount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <LuFileText className="text-purple-600" />
            Notes (Optional)
          </label>
          <textarea
            rows="2"
            placeholder="Add details, receipt notes, flight number, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-box !mt-1.5 !mb-0 py-2 resize-none"
          />
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky -bottom-5 sm:-bottom-6 md:-bottom-8 -mx-5 sm:-mx-6 md:-mx-8 px-5 sm:px-6 md:px-8 py-3.5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-end gap-3 z-20 mt-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.25)]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-7 py-2.5 rounded-xl font-semibold text-sm text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Saving..." : initialData ? "Update Expense" : "Save Expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSplitExpenseModal;


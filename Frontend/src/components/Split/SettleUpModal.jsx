import React, { useState, useEffect, useContext } from "react";
import { LuHandCoins, LuCalendar, LuFileText, LuCreditCard } from "react-icons/lu";
import Modal from "../layouts/Modal";
import ModernDatePicker from "../Inputs/ModernDatePicker";
import { UserContext } from "../../context/UserContextDefinition";
import { PAYMENT_METHODS } from "../../utils/splitHelper";
import { formatCurrency } from "../../utils/helper";

const SettleUpModal = ({
  isOpen,
  onClose,
  onSubmit,
  defaultPayer = null,
  defaultPayee = null,
  defaultAmount = 0,
  defaultGroup = null,
  friends = [],
  groups = [],
  loading = false,
}) => {
  const { user } = useContext(UserContext);

  const [payerId, setPayerId] = useState("");
  const [payeeId, setPayeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [error, setError] = useState("");

  // People available for settling: current user + all friends
  const peopleList = React.useMemo(() => {
    const list = [
      {
        id: user?._id || "currentUser",
        user: user?._id || null,
        name: user?.fullName ? `${user.fullName} (You)` : "You",
        email: user?.email || "",
      },
    ];

    friends.forEach((fr) => {
      const id = fr.friendUser?._id || fr.friendUser || fr._id;
      list.push({
        id: String(id),
        user: fr.friendUser?._id || fr.friendUser || null,
        name: fr.name,
        email: fr.email || "",
      });
    });

    return list;
  }, [user, friends]);

  useEffect(() => {
    if (!isOpen) return;

    const selfId = user?._id || "currentUser";

    if (defaultPayer && defaultPayee) {
      setPayerId(String(defaultPayer.user || defaultPayer.id || defaultPayer._id || selfId));
      setPayeeId(String(defaultPayee.user || defaultPayee.id || defaultPayee._id));
    } else {
      // Default: user pays friend, or vice versa
      setPayerId(selfId);
      if (friends.length > 0) {
        const f0 = friends[0];
        setPayeeId(String(f0.friendUser?._id || f0.friendUser || f0._id));
      }
    }

    setAmount(defaultAmount ? String(Math.abs(defaultAmount)) : "");
    setSelectedGroupId(defaultGroup ? String(defaultGroup._id || defaultGroup) : "");
    setPaymentMethod("UPI");
    setReferenceNumber("");
    setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
    setError("");
  }, [isOpen, defaultPayer, defaultPayee, defaultAmount, defaultGroup, user, friends]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid payment amount greater than zero");
      return;
    }

    if (payerId === payeeId) {
      setError("Payer and payee cannot be the same person");
      return;
    }

    const payerPerson = peopleList.find((p) => p.id === payerId) || {
      name: "Payer",
      user: payerId !== "currentUser" ? payerId : user?._id,
      email: "",
    };

    const payeePerson = peopleList.find((p) => p.id === payeeId) || {
      name: "Payee",
      user: payeeId,
      email: "",
    };

    const payload = {
      group: selectedGroupId || null,
      payer: {
        user: payerPerson.user || null,
        name: payerPerson.name.replace(" (You)", ""),
        email: payerPerson.email,
      },
      payee: {
        user: payeePerson.user || null,
        name: payeePerson.name.replace(" (You)", ""),
        email: payeePerson.email,
      },
      amount: numAmount,
      paymentMethod,
      referenceNumber: referenceNumber.trim(),
      notes: notes.trim(),
      date,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to record settlement");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settle Up Payment">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Payer and Payee selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Who paid? (Payer)
            </label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="input-box bg-white dark:bg-gray-700 cursor-pointer"
            >
              {peopleList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Who received? (Payee)
            </label>
            <select
              value={payeeId}
              onChange={(e) => setPayeeId(e.target.value)}
              className="input-box bg-white dark:bg-gray-700 cursor-pointer"
            >
              {peopleList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="field-label mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <LuHandCoins className="text-purple-600" />
              Settlement Amount (₹) *
            </span>
            {defaultAmount > 0 && (
              <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                Suggested: {formatCurrency(defaultAmount)}
              </span>
            )}
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">
              ₹
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-box pl-9 font-bold text-xl text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Quick preset buttons */}
          {defaultAmount > 0 && (
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmount(String(defaultAmount))}
                className="text-xs font-semibold px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 transition-colors"
              >
                Full: {formatCurrency(defaultAmount)}
              </button>
              <button
                type="button"
                onClick={() => setAmount(String(Math.round(defaultAmount / 2 * 100) / 100))}
                className="text-xs font-semibold px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Half: {formatCurrency(defaultAmount / 2)}
              </button>
            </div>
          )}
        </div>

        {/* Payment Method & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <LuCreditCard className="text-purple-600" />
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input-box !mt-0 !mb-0 cursor-pointer h-11"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.icon} {pm.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <LuCalendar className="text-purple-600" />
              Payment Date
            </label>
            <ModernDatePicker
              label={null}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Group Context (Optional) */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
            Associated Group (Optional)
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="input-box cursor-pointer"
          >
            <option value="">Direct Friend Settlement (No Group)</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.icon} {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reference Number & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
              Reference / UPI Trans ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UPI-12345678"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="input-box"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
              <LuFileText className="text-purple-600" />
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Paid via PhonePe"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-box"
            />
          </div>
        </div>

        {/* Actions */}
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
            {loading ? "Recording..." : "Record Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SettleUpModal;


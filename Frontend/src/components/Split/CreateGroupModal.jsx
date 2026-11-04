import { useState, useEffect } from "react";
import { LuUsers, LuPlus, LuX, LuCheck } from "react-icons/lu";
import Modal from "../layouts/Modal";
import { GROUP_CATEGORIES } from "../../utils/splitHelper";
import {  } from "../../utils/helper";

const CreateGroupModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  friends = [],
  loading = false,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Trip");
  const [icon, setIcon] = useState("✈️");
  const [simplifyDebts, setSimplifyDebts] = useState(true);

  // Selected friends
  const [selectedFriendIds, setSelectedFriendIds] = useState(new Set());

  // Additional members added by email/name
  const [customMembers, setCustomMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setCategory(initialData.category || "Trip");
      setIcon(initialData.icon || "✈️");
      setSimplifyDebts(
        initialData.simplifyDebts !== undefined ? initialData.simplifyDebts : true,
      );
      setSelectedFriendIds(new Set());
      setCustomMembers([]);
    } else {
      setName("");
      setDescription("");
      setCategory("Trip");
      setIcon("✈️");
      setSimplifyDebts(true);
      setSelectedFriendIds(new Set());
      setCustomMembers([]);
      setNewMemberName("");
      setNewMemberEmail("");
      setError("");
    }
  }, [isOpen, initialData]);

  const handleCategoryChange = (catId) => {
    setCategory(catId);
    const found = GROUP_CATEGORIES.find((c) => c.id === catId);
    if (found) setIcon(found.icon);
  };

  const toggleFriend = (id) => {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustomMember = () => {
    if (!newMemberName.trim() && !newMemberEmail.trim()) return;
    setCustomMembers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newMemberName.trim() || newMemberEmail.split("@")[0],
        email: newMemberEmail.trim().toLowerCase(),
      },
    ]);
    setNewMemberName("");
    setNewMemberEmail("");
  };

  const removeCustomMember = (id) => {
    setCustomMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter a group name");
      return;
    }

    // Build members array
    const membersList = [];

    // Selected friends
    friends.forEach((fr) => {
      const fId = String(fr.friendUser?._id || fr.friendUser || fr._id);
      if (selectedFriendIds.has(fId)) {
        membersList.push({
          user: fr.friendUser?._id || fr.friendUser || null,
          name: fr.name,
          email: fr.email || "",
        });
      }
    });

    // Custom members
    customMembers.forEach((cm) => {
      membersList.push({
        name: cm.name,
        email: cm.email,
      });
    });

    const payload = {
      name: name.trim(),
      description: description.trim(),
      category,
      icon,
      simplifyDebts,
      members: membersList,
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to create group");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Group" : "Create New Group"}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Group Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label mb-1.5 flex items-center gap-1.5">
              <LuUsers className="text-purple-600" />
              Group Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Goa Trip 2026, Flat 402, Team Lunch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-box"
              required
            />
          </div>

          <div>
            <label className="field-label mb-1.5 block">Category</label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="input-box cursor-pointer"
            >
              {GROUP_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="field-label mb-1.5 block">Description (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Shared expenses for hotel, travel, and food"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-box"
          />
        </div>

        {/* Simplify Debts Toggle */}
        <div className="p-4 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/60 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>⚡ Simplify Group Debts</span>
              <span className="badge badge-purple text-[10px]">Recommended</span>
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Automatically minimizes the total number of payments between members
              using Splitwise graph debt simplification.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSimplifyDebts(!simplifyDebts)}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 shrink-0 ${
              simplifyDebts ? "bg-purple-600 justify-end" : "bg-gray-300 dark:bg-gray-600 justify-start"
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md" />
          </button>
        </div>

        {/* Add Members from Friends */}
        {!initialData && (
          <div className="space-y-3">
            <label className="field-label block">
              Add Members from Friends ({selectedFriendIds.size} selected)
            </label>
            {friends.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                You haven&apos;t added any friends yet. You can still invite members by email below!
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                {friends.map((fr) => {
                  const fId = String(fr.friendUser?._id || fr.friendUser || fr._id);
                  const isSelected = selectedFriendIds.has(fId);
                  return (
                    <button
                      key={fId}
                      type="button"
                      onClick={() => toggleFriend(fId)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-300"
                      }`}
                    >
                      {isSelected ? <LuCheck className="text-xs" /> : <LuPlus className="text-xs" />}
                      <span>{fr.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Invite extra member */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">
                Or invite other members by name/email:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="input-box my-0 flex-1 text-xs py-2"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="input-box my-0 flex-1 text-xs py-2"
                />
                <button
                  type="button"
                  onClick={addCustomMember}
                  className="add-btn"
                >
                  <LuPlus className="text-sm" /> Add
                </button>
              </div>

              {customMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {customMembers.map((cm) => (
                    <span
                      key={cm.id}
                      className="badge badge-purple text-xs py-1 px-2.5 flex items-center gap-1"
                    >
                      {cm.name} {cm.email ? `(${cm.email})` : ""}
                      <button
                        type="button"
                        onClick={() => removeCustomMember(cm.id)}
                        className="hover:text-red-500 transition-colors ml-1"
                      >
                        <LuX className="text-xs" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
            {loading ? "Saving..." : initialData ? "Save Changes" : "Create Group"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateGroupModal;

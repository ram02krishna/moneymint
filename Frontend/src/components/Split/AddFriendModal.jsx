import { useState, useEffect } from "react";
import { LuUserPlus, LuSearch, LuMail, LuPhone, LuUser } from "react-icons/lu";
import Modal from "../layouts/Modal";
import CharAvatar from "../Cards/CharAvatar";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";

const AddFriendModal = ({ isOpen, onClose, onSubmit, loading = false }) => {
  const [tab, setTab] = useState("search"); // "search" or "manual"
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Manual inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setName("");
      setEmail("");
      setPhone("");
      setError("");
    }
  }, [isOpen]);

  // Live user search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    let active = true;
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(
          API_PATHS.SPLIT.FRIENDS.SEARCH_USERS(searchQuery.trim()),
        );
        if (active) {
          setSearchResults(res.data?.data?.users || []);
        }
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const handleAddRegisteredUser = async (user) => {
    try {
      await onSubmit({
        friendUserId: user._id,
        name: user.fullName,
        email: user.email,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to add friend");
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() && !email.trim()) {
      setError("Please enter a friend name or email address");
      return;
    }

    try {
      await onSubmit({
        name: name.trim() || email.split("@")[0],
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to add friend");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Friend">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Mode Tabs */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            type="button"
            onClick={() => setTab("search")}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all cursor-pointer ${
              tab === "search"
                ? "bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            Find Registered User
          </button>
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all cursor-pointer ${
              tab === "manual"
                ? "bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            Add by Email / Name
          </button>
        </div>

        {tab === "search" ? (
          <div className="space-y-3">
            <div className="relative">
              <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base" />
              <input
                type="text"
                placeholder="Search by name or email (e.g. John, ram@...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-box pl-10 my-0"
                autoFocus
              />
            </div>

            {searching && (
              <p className="text-xs text-gray-400 text-center py-4">Searching users...</p>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((u) => (
                  <div
                    key={u._id}
                    className="p-3 bg-gray-50 dark:bg-gray-700/60 rounded-xl flex items-center justify-between gap-3 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {u.profileImageUrl ? (
                        <img
                          src={u.profileImageUrl}
                          alt={u.fullName}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <CharAvatar
                          fullName={u.fullName}
                          width="w-9"
                          height="h-9"
                          style="text-xs"
                        />
                      )}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {u.fullName}
                        </h4>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddRegisteredUser(u)}
                      disabled={loading}
                      className="add-btn"
                    >
                      <LuUserPlus className="text-sm" /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No registered users found matching &quot;{searchQuery}&quot;
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setName(searchQuery.includes("@") ? "" : searchQuery);
                    setEmail(searchQuery.includes("@") ? searchQuery : "");
                    setTab("manual");
                  }}
                  className="mt-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Invite &quot;{searchQuery}&quot; directly instead →
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="field-label mb-1.5 flex items-center gap-1.5">
                <LuUser className="text-purple-600" />
                Friend Name *
              </label>
              <input
                type="text"
                placeholder="e.g. John Doe, Sarah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-box"
                required
              />
            </div>

            <div>
              <label className="field-label mb-1.5 flex items-center gap-1.5">
                <LuMail className="text-purple-600" />
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-box"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                If your friend later signs up with this email, their expenses will sync
                automatically!
              </p>
            </div>

            <div>
              <label className="field-label mb-1.5 flex items-center gap-1.5">
                <LuPhone className="text-purple-600" />
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-box"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary w-auto"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Friend"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default AddFriendModal;

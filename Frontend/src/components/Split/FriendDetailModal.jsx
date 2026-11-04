import { formatCurrency, emojiFor } from "../../utils/helper";
import { useState, useEffect } from "react";
import { LuHandCoins, LuReceipt, LuTrash2 } from "react-icons/lu";
import Modal from "../layouts/Modal";
import CharAvatar from "../Cards/CharAvatar";
import EmptyState from "../ui/EmptyState";
import LoadingSpinner from "../LoadingSpinner";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { useConfirm } from "../../hooks/useConfirm";

const FriendDetailModal = ({
  isOpen,
  onClose,
  friend,
  onSettleUp,
  onDeleteFriend,
}) => {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [friendData, setFriendData] = useState(null);
  const [activeTab, setActiveTab] = useState("expenses"); // "expenses" or "settlements"

  useEffect(() => {
    if (!isOpen || !friend) return;

    let active = true;
    setLoading(true);

    const fetchFriendDetails = async () => {
      try {
        const res = await axiosInstance.get(
          API_PATHS.SPLIT.FRIENDS.GET_ONE(friend._id),
        );
        if (active) {
          setFriendData(res.data?.data);
        }
      } catch (err) {
        console.error("Error loading friend detail:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchFriendDetails();
    return () => {
      active = false;
    };
  }, [isOpen, friend]);

  if (!friend) return null;

  const currentFriend = friendData?.friend || friend;
  const balance = currentFriend?.balance || 0;
  const expenses = friendData?.expenses || [];
  const settlements = friendData?.settlements || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentFriend.name}
    >
      <div className="space-y-6">
        {/* Friend Profile Card */}
        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {currentFriend.friendUser?.profileImageUrl ? (
              <img
                src={currentFriend.friendUser.profileImageUrl}
                alt={currentFriend.name}
                className="w-14 h-14 rounded-full object-cover shadow-sm ring-2 ring-purple-100 dark:ring-purple-900/40"
              />
            ) : (
              <CharAvatar
                fullName={currentFriend.name}
                width="w-14"
                height="h-14"
                style="text-lg font-bold"
              />
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {currentFriend.name}
              </h3>
              {currentFriend.email && (
                <p className="text-xs text-gray-400 mt-0.5">{currentFriend.email}</p>
              )}
              {currentFriend.phone && (
                <p className="text-xs text-gray-400">{currentFriend.phone}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Net Balance
            </span>
            <div className="mt-1">
              {balance > 0 ? (
                <span className="badge badge-green text-sm font-bold px-3 py-1">
                  Owes you {formatCurrency(balance)}
                </span>
              ) : balance < 0 ? (
                <span className="badge badge-red text-sm font-bold px-3 py-1">
                  You owe {formatCurrency(Math.abs(balance))}
                </span>
              ) : (
                <span className="badge badge-purple text-sm font-bold px-3 py-1">
                  ✓ Settled up
                </span>
              )}
            </div>
            {balance !== 0 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSettleUp(currentFriend, balance);
                }}
                className="add-btn add-btn-fill mt-2.5"
              >
                <LuHandCoins className="text-sm" /> Settle Up
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab("expenses")}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "expenses"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Shared Expenses ({expenses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settlements")}
            className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === "settlements"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Settlements ({settlements.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-8">
            <LoadingSpinner text="Loading shared history..." />
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {activeTab === "expenses" ? (
              expenses.length === 0 ? (
                <EmptyState
                  icon={<LuReceipt />}
                  title="No Shared Expenses"
                  message={`No shared expenses found between you and ${currentFriend.name} yet.`}
                />
              ) : (
                expenses.map((exp) => (
                  <div
                    key={exp._id}
                    className="p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 hover:border-purple-200 dark:hover:border-purple-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-lg flex items-center justify-center shrink-0">
                        {emojiFor(exp.title)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {exp.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>
                            {new Date(exp.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span>•</span>
                          <span>{exp.category || "General"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatCurrency(exp.amount)}
                      </p>
                      <span className="text-[11px] text-gray-400">
                        Paid by {exp.paidBy?.map((p) => p.name).join(", ")}
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : settlements.length === 0 ? (
              <EmptyState
                icon={<LuHandCoins />}
                title="No Past Settlements"
                message="No settlement payments recorded between you two yet."
              />
            ) : (
              settlements.map((s) => (
                <div
                  key={s._id}
                  className="p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 text-lg flex items-center justify-center shrink-0">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {s.payer?.name} paid {s.payee?.name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(s.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        • {s.paymentMethod}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                    {formatCurrency(s.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={async () => {
              if (
                await confirm({
                  title: "Remove friend?",
                  message: `${currentFriend.name} will be removed from your friends list.`,
                  confirmLabel: "Remove",
                })
              ) {
                onDeleteFriend(currentFriend._id);
                onClose();
              }
            }}
            className="text-xs text-gray-400 hover:text-red-500 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <LuTrash2 className="text-sm" /> Remove Friend
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default FriendDetailModal;

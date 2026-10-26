import React, { useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { LuImage, LuX } from "react-icons/lu";

const EmojiPickerPopup = ({ icon, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="flex items-center justify-center p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm text-gray-700 dark:text-gray-300"
        onClick={() => setIsOpen(true)}
      >
        <div className="w-5 h-5 flex items-center justify-center mr-2">
          {icon ? (
            <img
              src={icon}
              alt="Icon"
              className="w-full h-full object-contain"
            />
          ) : (
            <LuImage className="w-full h-full text-gray-500 dark:text-gray-400" />
          )}
        </div>
        {icon ? "Change" : "Pick"} Icon
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <button
              className="absolute -top-3 -right-3 z-10 bg-white dark:bg-gray-700 text-red-500 p-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 transition-all duration-200"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <LuX className="w-4 h-4" />
            </button>

            <EmojiPicker
              open={isOpen}
              theme={
                document.documentElement.classList.contains("dark")
                  ? "dark"
                  : "light"
              }
              onEmojiClick={(emoji) => {
                onSelect(emoji?.imageUrl || "");
                setIsOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPickerPopup;

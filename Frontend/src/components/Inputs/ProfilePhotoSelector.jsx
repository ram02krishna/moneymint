import React, { useState, useRef, useEffect } from "react";
import { LuUser, LuUpload, LuTrash } from "react-icons/lu";

/**
 * ProfilePhotoSelector allows users to select, preview, and remove a profile photo.
 * @param {Object} props
 * @param {File|null} image - The current image file (if any)
 * @param {Function} setImage - Setter for the image file
 */
const ProfilePhotoSelector = ({ image, setImage, currentImage }) => {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Generate preview URL when image changes
  useEffect(() => {
    if (image) {
      const url = URL.createObjectURL(image);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (currentImage) {
      setPreviewUrl(currentImage);
    } else {
      setPreviewUrl(null);
    }
  }, [image, currentImage]);

  // Handle file input change
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImage(file);
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setImage(null);
  };

  // Trigger file input
  const onChooseFile = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        type="file"
        accept="image/*"
        ref={inputRef}
        className="hidden"
        onChange={handleImageChange}
        aria-label="Choose profile photo"
      />
      {!previewUrl ? (
        <div className="w-24 h-24 flex items-center justify-center bg-gray-100 rounded-full relative">
          <LuUser
            className="w-20 h-20 text-gray-400"
            aria-label="Default profile icon"
          />
          <button
            type="button"
            className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md hover:bg-gray-200 focus:outline-none transition-all duration-300"
            onClick={onChooseFile}
            aria-label="Upload profile photo"
          >
            <LuUpload className="w-6 h-6 text-blue-600" />
          </button>
        </div>
      ) : (
        <div className="w-24 h-24 flex flex-col items-center justify-center relative">
          <img
            src={previewUrl}
            alt="Profile preview"
            className="w-24 h-24 object-cover rounded-full border-2 border-gray-300 shadow-md"
          />
          <button
            type="button"
            className="absolute top-0 right-0 bg-white rounded-full p-2 shadow-md hover:bg-gray-200 focus:outline-none transition-all duration-300"
            onClick={image ? handleRemoveImage : onChooseFile}
            aria-label={image ? "Remove profile photo" : "Change profile photo"}
          >
            {image ? (
              <LuTrash className="w-6 h-6 text-red-600" />
            ) : (
              <LuUpload className="w-6 h-6 text-blue-600" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoSelector;

import { useState, useRef, useEffect, useMemo } from "react";
import { LuUser, LuUpload, LuTrash } from "react-icons/lu";

const MAX_BYTES = 5 * 1024 * 1024; // same limit the server enforces
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

/**
 * Pick, preview and remove a profile photo.
 * image: the chosen File (or null) · setImage: setter · currentImage: URL of an already-saved photo
 */
const ProfilePhotoSelector = ({ image, setImage, currentImage }) => {
  const inputRef = useRef(null);
  const [problem, setProblem] = useState(null);

  const objectUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  useEffect(() => () => objectUrl && URL.revokeObjectURL(objectUrl), [objectUrl]);
  const previewUrl = objectUrl || currentImage || null;

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    event.target.value = ""; // lets the same file be picked again after removing it
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) return setProblem("Please choose a JPG or PNG image.");
    if (file.size > MAX_BYTES) return setProblem("Image must be 5 MB or smaller.");

    setProblem(null);
    setImage(file);
  };

  const chooseFile = () => inputRef.current?.click();

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        type="file"
        accept="image/jpeg,image/png"
        ref={inputRef}
        className="hidden"
        onChange={handleImageChange}
        aria-label="Choose profile photo"
      />

      <div className="relative w-24 h-24">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile preview"
            className="w-24 h-24 rounded-full object-cover border-2 border-purple-200 dark:border-purple-800"
          />
        ) : (
          <div className="w-24 h-24 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-5xl">
            <LuUser aria-hidden="true" />
          </div>
        )}

        <button
          type="button"
          onClick={previewUrl && image ? () => setImage(null) : chooseFile}
          className={`absolute -bottom-1 -right-1 rounded-full p-2 shadow-md text-white cursor-pointer transition-colors ${
            previewUrl && image ? "bg-red-500 hover:bg-red-600" : "bg-purple-600 hover:bg-purple-700"
          }`}
          aria-label={previewUrl && image ? "Remove profile photo" : "Upload profile photo"}
        >
          {previewUrl && image ? <LuTrash className="w-4 h-4" /> : <LuUpload className="w-4 h-4" />}
        </button>
      </div>

      {problem && (
        <p role="alert" className="text-xs text-red-500">
          {problem}
        </p>
      )}
    </div>
  );
};

export default ProfilePhotoSelector;

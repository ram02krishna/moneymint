import React, { useState, useContext, useEffect } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { FiLock, FiUser, FiMail } from "react-icons/fi";
import { motion } from "framer-motion";
import { UserContext } from "../../context/UserContextDefinition";
import ProfilePhotoSelector from "../../components/Inputs/ProfilePhotoSelector";
import uploadImage from "../../utils/uploadImage";

let Settings = () => {
  const { user, updateUser } = useContext(UserContext);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.fullName !== fullName) setFullName(user.fullName);
      if (user.email !== email) setEmail(user.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    try {
      const response = await axiosInstance.post(
        API_PATHS.AUTH.CHANGE_PASSWORD,
        {
          currentPassword,
          newPassword,
        },
      );
      setSuccess(response.data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const requestBody = {
        fullName,
        email,
      };

      if (profilePic) {
        const imgUploadRes = await uploadImage(profilePic);
        if (imgUploadRes && imgUploadRes.imageUrl) {
          requestBody.profileImageUrl = imgUploadRes.imageUrl;
        }
      }

      const response = await axiosInstance.put(
        API_PATHS.AUTH.UPDATE_USER_INFO,
        requestBody,
      );
      updateUser(response.data.data.user);
      setProfileSuccess("Profile updated successfully!");
    } catch (err) {
      setProfileError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <DashboardLayout activeMenu="Settings">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Settings
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <FiUser className="text-purple-600 dark:text-purple-400" />{" "}
              Profile Information
            </h4>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <ProfilePhotoSelector
                image={profilePic}
                setImage={setProfilePic}
                currentImage={user?.profileImageUrl}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <FiUser className="absolute top-3.5 left-3 text-gray-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute top-3.5 left-3 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
              {profileError && (
                <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                  {profileError}
                </p>
              )}
              {profileSuccess && (
                <p className="text-green-500 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                  {profileSuccess}
                </p>
              )}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="px-6 py-2.5 font-medium text-white bg-purple-600 dark:bg-purple-600 rounded-xl transition-colors duration-200 shadow-lg shadow-purple-200 dark:shadow-none cursor-pointer"
              >
                Update Profile
              </motion.button>
            </form>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <FiLock className="text-purple-600 dark:text-purple-400" /> Change
              Password
            </h4>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-green-500 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                  {success}
                </p>
              )}

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="px-6 py-2.5 font-medium text-white bg-purple-600 dark:bg-purple-600 rounded-xl transition-colors duration-200 shadow-lg shadow-purple-200 dark:shadow-none cursor-pointer"
              >
                Change Password
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;

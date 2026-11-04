import { useState, useContext } from "react";
import { FiLock, FiUser, FiMail } from "react-icons/fi";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import ProfilePhotoSelector from "../../components/Inputs/ProfilePhotoSelector";
import { IconField, PasswordField, FormAlert } from "../../components/Inputs/IconField";
import { UserContext } from "../../context/UserContextDefinition";
import { useToast } from "../../hooks/useToast";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import uploadImage from "../../utils/uploadImage";
import { getErrorMessage, validateEmail } from "../../utils/helper";

const SectionTitle = ({ icon: Icon, children }) => (
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
    <Icon className="text-purple-600 dark:text-purple-400" aria-hidden="true" /> {children}
  </h2>
);

const Settings = () => {
  const { user, updateUser } = useContext(UserContext);
  const toast = useToast();

  // profile
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profilePic, setProfilePic] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (fullName.trim().length < 2) return setProfileError("Full name must be at least 2 characters.");
    if (!validateEmail(email)) return setProfileError("Please enter a valid email address.");

    setProfileError(null);
    setSavingProfile(true);

    try {
      const body = { fullName: fullName.trim(), email: email.trim() };
      if (profilePic) {
        const uploaded = await uploadImage(profilePic);
        if (uploaded?.imageUrl) body.profileImageUrl = uploaded.imageUrl;
      }

      const { data } = await axiosInstance.put(API_PATHS.AUTH.UPDATE_USER_INFO, body);
      updateUser(data.data.user);
      setProfilePic(null);
      toast.success("Profile updated");
    } catch (err) {
      setProfileError(getErrorMessage(err, "Couldn't update your profile. Please try again."));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return setPasswordError("Please fill in all fields.");
    if (newPassword.length < 8) return setPasswordError("New password must be at least 8 characters long.");
    if (newPassword !== confirmPassword) return setPasswordError("New password and confirmation do not match.");

    setPasswordError(null);
    setSavingPassword(true);

    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.CHANGE_PASSWORD, { currentPassword, newPassword });
      toast.success(data.message || "Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(getErrorMessage(err, "Couldn't change your password. Please try again."));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <DashboardLayout activeMenu="Settings">
      <div className="w-full max-w-[1400px] mx-auto">
        <PageHeader title="Settings" subtitle="Manage your profile and password." />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <section className="card">
            <SectionTitle icon={FiUser}>Profile Information</SectionTitle>
            <form onSubmit={handleProfileUpdate} className="space-y-5" noValidate>
              <ProfilePhotoSelector image={profilePic} setImage={setProfilePic} currentImage={user?.profileImageUrl} />
              <IconField
                label="Full Name"
                icon={FiUser}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
              />
              <IconField
                label="Email Address"
                icon={FiMail}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                autoComplete="email"
              />
              <FormAlert>{profileError}</FormAlert>
              <button type="submit" className="btn-primary sm:!w-auto" disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Update Profile"}
              </button>
            </form>
          </section>

          <section className="card">
            <SectionTitle icon={FiLock}>Change Password</SectionTitle>
            <form onSubmit={handleChangePassword} className="space-y-5" noValidate>
              <PasswordField
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <PasswordField
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat the new password"
                autoComplete="new-password"
              />
              <FormAlert>{passwordError}</FormAlert>
              <button type="submit" className="btn-primary sm:!w-auto" disabled={savingPassword}>
                {savingPassword ? "Saving..." : "Change Password"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;

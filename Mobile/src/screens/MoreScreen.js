import React, { useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Avatar, Button, Card, Header, Input, Screen, Sheet } from "../components/ui";
import client, { getErrorMessage } from "../api/client";
import { API_PATHS } from "../api/paths";
import { API_URL } from "../config";

const Row = ({ icon, label, hint, onPress, right, danger }) => {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? colors.danger : colors.text, fontSize: 15, fontWeight: "700" }}>{label}</Text>
        {hint ? <Text style={{ color: colors.sub, fontSize: 12, marginTop: 1 }}>{hint}</Text> : null}
      </View>
      {right !== undefined ? right : onPress ? <Ionicons name="chevron-forward" size={18} color={colors.sub} /> : null}
    </Pressable>
  );
};

const Divider = () => {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 52 }} />;
};

export default function MoreScreen({ navigation }) {
  const { colors, isDark, toggle } = useTheme();
  const { user, setUser, logout } = useAuth();
  const toast = useToast();

  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState({ fullName: "", email: "" });
  const [passOpen, setPassOpen] = useState(false);
  const [pass, setPass] = useState({ currentPassword: "", newPassword: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const updateProfile = (extra = {}) =>
    client.put(API_PATHS.AUTH.UPDATE_USER_INFO, { fullName: user.fullName, email: user.email, ...extra });

  const saveProfile = async () => {
    const e = {};
    if (profile.fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) e.email = "Enter a valid email";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const res = await client.put(API_PATHS.AUTH.UPDATE_USER_INFO, {
        fullName: profile.fullName.trim(),
        email: profile.email.trim(),
        ...(user.profileImageUrl ? { profileImageUrl: user.profileImageUrl } : {}),
      });
      setUser(res.data.data.user);
      toast.success("Profile updated");
      setProfileOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update profile"));
    } finally {
      setSaving(false);
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", { uri: asset.uri, name: asset.fileName || "profile.jpg", type: asset.mimeType === "image/png" ? "image/png" : "image/jpeg" });
      const up = await client.post(API_PATHS.IMAGE.UPLOAD, form, { headers: { "Content-Type": "multipart/form-data" } });
      const res = await updateProfile({ profileImageUrl: up.data.data.imageUrl });
      setUser(res.data.data.user);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not upload photo"));
    } finally {
      setUploading(false);
    }
  };

  const changePassword = async () => {
    const e = {};
    if (!pass.currentPassword) e.currentPassword = "Enter your current password";
    if (pass.newPassword.length < 8) e.newPassword = "At least 8 characters";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await client.post(API_PATHS.AUTH.CHANGE_PASSWORD, pass);
      toast.success("Password changed");
      setPass({ currentPassword: "", newPassword: "" });
      setPassOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not change password"));
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert("Log out?", "You'll need to log in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);

  const go = (filter) => navigation.navigate("Transactions", { filter, stamp: Date.now() });

  return (
    <Screen>
      <Header title="More" />
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <Pressable onPress={pickPhoto} disabled={uploading}>
          <Avatar user={user} size={62} />
          <View style={{ position: "absolute", right: -4, bottom: -4, backgroundColor: colors.primary, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.card }}>
            <Ionicons name={uploading ? "hourglass-outline" : "camera"} size={12} color="#fff" />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }} numberOfLines={1}>{user?.fullName}</Text>
          <Text style={{ color: colors.sub, marginTop: 2 }} numberOfLines={1}>{user?.email}</Text>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: 4 }}>Tap photo to change</Text>
        </View>
      </Card>

      <Text style={{ color: colors.sub, fontWeight: "700", fontSize: 12, marginBottom: 6, marginLeft: 4 }}>MONEY</Text>
      <Card style={{ paddingVertical: 2, marginBottom: 16 }}>
        <Row icon="arrow-down-circle-outline" label="Income" hint="All income, search and export" onPress={() => go("income")} />
        <Divider />
        <Row icon="arrow-up-circle-outline" label="Expenses" hint="All expenses, search and export" onPress={() => go("expense")} />
        <Divider />
        <Row icon="trophy-outline" label="Savings goals" hint="Track what you're saving for" onPress={() => navigation.navigate("Goals")} />
        <Divider />
        <Row icon="people-outline" label="Split expenses" hint="Groups, shared bills and settlements" onPress={() => navigation.navigate("Splits")} />
      </Card>

      <Text style={{ color: colors.sub, fontWeight: "700", fontSize: 12, marginBottom: 6, marginLeft: 4 }}>ACCOUNT</Text>
      <Card style={{ paddingVertical: 2 }}>
        <Row icon="person-outline" label="Edit profile" onPress={() => { setProfile({ fullName: user?.fullName || "", email: user?.email || "" }); setErrors({}); setProfileOpen(true); }} />
        <Divider />
        <Row icon="lock-closed-outline" label="Change password" onPress={() => { setErrors({}); setPassOpen(true); }} />
        <Divider />
        <Row icon="moon-outline" label="Dark mode" right={<Switch value={isDark} onValueChange={toggle} trackColor={{ true: colors.primary }} />} />
      </Card>

      <Button title="Log out" variant="danger" icon="log-out-outline" onPress={confirmLogout} style={{ marginTop: 18 }} />
      <Text style={{ color: colors.sub, fontSize: 11, textAlign: "center", marginTop: 22 }}>MoneyMint Mobile v1.1.0{"\n"}Connected to {API_URL}</Text>

      <Sheet visible={profileOpen} onClose={() => setProfileOpen(false)} title="Edit profile">
        <Input label="Full name" value={profile.fullName} onChangeText={(v) => setProfile((p) => ({ ...p, fullName: v }))} error={errors.fullName} />
        <Input label="Email" value={profile.email} onChangeText={(v) => setProfile((p) => ({ ...p, email: v }))} autoCapitalize="none" keyboardType="email-address" error={errors.email} />
        <Button title="Save changes" onPress={saveProfile} loading={saving} />
      </Sheet>

      <Sheet visible={passOpen} onClose={() => setPassOpen(false)} title="Change password">
        <Input label="Current password" value={pass.currentPassword} onChangeText={(v) => setPass((p) => ({ ...p, currentPassword: v }))} secure error={errors.currentPassword} />
        <Input label="New password" value={pass.newPassword} onChangeText={(v) => setPass((p) => ({ ...p, newPassword: v }))} secure error={errors.newPassword} />
        <Button title="Update password" onPress={changePassword} loading={saving} />
      </Sheet>
    </Screen>
  );
}

import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { Button, Input } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import client, { getErrorMessage } from "../api/client";
import { API_PATHS } from "../api/paths";

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const AuthLayout = ({ title, subtitle, children, footer }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900" }}>M</Text>
          </View>
          <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>
            <Text style={{ color: colors.primary }}>Money</Text>Mint
          </Text>
        </View>
        <Text style={{ fontSize: 28, fontWeight: "800", color: colors.text }}>{title}</Text>
        <Text style={{ color: colors.sub, marginTop: 6, marginBottom: 28, lineHeight: 20 }}>{subtitle}</Text>
        {children}
        <View style={{ marginTop: "auto", paddingTop: 24, alignItems: "center" }}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const LinkText = ({ lead, link, onPress }) => {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ color: colors.sub }}>
        {lead} <Text style={{ color: colors.primary, fontWeight: "700" }}>{link}</Text>
      </Text>
    </Pressable>
  );
};

export const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = {};
    if (!emailOk(email.trim())) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      toast.error(getErrorMessage(error, "Login failed"));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back 👋"
      subtitle="Log in to track your income, expenses, budgets and goals."
      footer={<LinkText lead="New to MoneyMint?" link="Create account" onPress={() => navigation.navigate("SignUp")} />}
    >
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" error={errors.email} />
      <Input label="Password" value={password} onChangeText={setPassword} secure placeholder="••••••••" error={errors.password} />
      <Pressable onPress={() => navigation.navigate("ForgotPassword")} style={{ alignSelf: "flex-end", marginBottom: 20, marginTop: -4 }}>
        <Text style={{ color: "#7c3aed", fontWeight: "600" }}>Forgot password?</Text>
      </Pressable>
      <Button title="Log in" onPress={submit} loading={loading} />
    </AuthLayout>
  );
};

export const SignUpScreen = ({ navigation }) => {
  const { register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (!emailOk(form.email.trim())) e.email = "Enter a valid email";
    if (form.password.length < 8) e.password = "At least 8 characters";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await register({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password });
    } catch (error) {
      toast.error(getErrorMessage(error, "Sign up failed"));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your money in under a minute."
      footer={<LinkText lead="Already have an account?" link="Log in" onPress={() => navigation.navigate("Login")} />}
    >
      <Input label="Full name" value={form.fullName} onChangeText={(v) => set("fullName", v)} placeholder="Ram Krishna" error={errors.fullName} />
      <Input label="Email" value={form.email} onChangeText={(v) => set("email", v)} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" error={errors.email} />
      <Input label="Password" value={form.password} onChangeText={(v) => set("password", v)} secure placeholder="Min. 8 characters" error={errors.password} />
      <Button title="Sign up" onPress={submit} loading={loading} />
    </AuthLayout>
  );
};

// two steps: request OTP by email -> enter OTP + new password
export const ForgotPasswordScreen = ({ navigation }) => {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const sendOtp = async () => {
    if (!emailOk(email.trim())) return setErrors({ email: "Enter a valid email" });
    setErrors({});
    setLoading(true);
    try {
      await client.post(API_PATHS.AUTH.FORGOT_PASSWORD, { email: email.trim() });
      toast.success("OTP sent to your email");
      setStep(2);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not send OTP"));
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    const e = {};
    if (otp.trim().length !== 6) e.otp = "Enter the 6-digit OTP";
    if (password.length < 8) e.password = "At least 8 characters";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await client.post(API_PATHS.AUTH.RESET_PASSWORD, { email: email.trim(), otp: otp.trim(), password });
      toast.success("Password reset. Please log in.");
      navigation.navigate("Login");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not reset password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === 1 ? "Forgot password?" : "Reset password"}
      subtitle={step === 1 ? "Enter your email and we'll send you a 6-digit OTP." : `We sent an OTP to ${email.trim()}. It expires in 10 minutes.`}
      footer={<LinkText lead="Remembered it?" link="Back to login" onPress={() => navigation.navigate("Login")} />}
    >
      {step === 1 ? (
        <>
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={errors.email} />
          <Button title="Send OTP" onPress={sendOtp} loading={loading} />
        </>
      ) : (
        <>
          <Input label="OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholder="123456" error={errors.otp} />
          <Input label="New password" value={password} onChangeText={setPassword} secure error={errors.password} />
          <Button title="Reset password" onPress={reset} loading={loading} />
        </>
      )}
    </AuthLayout>
  );
};

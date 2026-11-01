import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme";
import { Button, Input } from "../components/ui";
import GoogleSignInButton from "../components/GoogleSignInButton";
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
          <Image
            source={require("../../assets/favicon.png")}
            style={{ width: 42, height: 42 }}
            accessibilityLabel="MoneyMint logo"
          />
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

const OrDivider = () => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text style={{ marginHorizontal: 12, color: colors.sub, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 }}>OR</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
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
      <OrDivider />
      <GoogleSignInButton title="Sign in with Google" disabled={loading} />
    </AuthLayout>
  );
};

export const SignUpScreen = ({ navigation }) => {
  const { register, sendSignupOtp, resendSignupOtp } = useAuth();
  const toast = useToast();
  const { colors } = useTheme();
  const [step, setStep] = useState(1); // 1 = form, 2 = otp
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (step === 2 && timeLeft === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const requestOtp = async () => {
    const e = {};
    if (form.fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (!emailOk(form.email.trim())) e.email = "Enter a valid email";
    if (form.password.length < 8) e.password = "At least 8 characters";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await sendSignupOtp({ email: form.email.trim(), fullName: form.fullName.trim() });
      toast.success("Verification code sent to your email");
      setStep(2);
      setTimeLeft(45);
      setCanResend(false);
      setOtp("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Sign up failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || resending || loading) return;
    setResending(true);
    try {
      await resendSignupOtp({ email: form.email.trim(), fullName: form.fullName.trim() });
      toast.success("New 6-digit code sent to your email");
      setTimeLeft(45);
      setCanResend(false);
      setOtp("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not resend OTP"));
    } finally {
      setResending(false);
    }
  };

  const verifyAndCreate = async () => {
    if (otp.trim().length !== 6) {
      setErrors({ otp: "Enter the complete 6-digit code" });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        otp: otp.trim(),
      });
      toast.success("Account created successfully!");
    } catch (error) {
      toast.error(getErrorMessage(error, "Verification failed"));
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <AuthLayout
        title="Verify email"
        subtitle={`Enter the 6-digit verification code sent to ${form.email.trim()}`}
        footer={<LinkText lead="Need to edit details?" link="Back to form" onPress={() => setStep(1)} />}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 12,
            backgroundColor: timeLeft > 0 ? colors.card : colors.dangerSoft,
            borderWidth: 1,
            borderColor: timeLeft > 0 ? colors.border : colors.danger,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 13, color: timeLeft > 0 ? colors.primary : colors.danger, fontWeight: "600" }}>
            {timeLeft > 0 ? `Code expires in 00:${timeLeft < 10 ? `0${timeLeft}` : timeLeft}` : "OTP expired. Click Resend OTP below."}
          </Text>
        </View>

        <Input
          label="6-Digit Verification Code"
          value={otp}
          onChangeText={(v) => {
            setOtp(v.replace(/\D/g, "").slice(0, 6));
            if (errors.otp) setErrors({});
          }}
          keyboardType="number-pad"
          placeholder="••••••"
          maxLength={6}
          error={errors.otp}
        />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, marginTop: -4 }}>
          <Text style={{ fontSize: 13, color: colors.sub }}>Didn't get code?</Text>
          <Pressable onPress={handleResendOtp} disabled={!canResend || resending || loading} hitSlop={8}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: canResend && !resending && !loading ? colors.primary : colors.sub,
              }}
            >
              {resending ? "Sending..." : canResend ? "Resend OTP" : `Resend in ${timeLeft}s`}
            </Text>
          </Pressable>
        </View>

        <Button title="Verify & Create Account" onPress={verifyAndCreate} loading={loading} disabled={otp.length !== 6} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your money in under a minute."
      footer={<LinkText lead="Already have an account?" link="Log in" onPress={() => navigation.navigate("Login")} />}
    >
      <Input label="Full name" value={form.fullName} onChangeText={(v) => set("fullName", v)} placeholder="Ram Krishna" error={errors.fullName} />
      <Input label="Email" value={form.email} onChangeText={(v) => set("email", v)} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" error={errors.email} />
      <Input label="Password" value={form.password} onChangeText={(v) => set("password", v)} secure placeholder="Min. 8 characters" error={errors.password} />
      <Button title="Continue" onPress={requestOtp} loading={loading} />
      <OrDivider />
      <GoogleSignInButton title="Sign up with Google" disabled={loading} />
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

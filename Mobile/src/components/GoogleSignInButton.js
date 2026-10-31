import React, { useEffect, useState } from "react";
import { ActivityIndicator, NativeModules, Pressable, StyleSheet, Text, TurboModuleRegistry, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { GOOGLE_WEB_CLIENT_ID } from "../config";
import { getErrorMessage } from "../api/client";

// Safely obtain native GoogleSignin module if registered in the binary (standalone APK / custom dev client).
// Avoids fatal "RNGoogleSignin could not be found" crash when running inside Expo Go.
const getNativeGoogleSignin = () => {
  try {
    const hasNative =
      TurboModuleRegistry?.get?.("RNGoogleSignin") ||
      NativeModules?.RNGoogleSignin;
    if (!hasNative) return null;
    return require("@react-native-google-signin/google-signin");
  } catch {
    return null;
  }
};

export const GoogleLogo = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.06c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.9H1.39v3.06C3.39 21.35 7.42 24 12 24Z"
    />
    <Path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.65H1.39C.5 8.42 0 10.4 0 12.5s.5 4.08 1.39 5.85l3.88-3.06Z"
    />
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.42 0 3.39 2.65 1.39 6.65l3.88 3.06c.95-2.8 3.6-4.96 6.73-4.96Z"
    />
  </Svg>
);

export default function GoogleSignInButton({ title = "Continue with Google", disabled, style }) {
  const { colors } = useTheme();
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const mod = getNativeGoogleSignin();
    if (mod?.GoogleSignin) {
      try {
        mod.GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: false,
        });
      } catch (e) {
        console.warn("GoogleSignin.configure error:", e);
      }
    }
  }, []);

  const handlePress = async () => {
    if (loading || disabled) return;

    const mod = getNativeGoogleSignin();
    if (!mod?.GoogleSignin) {
      toast.info(
        "Google Sign-In uses native Google Play Services, which is available in your standalone MoneyMint APK. In Expo Go, please sign in with your email & password."
      );
      return;
    }

    const { GoogleSignin, statusCodes } = mod;
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response?.data?.idToken || response?.idToken;

      if (!idToken) {
        throw new Error("Unable to obtain Google ID token. Please try again.");
      }

      await loginWithGoogle(idToken);
      toast.success("Signed in with Google successfully!");
    } catch (error) {
      if (error?.code === statusCodes?.SIGN_IN_CANCELLED) {
        // user dismissed dialog
      } else if (error?.code === statusCodes?.IN_PROGRESS) {
        // already in progress
      } else if (error?.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        toast.error("Google Play Services is not available on this device.");
      } else {
        toast.error(getErrorMessage(error, "Google sign-in failed. Please try again."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <View style={styles.content}>
          <GoogleLogo size={20} />
          <Text style={[styles.text, { color: colors.text }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: {
    fontSize: 15,
    fontWeight: "700",
  },
});

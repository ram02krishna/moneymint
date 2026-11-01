import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";

const ToastContext = createContext({ success() {}, error() {}, info() {} });

export const ToastProvider = ({ children }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const show = useCallback(
    (type, message) => {
      clearTimeout(timer.current);
      setToast({ type, message });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
          setToast(null),
        );
      }, 3200);
    },
    [opacity],
  );

  const api = useMemo(
    () => ({
      success: (m) => show("success", m),
      error: (m) => show("error", m),
      info: (m) => show("info", m),
    }),
    [show],
  );

  const tone = {
    success: { icon: "checkmark-circle", color: colors.success },
    error: { icon: "alert-circle", color: colors.danger },
    info: { icon: "information-circle", color: colors.primary },
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: insets.bottom + 90,
            opacity,
            transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: colors.card,
              borderColor: tone[toast.type].color,
              borderWidth: 1,
              borderRadius: 14,
              padding: 14,
              elevation: 8,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 10,
            }}
          >
            <Ionicons name={tone[toast.type].icon} size={22} color={tone[toast.type].color} />
            <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

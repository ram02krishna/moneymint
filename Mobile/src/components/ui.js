import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { parseDateString, toDateString, shortDate, monthLabel } from "../utils/format";

// ---------- layout ----------
export const Screen = ({ children, refreshing, onRefresh, scroll = true, bottomPad = 24, style }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const base = { flex: 1, backgroundColor: colors.bg, paddingTop: insets.top };
  if (!scroll) return <View style={[base, style]}>{children}</View>;
  return (
    <View style={base}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[{ padding: 16, paddingBottom: bottomPad }, style]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
};

export const Header = ({ title, subtitle, right, onBack }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={{ marginRight: 10, marginBottom: 2, padding: 6, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.text }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 13, color: colors.sub, marginTop: 4 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
};

export const Card = ({ children, style, onPress }) => {
  const { colors } = useTheme();
  const base = {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  };
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  return <View style={[base, style]}>{children}</View>;
};

export const SectionTitle = ({ title, action, onAction }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 8 }}>
      <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export const Loading = ({ text }) => {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 60, alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {text ? <Text style={{ color: colors.sub, marginTop: 12 }}>{text}</Text> : null}
    </View>
  );
};

export const EmptyState = ({ emoji = "📭", title, message, actionLabel, onAction }) => {
  const { colors } = useTheme();
  return (
    <Card style={{ alignItems: "center", paddingVertical: 36 }}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 10 }}>{title}</Text>
      <Text style={{ color: colors.sub, textAlign: "center", marginTop: 6, lineHeight: 20 }}>{message}</Text>
      {actionLabel ? (
        <View style={{ marginTop: 18 }}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
};

// ---------- controls ----------
export const Button = ({ title, onPress, loading, variant = "primary", icon, disabled, style }) => {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: "#fff", border: colors.primary },
    ghost: { bg: "transparent", fg: colors.text, border: colors.border },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: "transparent" },
    soft: { bg: colors.primarySoft, fg: colors.primary, border: "transparent" },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingVertical: 13,
          paddingHorizontal: 20,
          borderRadius: 14,
          borderWidth: 1,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled || loading ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontWeight: "700", fontSize: 15 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
};

export const Input = ({ label, error, secure, style, ...props }) => {
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13, marginBottom: 6 }}>{label}</Text> : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.inputBg,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          borderRadius: 14,
          paddingHorizontal: 14,
        }}
      >
        <TextInput
          {...props}
          secureTextEntry={hidden}
          placeholderTextColor={colors.sub}
          style={[{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 12 }, style]}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.sub} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 5 }}>{error}</Text> : null}
    </View>
  );
};

export const Chip = ({ label, selected, onPress }) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : "transparent",
      }}
    >
      <Text style={{ color: selected ? colors.primary : colors.sub, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
};

export const ChipRow = ({ children }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>{children}</View>
);

export const Segmented = ({ options, value, onChange }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", backgroundColor: colors.track, borderRadius: 14, padding: 4, marginBottom: 16 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 10,
              borderRadius: 11,
              backgroundColor: active ? colors.card : "transparent",
            }}
          >
            <Text style={{ fontWeight: "700", color: active ? o.color || colors.primary : colors.sub }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export const Badge = ({ label, tone = "gray" }) => {
  const { colors } = useTheme();
  const map = {
    green: [colors.successSoft, colors.success],
    red: [colors.dangerSoft, colors.danger],
    amber: [colors.warnSoft, colors.warn],
    purple: [colors.primarySoft, colors.primary],
    gray: [colors.track, colors.sub],
  }[tone];
  return (
    <View style={{ backgroundColor: map[0], paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color: map[1], fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
};

export const ProgressBar = ({ percent = 0, color }) => {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <View style={{ height: 9, borderRadius: 99, backgroundColor: colors.track, overflow: "hidden" }}>
      <View style={{ width: `${pct}%`, height: "100%", borderRadius: 99, backgroundColor: color || colors.primary }} />
    </View>
  );
};

export const IconButton = ({ name, onPress, color, size = 20 }) => {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ padding: 8 }}>
      <Ionicons name={name} size={size} color={color || colors.sub} />
    </Pressable>
  );
};

export const Fab = ({ onPress, icon = "add" }) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: "absolute",
        right: 20,
        bottom: 20,
        width: 58,
        height: 58,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        elevation: 8,
        shadowColor: colors.primary,
        shadowOpacity: 0.4,
        shadowRadius: 10,
      }}
    >
      <Ionicons name={icon} size={28} color="#fff" />
    </Pressable>
  );
};

// ---------- date ----------
export const DateField = ({ label, value, onChange, error, minimumDate }) => {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13, marginBottom: 6 }}>{label}</Text> : null}
      <Pressable
        onPress={() => setShow(true)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.inputBg,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 13,
        }}
      >
        <Text style={{ color: value ? colors.text : colors.sub, fontSize: 15 }}>{value ? shortDate(parseDateString(value)) : "Select date"}</Text>
        <Ionicons name="calendar-outline" size={20} color={colors.sub} />
      </Pressable>
      {error ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 5 }}>{error}</Text> : null}
      {show && (
        <DateTimePicker
          value={parseDateString(value)}
          mode="date"
          minimumDate={minimumDate}
          onChange={(event, date) => {
            setShow(false);
            if (event.type === "set" && date) onChange(toDateString(date));
          }}
        />
      )}
    </View>
  );
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Tap the month name to open a picker: tap a month to select it (one tap),
// tap the year to jump to any year. Arrows still move one month at a time.
export const MonthSwitcher = ({ month, onChange }) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(month.getFullYear());
  const [yearMode, setYearMode] = useState(false);
  const shift = (n) => onChange(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const now = new Date();

  const openPicker = () => {
    setYear(month.getFullYear());
    setYearMode(false);
    setOpen(true);
  };
  const pick = (m) => {
    onChange(new Date(year, m, 1));
    setOpen(false);
  };
  const years = Array.from({ length: 16 }, (_, i) => now.getFullYear() - 10 + i);

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 16,
          paddingVertical: 6,
          paddingHorizontal: 6,
          marginBottom: 16,
        }}
      >
        <IconButton name="chevron-back" onPress={() => shift(-1)} color={colors.text} />
        <Pressable onPress={openPicker} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10 }}>
          <Ionicons name="calendar-outline" size={17} color={colors.primary} />
          <Text style={{ fontWeight: "700", color: colors.text, fontSize: 15 }}>{monthLabel(month)}</Text>
          <Ionicons name="caret-down" size={12} color={colors.sub} />
        </Pressable>
        <IconButton name="chevron-forward" onPress={() => shift(1)} color={colors.text} />
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Select month">
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <IconButton name="chevron-back" onPress={() => setYear((y) => y - 1)} color={colors.text} />
          <Pressable
            onPress={() => setYearMode((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.primarySoft }}
          >
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.primary }}>{year}</Text>
            <Ionicons name={yearMode ? "caret-up" : "caret-down"} size={13} color={colors.primary} />
          </Pressable>
          <IconButton name="chevron-forward" onPress={() => setYear((y) => y + 1)} color={colors.text} />
        </View>

        {yearMode ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {years.map((y) => (
              <Pressable
                key={y}
                onPress={() => { setYear(y); setYearMode(false); }}
                style={{ width: "22%", flexGrow: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: y === year ? colors.primary : colors.border, backgroundColor: y === year ? colors.primarySoft : "transparent" }}
              >
                <Text style={{ fontWeight: "700", color: y === year ? colors.primary : colors.text }}>{y}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {MONTHS.map((name, i) => {
              const selected = year === month.getFullYear() && i === month.getMonth();
              const isNow = year === now.getFullYear() && i === now.getMonth();
              return (
                <Pressable
                  key={name}
                  onPress={() => pick(i)}
                  style={{
                    width: "30%",
                    flexGrow: 1,
                    alignItems: "center",
                    paddingVertical: 15,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : isNow ? colors.primary + "66" : colors.border,
                    backgroundColor: selected ? colors.primary : "transparent",
                  }}
                >
                  <Text style={{ fontWeight: "700", fontSize: 15, color: selected ? "#fff" : colors.text }}>{name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ marginTop: 18 }}>
          <Button title="Go to this month" variant="soft" icon="today-outline" onPress={() => { onChange(new Date()); setOpen(false); }} />
        </View>
      </Sheet>
    </>
  );
};

// ---------- bottom sheet ----------
export const Sheet = ({ visible, onClose, title, children }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
        <View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            maxHeight: "88%",
            paddingBottom: insets.bottom + 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, paddingBottom: 6 }}>
            <Text style={{ fontSize: 19, fontWeight: "800", color: colors.text }}>{title}</Text>
            <IconButton name="close" onPress={onClose} color={colors.sub} size={24} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingTop: 10 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const ConfirmSheet = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "danger",
  icon = "trash-outline",
  loading = false,
}) => {
  const { colors } = useTheme();
  const tint = variant === "danger" ? colors.danger : colors.primary;
  const tintSoft = variant === "danger" ? colors.dangerSoft : colors.primarySoft;

  return (
    <Sheet visible={visible} onClose={loading ? undefined : onClose} title="">
      <View style={{ alignItems: "center", paddingVertical: 10 }}>
        <View
          style={{
            width: 58,
            height: 58,
            borderRadius: 20,
            backgroundColor: tintSoft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name={icon} size={28} color={tint} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: 19,
            fontWeight: "800",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {title}
        </Text>
        {message ? (
          <Text
            style={{
              color: colors.sub,
              fontSize: 14,
              textAlign: "center",
              lineHeight: 20,
              paddingHorizontal: 12,
              marginBottom: 24,
            }}
          >
            {message}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
          <Button
            title={cancelText}
            variant="ghost"
            onPress={onClose}
            disabled={loading}
            style={{ flex: 1 }}
          />
          <Button
            title={loading ? "Please wait…" : confirmText}
            variant={variant}
            onPress={onConfirm}
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Sheet>
  );
};

// ---------- stat tile ----------
export const StatTile = ({ icon, label, value, tint }) => {
  const { colors } = useTheme();
  return (
    <Card style={{ flex: 1, padding: 14 }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: tint + "26", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
        <Ionicons name={icon} size={19} color={tint} />
      </View>
      <Text style={{ color: colors.sub, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
};

export const Avatar = ({ user, size = 58 }) => {
  const { colors } = useTheme();
  const initials = (user?.fullName || "U").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (user?.profileImageUrl)
    return <Image source={{ uri: user.profileImageUrl }} style={{ width: size, height: size, borderRadius: size * 0.34 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.38, fontWeight: "800" }}>{initials}</Text>
    </View>
  );
};

import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../theme";
import { capitalize, emojiFor, inr, shortDate } from "../utils/format";

export default function TransactionRow({ item, onPress }) {
  const { colors } = useTheme();
  const income = item.type === "income";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 11,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 15,
          backgroundColor: income ? colors.successSoft : colors.dangerSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 21 }}>{emojiFor(`${item.category} ${item.title}`, item.type)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
          {capitalize(item.category)} · {shortDate(item.date)}
        </Text>
      </View>
      <Text style={{ color: income ? colors.success : colors.danger, fontWeight: "800", fontSize: 15 }}>
        {income ? "+" : "-"}
        {inr(item.amount)}
      </Text>
    </Pressable>
  );
}

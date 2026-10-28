import React from "react";
import { ActivityIndicator, View } from "react-native";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { ForgotPasswordScreen, LoginScreen, SignUpScreen } from "../screens/AuthScreens";
import DashboardScreen from "../screens/DashboardScreen";
import TransactionsScreen from "../screens/TransactionsScreen";
import AddTransactionScreen from "../screens/AddTransactionScreen";
import BudgetsScreen from "../screens/BudgetsScreen";
import GoalsScreen from "../screens/GoalsScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import MoreScreen from "../screens/MoreScreen";
import SplitsScreen from "../screens/SplitsScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

const TAB_ICONS = {
  Home: ["home", "home-outline"],
  Transactions: ["swap-horizontal", "swap-horizontal-outline"],
  Analytics: ["bar-chart", "bar-chart-outline"],
  Budgets: ["pie-chart", "pie-chart-outline"],
  More: ["grid", "grid-outline"],
};

const MoreNavigator = () => {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <MoreStack.Screen name="MoreMain" component={MoreScreen} />
      <MoreStack.Screen name="Goals" component={GoalsScreen} />
      <MoreStack.Screen name="Splits" component={SplitsScreen} />
    </MoreStack.Navigator>
  );
};

const MainTabs = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.sub,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} />
      <Tabs.Screen name="Transactions" component={TransactionsScreen} />
      <Tabs.Screen name="Analytics" component={AnalyticsScreen} />
      <Tabs.Screen name="Budgets" component={BudgetsScreen} />
      <Tabs.Screen name="More" component={MoreNavigator} />
    </Tabs.Navigator>
  );
};

export default function RootNavigator() {
  const { user, booting } = useAuth();
  const { colors, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: { ...(isDark ? DarkTheme : DefaultTheme).colors, background: colors.bg, card: colors.card, text: colors.text, border: colors.border, primary: colors.primary },
  };

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="AddTransaction" component={AddTransactionScreen} options={{ presentation: "modal", animation: "slide_from_bottom" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

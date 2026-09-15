import { Tabs } from "expo-router";
import React from "react";
import { Image } from "react-native";
import { DarkModeProvider, useDarkMode } from "./DarkModeContext";

function TabIcon({ focused, label }: { focused: boolean; label: string }) {
  const { isDarkMode } = useDarkMode();
  const allowedLabels = ["Home", "Community", "Settings", "Welcome"];
  if (!allowedLabels.includes(label)) return null;
  const getIconSource = (label: string) => {
    switch (label) {
      case "Home":
        return require("../assets/icons/home.png");
      case "Community":
        return require("../assets/icons/community.png");
      case "Settings":
        return require("../assets/icons/settings.png");
      case "Welcome":
        return require("../assets/icons/get-started.png");
    }
  };
  return (
    <Image
      source={getIconSource(label)}
      style={{
        width: 26,
        height: 26,
        opacity: focused ? 1 : 0.6,
        tintColor: undefined,
        transform: [{ scale: focused ? 1.1 : 1 }],
        ...(isDarkMode ? { tintColor: undefined, filter: "invert(1)" } : {}),
      }}
      resizeMode="contain"
    />
  );
}

function TabLayoutInner() {
  const { isDarkMode } = useDarkMode();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDarkMode ? "#23232a" : "#ffffff",
          borderTopWidth: 0,
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarActiveTintColor: isDarkMode ? "#60a5fa" : "#3B82F6",
        tabBarInactiveTintColor: isDarkMode ? "#a1a1aa" : "#64748b",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Community" />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Settings" />
          ),
        }}
      />
      <Tabs.Screen
        name="welcome"
        options={{
          title: "Info",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Welcome" />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="DarkModeContext"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <DarkModeProvider>
      <TabLayoutInner />
    </DarkModeProvider>
  );
}

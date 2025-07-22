import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDarkMode } from "./DarkModeContext";

interface Settings {
  autoRefresh: boolean;
  darkMode: boolean;
  refreshInterval: number;
}

export default function SettingsScreen() {
  const { isDarkMode, setDarkMode } = useDarkMode();
  const [settings, setSettings] = useState<Settings>({
    autoRefresh: true,
    darkMode: false,
    refreshInterval: 30,
  });
  const [widgetCount, setWidgetCount] = useState(0);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportString, setExportString] = useState("");
  const [aboutModalVisible, setAboutModalVisible] = useState(false);

  useEffect(() => {
    loadSettings();
    loadWidgetCount();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem("settings");
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const loadWidgetCount = async () => {
    try {
      const storedWidgets = await AsyncStorage.getItem("widgets");
      if (storedWidgets) {
        const widgets = JSON.parse(storedWidgets);
        setWidgetCount(widgets.length);
      }
    } catch (error) {
      console.error("Error loading widget count:", error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem("settings", JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const updateSetting = async (key: keyof Settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
    if (key === "darkMode") {
      setDarkMode(value);
    }
  };

  const exportData = async () => {
    try {
      const widgets = await AsyncStorage.getItem("widgets");
      const settingsData = await AsyncStorage.getItem("settings");
      const exportData = {
        widgets: widgets ? JSON.parse(widgets) : [],
        settings: settingsData ? JSON.parse(settingsData) : settings,
        exportDate: new Date().toISOString(),
      };
      setExportString(JSON.stringify(exportData, null, 2));
      setExportModalVisible(true);
    } catch (error) {
      Alert.alert("Error", "Failed to export data");
    }
  };

  const MIT_LICENSE_URL =
    "https://github.com/leecheeyong/custom_api_dashboard_app/blob/main/LICENSE";
  const GITHUB_URL = 
    "https://github.com/leecheeyong/custom_api_dashboard_app";
  const showAppInfo = () => {
    setAboutModalVisible(true);
  };

  return (
    <View
      style={[styles.container, isDarkMode && { backgroundColor: "#18181b" }]}
    >
      <View
        style={[
          styles.header,
          isDarkMode && {
            backgroundColor: "#23232a",
            borderBottomColor: "#27272a",
          },
        ]}
      >
        <Text style={[styles.headerTitle, isDarkMode && { color: "#f1f5f9" }]}>
          Settings
        </Text>
        <Text
          style={[styles.headerSubtitle, isDarkMode && { color: "#a1a1aa" }]}
        >
          Customize your dashboard experience
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.section, isDarkMode && darkStyles.section]}>
          <Text
            style={[styles.sectionTitle, isDarkMode && darkStyles.sectionTitle]}
          >
            Dashboard
          </Text>
          <View
            style={[
              styles.settingItem,
              isDarkMode && darkStyles.settingItem,
              { borderRadius: 12 },
            ]}
          >
            <View style={styles.settingInfo}>
              <View style={styles.settingText}>
                <Text
                  style={[
                    styles.settingLabel,
                    isDarkMode && darkStyles.settingLabel,
                  ]}
                >
                  Auto Refresh
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    isDarkMode && darkStyles.settingDescription,
                  ]}
                >
                  Automatically update widget data
                </Text>
              </View>
            </View>
            <Switch
              value={settings.autoRefresh}
              onValueChange={(value) => updateSetting("autoRefresh", value)}
              trackColor={{
                false: isDarkMode ? "#27272a" : "#f1f5f9",
                true: "#3B82F6",
              }}
              thumbColor={isDarkMode ? "#3B82F6" : "white"}
            />
          </View>
        </View>

        <View
          style={[
            styles.section,
            isDarkMode && darkStyles.section,
            { borderRadius: 12 },
          ]}
        >
          <Text
            style={[styles.sectionTitle, isDarkMode && darkStyles.sectionTitle]}
          >
            Appearance
          </Text>
          <View
            style={[
              styles.settingItem,
              isDarkMode && darkStyles.settingItem,
              { borderRadius: 12 },
            ]}
          >
            <View style={styles.settingInfo}>
              <View style={styles.settingText}>
                <Text
                  style={[
                    styles.settingLabel,
                    isDarkMode && darkStyles.settingLabel,
                  ]}
                >
                  Dark Mode
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    isDarkMode && darkStyles.settingDescription,
                  ]}
                >
                  Switch to dark theme
                </Text>
              </View>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={(value) => updateSetting("darkMode", value)}
              trackColor={{
                false: isDarkMode ? "#27272a" : "#f1f5f9",
                true: "#3B82F6",
              }}
              thumbColor={isDarkMode ? "#3B82F6" : "white"}
            />
          </View>
        </View>

        <View
          style={[
            styles.section,
            isDarkMode && darkStyles.section,
            { borderRadius: 12 },
          ]}
        >
          <Text
            style={[styles.sectionTitle, isDarkMode && darkStyles.sectionTitle]}
          >
            Data Management
          </Text>
          <View
            style={[
              styles.statsContainer,
              isDarkMode && darkStyles.statsContainer,
              { borderRadius: 12 },
            ]}
          >
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, isDarkMode && darkStyles.statValue]}
              >
                {widgetCount}
              </Text>
              <Text
                style={[styles.statLabel, isDarkMode && darkStyles.statLabel]}
              >
                Widgets Created
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isDarkMode && darkStyles.actionButton,
              { borderRadius: 12 },
            ]}
            onPress={exportData}
          >
            <Text
              style={[
                styles.actionButtonText,
                isDarkMode && darkStyles.actionButtonText,
              ]}
            >
              Export Data
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, isDarkMode && darkStyles.section]}>
          <Text
            style={[styles.sectionTitle, isDarkMode && darkStyles.sectionTitle]}
          >
            About
          </Text>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isDarkMode && darkStyles.actionButton,
              { borderRadius: 12 },
            ]}
            onPress={() => Linking.openURL(GITHUB_URL)}
          >
            <Text
              style={[
                styles.actionButtonText,
                isDarkMode && darkStyles.actionButtonText,
              ]}
            >
              View on Github
            </Text>
          </TouchableOpacity>
                    <TouchableOpacity
            style={[
              styles.actionButton,
              isDarkMode && darkStyles.actionButton,
              { borderRadius: 12 },
            ]}
            onPress={showAppInfo}
          >
            <Text
              style={[
                styles.actionButtonText,
                isDarkMode && darkStyles.actionButtonText,
              ]}
            >
              App Information
            </Text>
          </TouchableOpacity>
          <View
            style={[
              styles.privacyNote,
              isDarkMode && darkStyles.privacyNote,
              { borderRadius: 12 },
            ]}
          >
            <Text
              style={[styles.privacyIcon, isDarkMode && darkStyles.privacyIcon]}
            >
              🔒
            </Text>
            <Text
              style={[styles.privacyText, isDarkMode && darkStyles.privacyText]}
            >
              All your data is stored locally on your device. We don't collect
              or transmit any personal information.
            </Text>
          </View>
        </View>
      </ScrollView>
      <Modal
        visible={exportModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: isDarkMode ? "#23232a" : "white",
              borderRadius: 12,
              padding: 20,
              maxWidth: "90%",
              maxHeight: "80%",
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 18,
                color: isDarkMode ? "#f1f5f9" : "#1e293b",
                marginBottom: 12,
              }}
            >
              Export Data
            </Text>
            <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
              <Text
                selectable
                style={{
                  color: isDarkMode ? "#f1f5f9" : "#1e293b",
                  fontSize: 13,
                  fontFamily: "monospace",
                }}
              >
                {exportString}
              </Text>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setExportModalVisible(false)}
              style={{ alignSelf: "flex-end", marginTop: 8 }}
            >
              <Text
                style={{ color: "#3B82F6", fontWeight: "bold", fontSize: 16 }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={aboutModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: isDarkMode ? "#23232a" : "white",
              borderRadius: 20,
              padding: 28,
              maxWidth: "90%",
              minWidth: 320,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.18,
              shadowRadius: 24,
              elevation: 12,
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                overflow: "hidden",
              }}
            >
              <Image
                source={require("../assets/images/icon.png")}
                style={{
                  width: 40,
                  height: 40,
                  resizeMode: "contain",
                  borderRadius: 20,
                }}
              />
            </View>
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 20,
                color: isDarkMode ? "#f1f5f9" : "#1e293b",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Custom API Dashboard
            </Text>
            <View
              style={{
                height: 1,
                backgroundColor: isDarkMode ? "#27272a" : "#e5e7eb",
                width: "100%",
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                color: isDarkMode ? "#a1a1aa" : "#64748b",
                fontSize: 15,
                marginBottom: 18,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              Version 1.0.0{"\n"}This project is available as open source under
              the terms of the{" "}
              <Text
                style={{ color: "#3B82F6", textDecorationLine: "underline" }}
                onPress={() => Linking.openURL(MIT_LICENSE_URL)}
              >
                MIT License
              </Text>
              , made with ❤️ by Chee Yong Lee
            </Text>
            <TouchableOpacity
              onPress={() => setAboutModalVisible(false)}
              style={{
                backgroundColor: "#3B82F6",
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 32,
                alignItems: "center",
                marginTop: 8,
                shadowColor: "#3B82F6",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.18,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text
                style={{ color: "white", fontWeight: "bold", fontSize: 16 }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
    color: "#3B82F6",
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
  settingDescription: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  statsContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
    color: "#3B82F6",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonIcon: {
    fontSize: 16,
    marginRight: 12,
    color: "#3B82F6",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  privacyIcon: {
    fontSize: 16,
    marginRight: 8,
    color: "#3B82F6",
  },
  privacyText: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
    flex: 1,
  },
});

const darkStyles = StyleSheet.create({
  container: { backgroundColor: "#18181b" },
  header: { backgroundColor: "#23232a", borderBottomColor: "#27272a" },
  headerTitle: { color: "#f1f5f9" },
  headerSubtitle: { color: "#a1a1aa" },
  section: { backgroundColor: "#23232a" },
  sectionTitle: { color: "#f1f5f9" },
  settingItem: { backgroundColor: "#18181b" },
  settingIcon: { color: "#60a5fa" },
  settingLabel: { color: "#f1f5f9" },
  settingDescription: { color: "#a1a1aa" },
  statsContainer: { backgroundColor: "#18181b" },
  statIcon: { color: "#60a5fa" },
  statValue: { color: "#f1f5f9" },
  statLabel: { color: "#a1a1aa" },
  actionButton: { backgroundColor: "#18181b" },
  actionButtonIcon: { color: "#60a5fa" },
  actionButtonText: { color: "#f1f5f9" },
  privacyNote: { backgroundColor: "#18181b" },
  privacyIcon: { color: "#60a5fa" },
  privacyText: { color: "#a1a1aa" },
});

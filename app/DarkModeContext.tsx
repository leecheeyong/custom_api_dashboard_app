import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

interface DarkModeContextType {
  isDarkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const DarkModeContext = createContext<DarkModeContextType>({
  isDarkMode: false,
  setDarkMode: () => {},
});

export const useDarkMode = () => useContext(DarkModeContext);

export const DarkModeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await AsyncStorage.getItem("settings");
      if (settings) {
        const parsed = JSON.parse(settings);
        setIsDarkMode(!!parsed.darkMode);
      }
    })();
  }, []);

  const setDarkMode = async (value: boolean) => {
    setIsDarkMode(value);
    const settings = await AsyncStorage.getItem("settings");
    let parsed = settings ? JSON.parse(settings) : {};
    parsed.darkMode = value;
    await AsyncStorage.setItem("settings", JSON.stringify(parsed));
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export default DarkModeProvider;

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cardroyale.thebiddingwar",
  appName: "The Bidding War",
  webDir: "dist",
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,          // we hide manually after React mounts
      backgroundColor: "#050313",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#050313",
    },
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;

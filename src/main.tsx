import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { Capacitor } from "@capacitor/core";

// Native-only setup
if (Capacitor.isNativePlatform()) {
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: "#050313" });
  }).catch(() => {});

  import("@capacitor/splash-screen").then(({ SplashScreen }) => {
    SplashScreen.hide({ fadeOutDuration: 300 });
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);

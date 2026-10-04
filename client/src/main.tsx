import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource/sora/latin-400.css";
import "@fontsource/sora/latin-600.css";
import "@fontsource/michroma/latin-400.css";
import "./styles/index.css";
import "./styles/display.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

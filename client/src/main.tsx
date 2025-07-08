import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/keyboard.css";
import "./styles/mobile-layout.css";

createRoot(document.getElementById("root")!).render(<App />);

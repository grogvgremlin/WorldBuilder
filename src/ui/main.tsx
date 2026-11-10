// Starts the app: opens storage, registers the service worker (offline), renders.
// Design: build/slice-0-brief.md §1.1 (installable, offline, keeps data across days).

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { IndexedDbStore } from "../store/indexeddb-store";
import { AppData } from "./app-data";
import { App } from "./App";
import "./styles.css";

registerSW({ immediate: true });

async function start(): Promise<void> {
  const root = createRoot(document.getElementById("root")!);
  try {
    const data = await AppData.open(await IndexedDbStore.open());
    root.render(
      <StrictMode>
        <App data={data} />
      </StrictMode>,
    );
  } catch (error) {
    root.render(<main><h1>Can't open storage</h1><p>{String(error)}</p></main>);
  }
}

void start();

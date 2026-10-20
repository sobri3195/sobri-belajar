import "./styles/main.css";
import { start } from "./app.js";
start().catch((e) => {
  document.querySelector("#app").textContent =
    "Penyimpanan tidak dapat dibuka: " + e.message;
});
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            const b = document.createElement("button");
            b.className = "update";
            b.textContent = "Versi baru tersedia · Muat ulang";
            b.onclick = () => {
              worker.postMessage("SKIP_WAITING");
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => location.reload(),
                { once: true },
              );
            };
            document.body.append(b);
          }
        });
      });
    })
    .catch(console.error);
}

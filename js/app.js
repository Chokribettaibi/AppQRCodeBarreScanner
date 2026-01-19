const output = document.getElementById("output");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");

let scanner = new Html5QrcodeScanner(
  "reader",
  {
    fps: 10,
    qrbox: { width: 400, height: 600 }
  },
  false
);

function onScanSuccess(decodedText) {
  output.textContent = decodedText;
}

scanner.render(onScanSuccess);

stopBtn.addEventListener("click", () => {
  scanner.clear();
  output.textContent = "Camera arrêtée";
});

clearBtn.addEventListener("click", () => {
  output.textContent = "—";
});

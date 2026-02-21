const output = document.getElementById("output");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const startBtn = document.getElementById("startBtn");


let scanner = new Html5QrcodeScanner(
  "reader",
  {
    fps: 10,
    qrbox: { width: 400, height: 500 }
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

startBtn.addEventListener("click", () => {
  localStorage.setItem("scannedResult", output.textContent);
});

// show data in stoke
const stokeResult = document.getElementById("stoke-result");
window.addEventListener("load", () => {
  const scannedResult = localStorage.getItem("scannedResult");
  if (scannedResult) {
    stokeResult.textContent = localStorage.getItem("scannedResult");
  }
});
// // Récupérer le résultat scanné depuis le localStorage
// window.addEventListener("load", () => {
//   const scannedResult = localStorage.getItem("scannedResult");
//   if (scannedResult) {
//     output.textContent = scannedResult;
//   }
// });


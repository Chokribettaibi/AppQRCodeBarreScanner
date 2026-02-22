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
let detaProduit;
if (localStorage.detaProduit != null) {
  detaProduit = JSON.parse(localStorage.getItem("detaProduit"));
}else {
  detaProduit = [];
}

startBtn.addEventListener("click", async () => {
  const { value: date } = await Swal.fire({
    title: "select departure date",
    input: "date",
    didOpen: () => {
      const today = (new Date()).toISOString();
      Swal.getInput().min = today.split("T")[0];
      
    }
  });
  if (date) {
    Swal.fire("Departure date", date);
    // Récupérer le résultat scanné depuis le localStorage
    localStorage.setItem("scannedResult", output.textContent);
    // Ajouter le résultat scanné et la date à la liste des produits
    detaProduit.push({ result: output.textContent, date: date });
    localStorage.setItem("detaProduit", JSON.stringify(detaProduit));
  }
});

// Fonction pour générer le tableau
function generateTable() {
  if (detaProduit.length > 0) {
    let tableHTML = '<table border="1"><thead><tr><th>Code Barre</th><th>DLC</th><th>Actions</th></tr></thead><tbody>';
    detaProduit.forEach((item, index) => {
      tableHTML += `<tr><td>${item.result}</td><td>${item.date}</td><td><button class="clear-row" data-index="${index}">🗑️ Clear</button> <button class="update-row" data-index="${index}">🔄 Update</button></td></tr>`;
    });
    tableHTML += '</tbody></table>';
    stokeResult.innerHTML = tableHTML;

    // Ajouter les événements pour les boutons
    document.querySelectorAll('.clear-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        detaProduit.splice(index, 1);
        localStorage.setItem("detaProduit", JSON.stringify(detaProduit));
        generateTable();
      });
    });

    document.querySelectorAll('.update-row').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt(e.target.dataset.index);
        const { value: newDate } = await Swal.fire({
          title: "Modifier la date",
          input: "date",
          inputValue: detaProduit[index].date,
          didOpen: () => {
            const today = (new Date()).toISOString();
            Swal.getInput().min = today.split("T")[0];
          }
        });
        if (newDate) {
          detaProduit[index].date = newDate;
          localStorage.setItem("detaProduit", JSON.stringify(detaProduit));
          generateTable();
        }
      });
    });
  } else {
    stokeResult.innerHTML = "rsultat";
  }
}

// show data in stoke
const stokeResult = document.getElementById("stoke-result");
window.addEventListener("load", () => {
  generateTable();
});



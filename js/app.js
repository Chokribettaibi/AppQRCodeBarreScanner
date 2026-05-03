// ============================================
// DOM ELEMENTS
// ============================================
const output = document.getElementById("output");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const startBtn = document.getElementById("startBtn");
const stockResult = document.getElementById("stock-result");
const stockStatus = document.getElementById("stock-status");
const cameraStatus = document.getElementById("cameraStatus");

// ============================================
// CONFIGURATION
// ============================================
const STORAGE_KEYS = {
  inventory: "inventory",
  legacyInventory: "detaProduit"
};
const EMPTY_SCAN_PLACEHOLDER = "\u2014";
const SCAN_FEEDBACK_DURATION = 500;
const DUPLICATE_SCAN_COOLDOWN = 1200;

// ============================================
// STATE MANAGEMENT
// ============================================
let scanner = null;
let scannerActive = false;
let scannedCode = null;
let inventory = [];
let isTableEventsBound = false;
let lastScanValue = "";
let lastScanTimestamp = 0;

function initializeInventory() {
  try {
    const storedInventory =
      localStorage.getItem(STORAGE_KEYS.inventory) ??
      localStorage.getItem(STORAGE_KEYS.legacyInventory);
    const parsedInventory = storedInventory ? JSON.parse(storedInventory) : [];

    inventory = Array.isArray(parsedInventory)
      ? parsedInventory
          .filter(isValidInventoryItem)
          .map(item => ({
            id: item.id || `${item.result}-${item.date}`,
            result: item.result.trim(),
            date: item.date
          }))
      : [];

    if (storedInventory !== null) {
      saveInventory();
    }
  } catch (error) {
    console.error("Error loading inventory:", error);
    inventory = [];
    updateStockStatus("Saved inventory could not be read. Starting with an empty list.", "error");
  }
}

function saveInventory() {
  try {
    localStorage.setItem(STORAGE_KEYS.inventory, JSON.stringify(inventory));

    if (localStorage.getItem(STORAGE_KEYS.legacyInventory)) {
      localStorage.removeItem(STORAGE_KEYS.legacyInventory);
    }
  } catch (error) {
    console.error("Error saving inventory:", error);
    Swal.fire("Error", "Could not save data. Storage might be full.", "error");
  }
}

// ============================================
// SCANNER INITIALIZATION
// ============================================
function initializeScanner() {
  if (typeof Html5QrcodeScanner === "undefined") {
    updateCameraStatus("Scanner library failed to load", "error");
    return;
  }

  try {
    scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
        showTorchButtonIfSupported: true,
        rememberLastUsedCamera: true
      },
      false
    );

    scanner.render(onScanSuccess, onScanError);
    scannerActive = true;
    syncScannerControls();
    updateCameraStatus("Ready to scan", "success");
  } catch (error) {
    console.error("Scanner initialization error:", error);
    updateCameraStatus("Camera not available", "error");
    Swal.fire("Error", "Could not initialize camera. Check permissions.", "error");
  }
}

function onScanSuccess(decodedText) {
  const normalizedCode = decodedText.trim();
  const now = Date.now();

  if (
    normalizedCode === lastScanValue &&
    now - lastScanTimestamp < DUPLICATE_SCAN_COOLDOWN
  ) {
    return;
  }

  lastScanValue = normalizedCode;
  lastScanTimestamp = now;
  scannedCode = normalizedCode;
  output.textContent = scannedCode;
  output.classList.add("success-scan");
  updateCameraStatus("Code detected", "success");

  window.setTimeout(() => {
    output.classList.remove("success-scan");
  }, SCAN_FEEDBACK_DURATION);
}

function onScanError(error) {
  if (!String(error).includes("QR code not found")) {
    console.warn("Scan error:", error);
    updateCameraStatus("Scanner is active but had trouble reading", "warning");
  }
}

function updateCameraStatus(message, status) {
  cameraStatus.textContent = message;
  cameraStatus.className = `camera-status ${status}`;
}

function updateStockStatus(message, status = "neutral") {
  stockStatus.textContent = message;
  stockStatus.className = `stock-status ${status}`;
}

function syncScannerControls() {
  stopBtn.disabled = !scannerActive;
}

async function stopScanner() {
  if (!scanner || !scannerActive) {
    updateCameraStatus("Scanner is already stopped", "warning");
    return;
  }

  try {
    await scanner.clear();
    scannerActive = false;
    syncScannerControls();
    updateCameraStatus("Scanner stopped", "warning");
  } catch (error) {
    console.error("Error stopping scanner:", error);
    updateCameraStatus("Could not stop scanner cleanly", "error");
  }
}

function resetCurrentScan() {
  scannedCode = null;
  output.textContent = EMPTY_SCAN_PLACEHOLDER;
  output.classList.remove("success-scan");
}

// ============================================
// BUTTON EVENTS
// ============================================
stopBtn.addEventListener("click", () => {
  stopScanner();
});

clearBtn.addEventListener("click", () => {
  resetCurrentScan();
  updateCameraStatus(scannerActive ? "Ready to scan" : "Scanner stopped", scannerActive ? "success" : "warning");
});

startBtn.addEventListener("click", async () => {
  if (!scannedCode) {
    Swal.fire("Warning", "Please scan a code first", "warning");
    return;
  }

  if (inventory.some(item => item.result === scannedCode)) {
    Swal.fire("Duplicate", "This code already exists in inventory", "info");
    return;
  }

  const { value: date } = await Swal.fire({
    title: "Select Expiration Date",
    input: "date",
    inputLabel: "Expiration date",
    showCancelButton: true,
    inputAttributes: {
      min: getTodayDateString()
    }
  });

  if (!date) {
    return;
  }

  inventory.push({
    id:
      globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${scannedCode}-${Date.now()}`,
    result: scannedCode,
    date
  });

  saveInventory();
  renderInventoryTable();
  resetCurrentScan();
  updateStockStatus(`${inventory.length} item${inventory.length > 1 ? "s" : ""} saved`, "success");
  Swal.fire("Success", "Item added to inventory", "success");
});

// ============================================
// INVENTORY TABLE RENDERING
// ============================================
function renderInventoryTable() {
  stockResult.replaceChildren();

  if (inventory.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = "No items yet. Start scanning to build your inventory.";
    stockResult.appendChild(emptyState);
    updateStockStatus("0 items saved", "neutral");
    return;
  }

  const table = document.createElement("table");
  table.className = "inventory-table";

  const caption = document.createElement("caption");
  caption.className = "sr-only";
  caption.textContent = "Saved scanned items and expiration dates";
  table.appendChild(caption);

  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th scope="col">Code</th>
      <th scope="col">Expiration</th>
      <th scope="col">Status</th>
      <th scope="col">Actions</th>
    </tr>
  `;

  const tbody = document.createElement("tbody");
  const sortedInventory = [...inventory].sort((firstItem, secondItem) =>
    firstItem.date.localeCompare(secondItem.date)
  );

  sortedInventory.forEach(item => {
    const row = document.createElement("tr");
    const itemStatus = getExpiryStatus(item.date);
    row.classList.toggle("expired", itemStatus.variant === "expired");
    row.classList.toggle("warning-row", itemStatus.variant === "warning");

    const codeCell = document.createElement("td");
    codeCell.className = "code-cell";
    codeCell.dataset.label = "Code";
    codeCell.textContent = item.result;

    const dateCell = document.createElement("td");
    dateCell.className = "date-cell";
    dateCell.dataset.label = "Expiration";
    dateCell.textContent = formatDisplayDate(item.date);

    const statusCell = document.createElement("td");
    statusCell.dataset.label = "Status";
    const badge = document.createElement("span");
    badge.className = `status-badge ${itemStatus.variant}`;
    badge.textContent = itemStatus.label;
    statusCell.appendChild(badge);

    const actionsCell = document.createElement("td");
    actionsCell.className = "actions-cell";
    actionsCell.dataset.label = "Actions";

    const updateButton = document.createElement("button");
    updateButton.type = "button";
    updateButton.className = "btn-small btn-update";
    updateButton.dataset.id = item.id;
    updateButton.setAttribute("aria-label", `Update date for ${item.result}`);
    updateButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn-small btn-delete";
    deleteButton.dataset.id = item.id;
    deleteButton.setAttribute("aria-label", `Delete ${item.result}`);
    deleteButton.textContent = "Delete";

    actionsCell.append(updateButton, deleteButton);
    row.append(codeCell, dateCell, statusCell, actionsCell);
    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  stockResult.appendChild(table);

  const expiredCount = inventory.filter(item => getExpiryStatus(item.date).variant === "expired").length;
  const warningCount = inventory.filter(item => getExpiryStatus(item.date).variant === "warning").length;
  updateStockStatus(
    `${inventory.length} item${inventory.length > 1 ? "s" : ""} saved${expiredCount ? `, ${expiredCount} expired` : ""}${warningCount ? `, ${warningCount} expiring soon` : ""}`,
    expiredCount ? "warning" : "neutral"
  );
}

function bindTableEvents() {
  if (isTableEventsBound) {
    return;
  }

  stockResult.addEventListener("click", async event => {
    const updateBtn = event.target.closest(".btn-update");
    const deleteBtn = event.target.closest(".btn-delete");

    if (!updateBtn && !deleteBtn) {
      return;
    }

    const itemId = updateBtn?.dataset.id || deleteBtn?.dataset.id;
    const itemIndex = inventory.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return;
    }

    if (updateBtn) {
      const { value: newDate } = await Swal.fire({
        title: "Update Expiration Date",
        input: "date",
        inputValue: inventory[itemIndex].date,
        showCancelButton: true,
        inputAttributes: {
          min: getTodayDateString()
        }
      });

      if (!newDate) {
        return;
      }

      inventory[itemIndex].date = newDate;
      saveInventory();
      renderInventoryTable();
      Swal.fire("Updated", "Expiration date updated", "success");
    }

    if (deleteBtn) {
      const { isConfirmed } = await Swal.fire({
        title: "Delete Item?",
        text: `Remove "${inventory[itemIndex].result}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444"
      });

      if (!isConfirmed) {
        return;
      }

      inventory.splice(itemIndex, 1);
      saveInventory();
      renderInventoryTable();
      Swal.fire("Deleted", "Item removed from inventory", "success");
    }
  });

  isTableEventsBound = true;
}

// ============================================
// UTILITIES
// ============================================
function isValidInventoryItem(item) {
  return (
    item &&
    typeof item.result === "string" &&
    item.result.trim() &&
    typeof item.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date)
  );
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getExpiryStatus(dateString) {
  const today = parseLocalDate(getTodayDateString());
  const expiryDate = parseLocalDate(dateString);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const differenceInDays = Math.round((expiryDate - today) / millisecondsPerDay);

  if (differenceInDays < 0) {
    return { label: "Expired", variant: "expired" };
  }

  if (differenceInDays <= 3) {
    return { label: "Soon", variant: "warning" };
  }

  return { label: "Fresh", variant: "success" };
}

function formatDisplayDate(dateString) {
  return parseLocalDate(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// ============================================
// INITIALIZATION
// ============================================
window.addEventListener("load", () => {
  initializeInventory();
  bindTableEvents();
  initializeScanner();
  renderInventoryTable();
  resetCurrentScan();
  syncScannerControls();
});

window.addEventListener("beforeunload", () => {
  if (!scanner || !scannerActive) {
    return;
  }

  scanner.clear().catch(error => {
    console.error("Error clearing scanner:", error);
  });
});

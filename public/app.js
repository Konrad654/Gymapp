const STORAGE_KEY = "gymlogg-v1";
const $ = (id) => document.getElementById(id);
const format = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 3 });
const groups = ["Upper", "Lower", "Kondition", "Egna övningar"];
let data = initialData();
let editingActivity = null;

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved !== null) {
    const parsed = JSON.parse(saved);
    if (!validBackup(parsed)) throw new Error("Invalid data");
    data = parsed;
  }
} catch {
  showError("storage-error", "Det gick inte att läsa den lokala historiken. Återställ en säkerhetskopia för att fortsätta.");
  $("new-log").disabled = true;
}

function showError(id, message = "") {
  $(id).textContent = message;
  $(id).hidden = !message;
}

function commit(next, errorId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    showError(errorId, "Det gick inte att spara på enheten. Kontrollera att webbplatsen får använda lokal lagring.");
    return false;
  }
  data = next;
  showError(errorId);
  return true;
}

function validBackup(value) {
  if (!value || value.version !== 1 || !Array.isArray(value.activities) || !Array.isArray(value.entries)) return false;
  const kinds = new Map();
  for (const item of value.activities) {
    if (!item || typeof item.id !== "string" || !item.id || kinds.has(item.id) ||
        typeof item.name !== "string" || !item.name.trim() || !groups.includes(item.group) ||
        !["gym", "cardio"].includes(item.kind)) return false;
    kinds.set(item.id, item.kind);
  }
  return value.entries.every((entry) => {
    if (!entry || !kinds.has(entry.activity) || typeof entry.note !== "string" ||
        !(entry.date === null || (typeof entry.date === "string" && Number.isFinite(Date.parse(entry.date))))) return false;
    if (kinds.get(entry.activity) === "cardio") {
      return Number.isFinite(entry.distance) && entry.distance > 0 &&
        Number.isSafeInteger(entry.duration) && entry.duration > 0;
    }
    return (entry.weight === null || (Number.isFinite(entry.weight) && entry.weight >= 0) ||
      entry.weight === "Max" || entry.weight === "Max + 5 kg") &&
      (entry.reps === null || (Number.isSafeInteger(entry.reps) && entry.reps > 0));
  });
}

function describe(entry, kind) {
  if (kind === "cardio") {
    const minutes = Math.floor(entry.duration / 60);
    const seconds = String(entry.duration % 60).padStart(2, "0");
    return `${format.format(entry.distance)} km · ${minutes}:${seconds} min`;
  }
  const weight = typeof entry.weight === "number" ? `${format.format(entry.weight)} kg` : entry.weight;
  return [weight, entry.reps === null ? null : `${entry.reps} reps`].filter(Boolean).join(" · ");
}

function entriesFor(id) {
  return data.entries.filter((entry) => entry.activity === id).reverse();
}

function populateSelect(selected = "") {
  const select = $("activity");
  select.replaceChildren(new Option("Välj övning eller aktivitet", ""));
  for (const group of groups) {
    const activities = data.activities.filter((item) => item.group === group);
    if (!activities.length) continue;
    const options = document.createElement("optgroup");
    options.label = group;
    for (const item of activities) options.append(new Option(item.name, item.id));
    select.append(options);
  }
  select.value = selected;
}

function historyButton(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary";
  button.textContent = label;
  return button;
}

function saveHistoryChange(entry, replacement, item) {
  const index = data.entries.indexOf(entry);
  if (index === -1 || $("new-log").disabled) return false;
  const entries = [...data.entries];
  if (replacement) entries.splice(index, 1, replacement);
  else entries.splice(index, 1);
  if (!commit({ ...data, entries }, "storage-error")) {
    $("storage-error").scrollIntoView({ block: "nearest" });
    return false;
  }
  if (editingActivity === item.id && !entriesFor(item.id).length) editingActivity = null;
  if ($("activity").value === item.id) showPrevious(item);
  renderHistory();
  const details = Array.from($("history").querySelectorAll("details"))
    .find((element) => element.dataset.activity === item.id);
  (details?.querySelector(".edit-activity") ?? details?.querySelector("summary"))?.focus();
  $("status").textContent = `${replacement ? "Resultatet ändrades" : "Resultatet togs bort"} · ${item.name}`;
  return true;
}

function editHistoryEntry(line, actions, edit, entry, item) {
  const form = document.createElement("form");
  form.className = "subpanel";
  form.setAttribute("aria-label", `Redigera resultat för ${item.name}`);
  function field(label, value, inputMode = "text", tag = "input") {
    const wrapper = document.createElement("label");
    wrapper.textContent = label;
    const input = document.createElement(tag);
    input.inputMode = inputMode;
    input.value = String(value ?? "");
    wrapper.append(input);
    form.append(wrapper);
    return input;
  }

  const gym = item.kind === "gym";
  const weight = gym ? field("Vikt (kg, Max eller Max + 5 kg)", entry.weight) : null;
  const reps = gym ? field("Reps", entry.reps, "numeric") : null;
  const distance = gym ? null : field("Distans (km)", entry.distance, "decimal");
  const minutes = gym ? null : field("Minuter", Math.floor(entry.duration / 60), "numeric");
  const seconds = gym ? null : field("Sekunder", entry.duration % 60, "numeric");
  const note = field("Anteckning", entry.note, "text", "textarea");
  const error = document.createElement("p");
  error.className = "error";
  error.setAttribute("role", "alert");
  error.hidden = true;

  const controls = document.createElement("div");
  controls.className = "actions";
  const save = historyButton("Spara ändringar");
  save.type = "submit";
  save.className = "primary";
  const cancel = historyButton("Avbryt");
  controls.append(save, cancel);
  form.append(error, controls);
  actions.hidden = true;
  line.append(form);
  (weight ?? distance).focus();

  cancel.addEventListener("click", () => {
    form.remove();
    actions.hidden = false;
    edit.focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const updated = { ...entry, note: note.value };
    if (gym) {
      const rawWeight = weight.value.trim();
      updated.weight = ["Max", "Max + 5 kg"].includes(rawWeight)
        ? rawWeight
        : rawWeight === String(entry.weight) ? entry.weight : parseNumber(rawWeight, null);
      updated.reps = parseNumber(reps.value, null);
    } else {
      const wholeMinutes = parseNumber(minutes.value, 0);
      const remainingSeconds = parseNumber(seconds.value, 0);
      updated.distance = distance.value === String(entry.distance) ? entry.distance : parseNumber(distance.value);
      updated.duration = Number.isSafeInteger(wholeMinutes) && Number.isInteger(remainingSeconds) && remainingSeconds <= 59
        ? wholeMinutes * 60 + remainingSeconds
        : NaN;
    }
    if (!validBackup({ ...data, entries: [updated] })) {
      error.textContent = gym
        ? "Ange en vikt på minst 0 kg, Max eller Max + 5 kg och ett helt antal reps över 0. Fälten får också lämnas tomma."
        : "Ange en distans över 0 km och en tid över 0 sekunder. Sekundfältet ska vara 0–59.";
      error.hidden = false;
      return;
    }
    error.hidden = true;
    saveHistoryChange(entry, updated, item);
  });
}

function renderHistory() {
  const history = $("history");
  const expanded = new Set(Array.from(history.querySelectorAll("details[open]"), (item) => item.dataset.activity));
  history.replaceChildren();
  for (const group of groups) {
    const activities = data.activities.filter((item) => item.group === group);
    if (!activities.length) continue;
    const heading = document.createElement("h3");
    heading.className = "history-group";
    heading.textContent = group;
    history.append(heading);
    for (const item of activities) {
      const entries = entriesFor(item.id);
      const details = document.createElement("details");
      details.className = "history-item";
      details.dataset.activity = item.id;
      details.open = expanded.has(item.id);
      const summary = document.createElement("summary");
      summary.textContent = item.name;
      const latest = document.createElement("small");
      latest.textContent = entries.length ? `Senast · ${describe(entries[0], item.kind) || entries[0].note}` : "Ingen logg ännu";
      summary.append(latest);
      details.append(summary);
      if (entries.length) {
        const editing = editingActivity === item.id;
        const toolbar = document.createElement("div");
        toolbar.className = "entries";
        const toggle = historyButton(editing ? "Klar" : "Redigera");
        toggle.classList.add("edit-activity");
        toggle.disabled = $("new-log").disabled;
        toggle.setAttribute("aria-pressed", String(editing));
        toggle.addEventListener("click", () => {
          editingActivity = editing ? null : item.id;
          renderHistory();
          const current = Array.from(history.querySelectorAll("details"))
            .find((element) => element.dataset.activity === item.id);
          current?.querySelector(".edit-activity").focus();
        });
        toolbar.append(toggle);
        if (editing) {
          const instruction = document.createElement("p");
          instruction.textContent = "Tryck på ett resultat för att ändra det.";
          toolbar.append(instruction);
        }
        details.append(toolbar);

        const list = document.createElement("ul");
        list.className = "entries";
        for (const entry of entries) {
          const line = document.createElement("li");
          const date = entry.date ? new Date(entry.date).toLocaleDateString("sv-SE") : "";
          const result = [[date, describe(entry, item.kind)].filter(Boolean).join(" · "), entry.note].filter(Boolean).join("\n")
            || "Resultat utan uppgifter";
          if (editing) {
            const actions = document.createElement("div");
            actions.className = "actions";
            const edit = historyButton(result);
            const remove = historyButton("Ta bort");
            edit.setAttribute("aria-label", `Ändra ${result}`);
            remove.setAttribute("aria-label", `Ta bort ${result}`);
            edit.addEventListener("click", () => editHistoryEntry(line, actions, edit, entry, item));
            remove.addEventListener("click", () => {
              if (window.confirm(`Ta bort det här resultatet för ${item.name}?`)) {
                saveHistoryChange(entry, null, item);
              }
            });
            actions.append(edit, remove);
            line.append(actions);
          } else {
            line.textContent = result;
          }
          list.append(line);
        }
        details.append(list);
      }
      history.append(details);
    }
  }
}

function showActivity() {
  const item = data.activities.find((entry) => entry.id === $("activity").value);
  $("log-form").reset();
  showError("log-error");
  $("log-form").hidden = !item;
  if (!item) return;
  $("gym-fields").hidden = item.kind !== "gym";
  $("cardio-fields").hidden = item.kind !== "cardio";
  const latest = showPrevious(item);
  if (item.kind === "gym") {
    $("weight").value = typeof latest?.weight === "number" ? format.format(latest.weight).replace(/\s/g, "") : "";
    $("reps").value = latest?.reps ?? "";
  }
}

function showPrevious(item) {
  const latest = entriesFor(item.id)[0];
  $("previous").textContent = latest
    ? [describe(latest, item.kind), latest.note].filter(Boolean).join("\n")
    : "Ingen tidigare logg.";
  return latest;
}

function numberFrom(id, defaultValue) {
  return parseNumber($(id).value, defaultValue);
}

function parseNumber(value, defaultValue = NaN) {
  const raw = value.trim();
  if (!raw) return defaultValue;
  return /^\d+(?:[.,]\d+)?$/.test(raw) ? Number(raw.replace(",", ".")) : NaN;
}

function toggleActivityForm(open) {
  $("activity-form").hidden = !open;
  $("new-activity").setAttribute("aria-expanded", String(open));
  if (open) $("activity-name").focus();
  else showError("activity-error");
}

$("new-log").addEventListener("click", () => {
  $("log-panel").hidden = false;
  $("activity").focus();
});

$("cancel").addEventListener("click", () => {
  $("log-panel").hidden = true;
  $("new-log").focus();
});

$("activity").addEventListener("change", showActivity);
$("new-activity").addEventListener("click", () => toggleActivityForm($("activity-form").hidden));
$("activity-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = $("activity-name").value.trim();
  if (!name) {
    showError("activity-error", "Skriv ett namn på övningen.");
    return;
  }
  const existing = data.activities.find((item) => item.name.toLocaleLowerCase("sv") === name.toLocaleLowerCase("sv"));
  const item = existing ?? { id: crypto.randomUUID(), name, kind: "gym", group: $("activity-group").value };
  if (!existing && !commit({ ...data, activities: [...data.activities, item] }, "activity-error")) return;
  $("activity-form").reset();
  toggleActivityForm(false);
  populateSelect(item.id);
  showActivity();
  renderHistory();
  $("activity").focus();
});

for (const button of document.querySelectorAll("[data-step]")) {
  button.addEventListener("click", () => {
    const id = button.dataset.for;
    const step = Number(button.dataset.step);
    const current = numberFrom(id, 0);
    if (!Number.isFinite(current)) {
      $(id).focus();
      return;
    }
    const next = Math.max(id === "reps" ? 1 : 0, current + step);
    $(id).value = format.format(next).replace(/\s/g, "");
  });
}

$("log-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const item = data.activities.find((entry) => entry.id === $("activity").value);
  if (!item) return;
  const entry = { activity: item.id, date: new Date().toISOString(), note: $("note").value.trim() };
  if (item.kind === "gym") {
    entry.weight = numberFrom("weight");
    entry.reps = numberFrom("reps");
    if (!Number.isFinite(entry.weight) || !Number.isSafeInteger(entry.reps) || entry.reps < 1) {
      showError("log-error", "Ange en vikt på minst 0 kg och minst 1 rep som heltal.");
      return;
    }
  } else {
    entry.distance = numberFrom("distance");
    const minutes = numberFrom("minutes", 0);
    const seconds = numberFrom("seconds", 0);
    entry.duration = minutes * 60 + seconds;
    if (!Number.isFinite(entry.distance) || entry.distance <= 0 || !Number.isSafeInteger(minutes) ||
        !Number.isInteger(seconds) || seconds > 59 || !Number.isSafeInteger(entry.duration) || entry.duration <= 0) {
      showError("log-error", "Ange en distans över 0 km och en tid över 0 sekunder. Sekundfältet ska vara 0–59.");
      return;
    }
  }
  if (!commit({ ...data, entries: [...data.entries, entry] }, "log-error")) return;
  $("status").textContent = `Sparat · ${item.name} · ${describe(entry, item.kind)}`;
  showActivity();
  renderHistory();
});

$("export").addEventListener("click", () => {
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  link.href = url;
  link.download = "gymlogg-sakerhetskopia.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("import").addEventListener("click", () => $("backup-file").click());
$("backup-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;
  let imported;
  try {
    imported = JSON.parse(await file.text());
    if (!validBackup(imported)) throw new Error("Invalid backup");
  } catch {
    showError("storage-error", "Filen är inte en giltig säkerhetskopia från Gymlogg.");
    return;
  }
  if (!window.confirm("Ersätta övningar och historik med innehållet i säkerhetskopian?")) return;
  if (!commit(imported, "storage-error")) return;
  editingActivity = null;
  $("new-log").disabled = false;
  populateSelect();
  showActivity();
  renderHistory();
  $("status").textContent = "Säkerhetskopian har lästs in.";
});

populateSelect();
renderHistory();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("Offlinecache kunde inte startas.", error));
}

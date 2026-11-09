const seedGroups = {
  Upper: {
    "Peckdeck (eller Chestpress)": [56.5,59,61,63.5,66,68,70.5,73,75,77.5,80,82,84.5,86,89,91.5,94,96,98.5,103],
    Shoulderpress: [25,27.5,30,32,34.5,37,39,41.5,43,46],
    Latpulldowns: [45,50,55,60,67,[70,"Riktigt svårt"],77,79.5,[77,"Ska nog fortsätta med denna"]],
    "Rows (med lång pinne)": [23.5,25,[23.5,"Med två vikter på mer än 25 kg tot"],28.5,[28.5,"Med extra vikt"],[33.5,"Med extra vikt"],38.5,41,42,43.5,45,48.5,[48.5,"Med extra vikt"]],
    "Tricep pressdowns": [[45,"Med pinne"],50,55,60,65,70,71.5,72.5,77,79.5,84,86.5,91],
    "Biceps maskin (enarms)": [55.5,58,60,65,67,69.5,74,76.5,81,83.5,86,88,90.5],
    "Axelpress (Lateral Raise)": [[null,"Lite oklart typ 46"],48.5,51],
  },
  Lower: {
    Legextension: [104,105.5,108,110,112.5,117,119.5,122,124,126.5,129,131,133.5,136,"Max","Max + 5 kg"],
    "Leg Crunches": [62.5,65,67,69.5,72,74,76.5,79,81,83.5,88,95],
    Benpress: [100,105,110,[140,"Seated"]],
  },
};

function initialData() {
  const data = { version: 1, activities: [], entries: [] };
  for (const [group, exercises] of Object.entries(seedGroups)) {
    for (const [name, sets] of Object.entries(exercises)) {
      const id = `gym-${data.activities.length + 1}`;
      data.activities.push({ id, name, group, kind: "gym" });
      for (const set of sets) {
        const [weight, note] = Array.isArray(set) ? set : [set, ""];
        data.entries.push({ activity: id, weight, reps: null, date: null, note });
      }
    }
  }
  data.activities.push(
    { id: "run", name: "Löpning", group: "Kondition", kind: "cardio" },
    { id: "bike", name: "Cykling", group: "Kondition", kind: "cardio" },
  );
  return data;
}

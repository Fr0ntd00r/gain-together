// Gemeinsame Progressions-Logik für Client (UI-Platzhalter/Anzeige) und Server (Empfehlung).
// Single Source of Truth für den Gewichtsschritt je Equipment und die Wiederholungs-Bereiche.

// Sinnvoller Standard-Gewichtsschritt je Equipment (nicht überall sind 2,5 kg möglich).
export function defaultWeightIncrement(equipment: string | null | undefined): number {
  switch (equipment) {
    case "barbell": return 2.5;   // kleinste Scheibenpaarung
    case "dumbbell": return 2;    // typischer Kurzhantelsprung
    case "machine": return 5;     // Steckgewichte springen meist in 5er-Schritten
    case "cable": return 2.5;
    case "kettlebell": return 4;  // Kettlebells springen in ~4 kg
    case "bodyweight":
    case "bands":
    case "cardio_machine": return 0; // Fortschritt über Wiederholungen
    default: return 2.5;
  }
}

// Wiederholungs-Zielkorridor für die Doppelprogression.
export function repRange(isCompound: boolean | null | undefined, inc: number): { min: number; max: number } {
  if (inc === 0) return { min: 8, max: 20 };          // Körpergewicht/Bänder: über Wdh progressieren
  return isCompound ? { min: 6, max: 10 } : { min: 10, max: 15 };
}

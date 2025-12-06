// --- DEFINISI KONEKSI TANGAN (UNTUK SKELETON) ---
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],     // Jempol
  [0, 5], [5, 6], [6, 7], [7, 8],     // Telunjuk
  [0, 9], [9, 10], [10, 11], [11, 12], // Tengah
  [0, 13], [13, 14], [14, 15], [15, 16], // Manis
  [0, 17], [17, 18], [18, 19], [19, 20], // Kelingking
  [5, 9], [9, 13], [13, 17], [0, 17]   // Telapak
];
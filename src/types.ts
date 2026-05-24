export interface User {
  username: string;
  name: string;
  role: string;
}

export interface Kriteria {
  kode: string;
  nama: string;
  tipe: 'benefit' | 'cost';
  bobot: number; // dynamically controlled
  defaultBobot: number;
}

export interface Alternatif {
  id: string;
  nama: string;
  C1: number;
  C2: number;
  C3: number;
  C4: number;
  C5: number;
}

export interface RiwayatItem {
  id: string;
  tanggal: string;
  namaSkenario: string;
  lokasiTerbaik: string;
  ringkasanBobot: string;
}

export interface SkalaItem {
  nilai: number;
  label: string;
  rentang: string;
}

export interface KriteriaSkala {
  [key: string]: SkalaItem[];
}

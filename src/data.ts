import { Kriteria, Alternatif, RiwayatItem, KriteriaSkala } from './types';

// Validated credentials for local verification
export const ALLOWED_USERS = [
  {
    username: 'admin',
    password_hash: 'admin12345', // In actual DB this would be hashed
    name: 'Admin Desa',
    role: 'Administrator'
  },
  {
    username: 'kades',
    password_hash: 'kades12345',
    name: 'Kepala Desa',
    role: 'Kepala Desa'
  }
];

// Initial Kriteria
export const INITIAL_KRITERIA: Kriteria[] = [
  { kode: 'C1', nama: 'Kepadatan Penduduk', tipe: 'benefit', bobot: 18.2, defaultBobot: 18.2 },
  { kode: 'C2', nama: 'Aksesibilitas Jalan', tipe: 'benefit', bobot: 20.8, defaultBobot: 20.8 },
  { kode: 'C3', nama: 'Jarak Pemukiman', tipe: 'cost', bobot: 20.4, defaultBobot: 20.4 },
  { kode: 'C4', nama: 'Ketersediaan Lahan', tipe: 'benefit', bobot: 20.1, defaultBobot: 20.1 },
  { kode: 'C5', nama: 'Volume Sampah', tipe: 'benefit', bobot: 20.4, defaultBobot: 20.4 },
];

// Initial Alternatif
export const INITIAL_ALTERNATIF: Alternatif[] = [
  { id: 'A1', nama: 'Balai RW', C1: 5, C2: 3, C3: 5, C4: 3, C5: 4 },
  { id: 'A2', nama: 'Balai Desa', C1: 5, C2: 5, C3: 5, C4: 2, C5: 5 },
  { id: 'A3', nama: 'Dekat Lapangan Jl Gn Slamet V', C1: 4, C2: 3, C3: 3, C4: 4, C5: 3 },
  { id: 'A4', nama: 'Taman Air Mancur Adipura', C1: 4, C2: 4, C3: 4, C4: 3, C5: 3 },
  { id: 'A5', nama: 'Jl Djojo Soekarto', C1: 3, C2: 2, C3: 1, C4: 2, C5: 1 },
];

export const INITIAL_SCALES: KriteriaSkala = {
  C1: [
    { nilai: 1, label: 'Sangat Rendah', rentang: '< 100 KK / km²' },
    { nilai: 2, label: 'Rendah', rentang: '100 – 249 KK / km²' },
    { nilai: 3, label: 'Sedang', rentang: '250 – 499 KK / km²' },
    { nilai: 4, label: 'Tinggi', rentang: '500 – 799 KK / km²' },
    { nilai: 5, label: 'Sangat Tinggi', rentang: '≥ 800 KK / km²' }
  ],
  C2: [
    { nilai: 1, label: 'Sangat Sulit', rentang: 'Lebar jalan < 2m, tanah/berbatu' },
    { nilai: 2, label: 'Sulit', rentang: 'Lebar jalan 2-3m, belum aspal' },
    { nilai: 3, label: 'Cukup', rentang: 'Lebar jalan 3-4m, aspal lapuk' },
    { nilai: 4, label: 'Mudah', rentang: 'Lebar jalan 4-6m, aspal bagus' },
    { nilai: 5, label: 'Sangat Mudah', rentang: 'Lebar jalan > 6m, dua arah, aspal mulus' }
  ],
  C3: [
    { nilai: 1, label: 'Sangat Dekat', rentang: '< 50 meter dari pemukiman padat' },
    { nilai: 2, label: 'Dekat', rentang: '50 – 150 meter dari pemukiman' },
    { nilai: 3, label: 'Sedang', rentang: '151 – 300 meter dari pemukiman' },
    { nilai: 4, label: 'Jauh', rentang: '301 – 500 meter dari pemukiman' },
    { nilai: 5, label: 'Sangat Jauh', rentang: '> 500 meter dari pemukiman' }
  ],
  C4: [
    { nilai: 1, label: 'Sangat Kurang', rentang: 'Luas area < 50 m², status sengketa' },
    { nilai: 2, label: 'Kurang', rentang: 'Luas area 50 – 99 m², sewa pendek' },
    { nilai: 3, label: 'Cukup', rentang: 'Luas area 100 – 199 m², sewa panjang' },
    { nilai: 4, label: 'Luas', rentang: 'Luas area 200 – 400 m², tanah kas desa' },
    { nilai: 5, label: 'Sangat Luas', rentang: 'Luas area > 400 m², hak milik hibah' }
  ],
  C5: [
    { nilai: 1, label: 'Sangat Rendah', rentang: '< 0.5 m³ per hari' },
    { nilai: 2, label: 'Rendah', rentang: '0.5 – 1.5 m³ per hari' },
    { nilai: 3, label: 'Sedang', rentang: '1.6 – 3.0 m³ per hari' },
    { nilai: 4, label: 'Tinggi', rentang: '3.1 – 5.0 m³ per hari' },
    { nilai: 5, label: 'Sangat Tinggi', rentang: '> 5.0 m³ per hari' }
  ]
};

// Initial historic assessments
export const INITIAL_RIWAYAT: RiwayatItem[] = [
  { id: 'R1', tanggal: '2026-05-10', namaSkenario: 'Bobot Default', lokasiTerbaik: 'Balai Desa', ringkasanBobot: 'C1:18%, C2:21%, C3:20%, C4:20%, C5:20%' },
  { id: 'R2', tanggal: '2026-05-18', namaSkenario: 'Ketersediaan Lahan Dominan', lokasiTerbaik: 'Dekat Lapangan Jl Gn Slamet V', ringkasanBobot: 'C1:10%, C2:15%, C3:15%, C4:45%, C5:15%' },
  { id: 'R3', tanggal: '2026-05-22', namaSkenario: 'Akses Jalan Dominan', lokasiTerbaik: 'Balai Desa', ringkasanBobot: 'C1:12%, C2:40%, C3:16%, C4:16%, C5:16%' }
];

/* 
  ========================================================================
  STRUCTURAL GATEWAYS FOR DIRECT DATABASE SYNC LATER (Sistem Siap Database)
  ========================================================================
  These wrappers enable seamless transition directly to database / REST API
  queries in the future. Front-end states consume through these endpoints.
*/

export const getKriteria = async (): Promise<Kriteria[]> => {
  // FUTURE: return fetch('/api/kriteria').then(res => res.json());
  return INITIAL_KRITERIA;
};

export const getAlternatif = async (): Promise<Alternatif[]> => {
  // FUTURE: return fetch('/api/alternatif').then(res => res.json());
  return INITIAL_ALTERNATIF;
};

export const updateBobot = async (kode: string, newBobot: number): Promise<boolean> => {
  // FUTURE: send PUT request to API
  // fetch(`/api/kriteria/${kode}`, { method: 'PUT', body: JSON.stringify({ bobot: newBobot }) })
  return true;
};

export const updateNilaiAlternatif = async (id: string, updates: Partial<Alternatif>): Promise<boolean> => {
  // FUTURE: send PATCH/PUT to client database or endpoint
  return true;
};

export const saveRiwayat = async (item: Omit<RiwayatItem, 'id'>): Promise<RiwayatItem> => {
  // FUTURE: POST to /api/riwayat
  return {
    ...item,
    id: `R${Date.now()}`
  };
};

export const loginUser = async (username: string, passwordPlain: string) => {
  // FUTURE: POST to auth server with credentials. NEVER query database on frontend directly.
  const user = ALLOWED_USERS.find(
    u => u.username === username.trim() && u.password_hash === passwordPlain
  );
  if (user) {
    return {
      authenticated: true,
      user: {
        username: user.username,
        name: user.name,
        role: user.role
      }
    };
  }
  return { authenticated: false, user: null };
};

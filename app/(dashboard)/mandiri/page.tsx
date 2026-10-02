"use client";



import Topbar from "@/components/Topbar";
import PhotoUpload from "@/components/mandiri/PhotoUpload";

import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

interface MandiriItem {
   id: string;
   nomorUrut?: number;
   statusMandiri: string;
   statusPeserta?: string;
   dibayarkanSenilai?: number | null;
   buktiPembayaran?: string | null;
   catatan: string;
   generusId: string;
   nama: string;
   jenisKelamin: string;
   kategoriUsia: string;
   tanggalLahir?: string | null;
   pekerjaan?: string | null;
   tempatLahir?: string | null;
   alamat?: string | null;
   pendidikan?: string | null;
   suku?: string | null;
   hobi?: string | null;
   makananMinumanFavorit?: string | null;
   instagram?: string | null;
   kriteriaPasangan?: string | null;
   targetMenikah?: string | null;
   desaNama: string;
   desaKota: string;
   kelompokNama?: string;
   noTelp: string;
   foto: string;
   createdAt: string;
   nomorUnik: string;
   isHadir?: number;
   waktuHadir?: string;
   keterangan?: string;
   mandiriDaerahId?: number | null;
   mandiriDesaId?: number | null;
   mandiriKelompokId?: number | null;
}

interface KegiatanOption { id: string; judul: string; kota: string; }

function hitungUmur(tanggalLahir?: string | null): string {
   if (!tanggalLahir) return "-";
   const lahir = new Date(tanggalLahir);
   if (isNaN(lahir.getTime())) return "-";
   const now = new Date();
   let umur = now.getFullYear() - lahir.getFullYear();
   const belumUlangTahun = now.getMonth() < lahir.getMonth() || (now.getMonth() === lahir.getMonth() && now.getDate() < lahir.getDate());
   if (belumUlangTahun) umur--;
   return `${umur} th`;
}

export default function MandiriPage() {
   const [data, setData] = useState<MandiriItem[]>([]);
   const [total, setTotal] = useState(0);
   const [loading, setLoading] = useState(true);
   const [search, setSearch] = useState("");
   const [sort, setSort] = useState(""); // "" (default), "asc", "desc"
   const [page, setPage] = useState(1);
   const [userRole, setUserRole] = useState("");
   const [regStatus, setRegStatus] = useState("1");
   const [regTitle, setRegTitle] = useState("");
   const [regDesc, setRegDesc] = useState("");
   const [regStatusPeserta, setRegStatusPeserta] = useState("Utusan Daerah");
   const [regGender, setRegGender] = useState("Semua");
   const [regQuota, setRegQuota] = useState("0");
   const [regMinAgeLaki, setRegMinAgeLaki] = useState("");
   const [regMinAgePerempuan, setRegMinAgePerempuan] = useState("");
   const [isClosed, setIsClosed] = useState(false);
   const [kegiatanList, setKegiatanList] = useState<KegiatanOption[]>([]);
   const [selectedKegiatanId, setSelectedKegiatanId] = useState("");
   const [filterStatusPeserta, setFilterStatusPeserta] = useState("all");
   const [utusanDaerahCount, setUtusanDaerahCount] = useState(0);
   const [personCount, setPersonCount] = useState(0);
   const [pesertaAllCount, setPesertaAllCount] = useState(0);
   const [panitiaAllCount, setPanitiaAllCount] = useState(0);
   const [pesertaLCount, setPesertaLCount] = useState(0);
   const [pesertaPCount, setPesertaPCount] = useState(0);
   const [panitiaLCount, setPanitiaLCount] = useState(0);
   const [panitiaPCount, setPanitiaPCount] = useState(0);
   
   // Wilayah state
   const [daerahList, setDaerahList] = useState<{id: number, nama: string}[]>([]);
   const [desaList, setDesaList] = useState<{id: number, nama: string, mandiriDaerahId: number}[]>([]);
   const [kelompokList, setKelompokList] = useState<{id: number, nama: string, mandiriDesaId: number}[]>([]);
   
   // Edit Modal State
   const [editModalOpen, setEditModalOpen] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [editForm, setEditForm] = useState({
      id: "",
      statusMandiri: "Aktif",
      statusPeserta: "Utusan Daerah",
      dibayarkanSenilai: "",
      catatan: "",
      resetDevice: false,
      nama: "",
      foto: "",
      nomorUrut: 0,
      generusId: "",
      jenisKelamin: "L",
      noTelp: "",
      tanggalLahir: "",
      pekerjaan: "",
      tempatLahir: "",
      alamat: "",
      pendidikan: "",
      suku: "",
      hobi: "",
      makananMinumanFavorit: "",
      instagram: "",
      kriteriaPasangan: "",
      targetMenikah: "",
      mandiriDaerahId: "",
      mandiriDesaId: "",
      mandiriKelompokId: "",
      buktiPembayaran: "",
   });

   const limit = 10;

   useEffect(() => {
      fetch("/api/profile")
         .then(r => {
            if (!r.ok) throw new Error("Profile API failed");
            return r.json();
         })
         .then(d => setUserRole(d?.role || ""))
         .catch(e => console.error("Profile fetch error:", e));

      const fetchSettings = async () => {
         try {
            const [settingsRes, kegiatanRes, daerahRes, desaRes, kelRes] = await Promise.all([
               fetch("/api/settings"),
               fetch("/api/mandiri/kegiatan"),
               fetch("/api/public/mandiri/daerah"),
               fetch("/api/public/mandiri/desa?scope=all"),
               fetch("/api/public/mandiri/kelompok?scope=all")
            ]);
            const s = await settingsRes.json();
            const statusVal = s.mandiri_registration_status || "1";
            setRegStatus(statusVal);
            setIsClosed(statusVal === "0");
            setRegTitle(s.mandiri_registration_title || "");
            setRegDesc(s.mandiri_registration_description || "");
            setRegStatusPeserta(s.mandiri_registration_status_peserta || "Utusan Daerah");
            setRegGender(s.mandiri_registration_gender || "Semua");
            setRegQuota(s.mandiri_registration_quota || "0");
            setRegMinAgeLaki(s.mandiri_registration_min_age_laki || "");
            setRegMinAgePerempuan(s.mandiri_registration_min_age_perempuan || "");

            const kList = await kegiatanRes.json();
            if (Array.isArray(kList)) {
               setKegiatanList(kList);
               const activeId = s.mandiri_active_kegiatan_id || "";
               if (activeId) setSelectedKegiatanId(activeId);
               else if (kList.length > 0) setSelectedKegiatanId(kList[0].id);
            }

            const ds = await daerahRes.json();
            if (Array.isArray(ds)) setDaerahList(ds);
            const de = await desaRes.json();
            if (Array.isArray(de)) setDesaList(de);
            const kl = await kelRes.json();
            if (Array.isArray(kl)) setKelompokList(kl);

         } catch (e) {
            console.error("Failed to fetch unified settings:", e);
         }
      };
      fetchSettings();
   }, []);


   const handleSettings = async () => {
      // Fetch kegiatan list
      let kegiatanOptions = "";
      try {
         const res = await fetch("/api/mandiri/kegiatan");
         const kegiatanList = await res.json();
         if (Array.isArray(kegiatanList)) {
            kegiatanOptions = kegiatanList.map((k: any) => {
               const descSafe = (k.deskripsi || "").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;');
               return `<option value="${k.id}" data-judul="${k.judul}" data-desc="${descSafe}" ${regTitle === k.judul ? "selected" : ""}>${k.judul} (${k.kota})</option>`;
            }).join("");
         }
      } catch (e) {
         console.error("Gagal mengambil kegiatan:", e);
      }

      if (!kegiatanOptions) {
          kegiatanOptions = `<option value="">-- Belum ada kegiatan --</option>`;
      }

      const { value: formValues } = await Swal.fire({
         title: "Pengaturan Pendaftaran",
         html: `
        <div style="text-align: left">
          <label class="form-label">Nama Kegiatan / Judul Form</label>
          <select id="swal-title" class="form-control" style="margin-bottom: 12px; width: 100%; box-sizing: border-box;" onchange="document.getElementById('swal-desc').value = this.options[this.selectedIndex].getAttribute('data-desc') || ''">
             <option value="" data-desc="">-- Pilih Kegiatan --</option>
             ${kegiatanOptions}
          </select>
          <label class="form-label">Deskripsi Kegiatan</label>
          <textarea id="swal-desc" class="form-control" rows="3" placeholder="Contoh: Diikuti oleh seluruh usia mandiri..." style="margin-bottom: 12px; width: 100%; box-sizing: border-box;">${regDesc}</textarea>
          <label class="form-label">Status Pendaftaran</label>
          <select id="swal-status" class="form-control" style="margin-bottom: 12px; width: 100%; box-sizing: border-box;">
            <option value="1" ${regStatus === "1" ? "selected" : ""}>Buka Semua</option>
            <option value="tutup_utusan" ${regStatus === "tutup_utusan" ? "selected" : ""}>Tutup Utusan Daerah Saja</option>
            <option value="tutup_person" ${regStatus === "tutup_person" ? "selected" : ""}>Tutup Person Saja</option>
            <option value="0" ${regStatus === "0" ? "selected" : ""}>Tutup Semua</option>
          </select>
          <label class="form-label">Jenis Kelamin</label>
          <select id="swal-gender" class="form-control" style="margin-bottom: 12px; width: 100%; box-sizing: border-box;">
            <option value="Semua" ${regGender === "Semua" ? "selected" : ""}>Semua Jenis Kelamin</option>
            <option value="Laki-laki" ${regGender === "Laki-laki" ? "selected" : ""}>Laki-laki Saja</option>
            <option value="Perempuan" ${regGender === "Perempuan" ? "selected" : ""}>Perempuan Saja</option>
          </select>
          <label class="form-label">Batasan Peserta (Per Daerah)</label>
          <select id="swal-quota" class="form-control" style="margin-bottom: 12px; width: 100%; box-sizing: border-box;" onchange="document.getElementById('manual-quota-container').style.display = this.value === 'manual' ? 'block' : 'none'">
            <option value="0" ${regQuota === "0" ? "selected" : ""}>Unlimited (Tidak ada batasan)</option>
            ${[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(i => `<option value="${i}" ${regQuota === String(i) ? "selected" : ""}>${i} pasangan persetiap daerah (${i/2} laki-laki dan ${i/2} perempuan)</option>`).join('')}
            <option value="manual" ${!["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"].includes(regQuota) && regQuota !== "" ? "selected" : ""}>Tambahkan data input secara manual</option>
          </select>
          <div id="manual-quota-container" style="display: ${!["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"].includes(regQuota) && regQuota !== "" ? "block" : "none"}; margin-bottom: 12px">
             <label class="form-label">Masukkan Kuota Manual (Total Peserta per Daerah)</label>
             <input type="number" id="swal-manual-quota" class="form-control" placeholder="Contoh: 15" style="width: 100%; box-sizing: border-box;" value="${!["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"].includes(regQuota) && regQuota !== "" ? regQuota : ""}" />
          </div>
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
             <div style="flex: 1;">
                 <label class="form-label">Minimal Usia Laki-Laki</label>
                 <input type="number" id="swal-min-age-laki" class="form-control" style="width: 100%; box-sizing: border-box;" value="${regMinAgeLaki}" placeholder="Contoh: 20" />
             </div>
             <div style="flex: 1;">
                 <label class="form-label">Minimal Usia Perempuan</label>
                 <input type="number" id="swal-min-age-perempuan" class="form-control" style="width: 100%; box-sizing: border-box;" value="${regMinAgePerempuan}" placeholder="Contoh: 18" />
             </div>
          </div>
        </div>
      `,
         focusConfirm: false,
         showCancelButton: true,
         confirmButtonText: "Simpan",
         preConfirm: () => {
            const selectEl = document.getElementById("swal-title") as HTMLSelectElement;
            const selectedOption = selectEl.options[selectEl.selectedIndex];
            const titleText = selectedOption && selectEl.value !== "" ? (selectedOption.getAttribute("data-judul") || selectedOption.text) : "";
            
            const quotaSelect = (document.getElementById("swal-quota") as HTMLSelectElement).value;
            let finalQuota = quotaSelect;
            if (quotaSelect === "manual") {
                finalQuota = (document.getElementById("swal-manual-quota") as HTMLInputElement).value || "0";
            }

            return {
               id: selectEl.value,
               title: titleText,
               desc: (document.getElementById("swal-desc") as HTMLTextAreaElement).value,
               status: (document.getElementById("swal-status") as HTMLSelectElement).value,
               gender: (document.getElementById("swal-gender") as HTMLSelectElement).value,
               quota: finalQuota,
               minAgeLaki: (document.getElementById("swal-min-age-laki") as HTMLInputElement).value,
               minAgePerempuan: (document.getElementById("swal-min-age-perempuan") as HTMLInputElement).value
            };
         },
         footer: "Nama & deskripsi akan muncul di form publik"
      });

      if (formValues) {
         try {
            const updatePromises = [
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_title", value: formValues.title }),
               }),
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_description", value: formValues.desc }),
               }),
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_status", value: formValues.status }),
               }),
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_gender", value: formValues.gender }),
               }),
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_quota", value: formValues.quota }),
               }),
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_min_age_laki", value: formValues.minAgeLaki }),
               }),
               fetch("/api/mandiri/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ key: "mandiri_registration_min_age_perempuan", value: formValues.minAgePerempuan }),
               })
            ];

            // Also update active kegiatan id if an activity was selected
            if (formValues.id) {
               updatePromises.push(
                  fetch("/api/mandiri/settings", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ key: "mandiri_active_kegiatan_id", value: formValues.id }),
                  })
               );
            }

            await Promise.all(updatePromises);

            setRegTitle(formValues.title);
            setRegDesc(formValues.desc);
            setRegStatus(formValues.status);
            setRegGender(formValues.gender);
            setRegQuota(formValues.quota);
            setRegMinAgeLaki(formValues.minAgeLaki);
            setRegMinAgePerempuan(formValues.minAgePerempuan);
            setIsClosed(formValues.status === "0");
            if (formValues.id) setSelectedKegiatanId(formValues.id);
            Swal.fire({ icon: "success", title: "Berhasil disimpan", timer: 1000, showConfirmButton: false });
         } catch (e: any) {
            Swal.fire({ icon: "error", title: "Error", text: e.message });
         }
      }
   };

   const fetchData = useCallback(async () => {
      setLoading(true);
      try {
         const params = new URLSearchParams({
            search,
            page: String(page),
            limit: String(limit),
            sort: sort
         });
         if (selectedKegiatanId) params.set("kegiatanId", selectedKegiatanId);
         if (filterStatusPeserta && filterStatusPeserta !== "all") {
            params.set("statusPeserta", filterStatusPeserta);
         }
         params.set("_t", Date.now().toString());
         const res = await fetch(`/api/mandiri?${params}`);
         const json = await res.json();
         setData(json.data || []);
         setTotal(json.total || 0);
         if (json.counts) {
            setUtusanDaerahCount(json.counts.utusanDaerah || 0);
            setPersonCount(json.counts.person || 0);
            setPesertaAllCount(json.counts.pesertaAll || 0);
            setPanitiaAllCount(json.counts.panitiaAll || 0);
            setPesertaLCount(json.counts.pesertaL || 0);
            setPesertaPCount(json.counts.pesertaP || 0);
            setPanitiaLCount(json.counts.panitiaL || 0);
            setPanitiaPCount(json.counts.panitiaP || 0);
         }
      } catch (e) {
         console.error(e);
      } finally {
         setLoading(false);
      }
   }, [search, page, sort, selectedKegiatanId, filterStatusPeserta]);


   useEffect(() => {
      setPage(1);
   }, [search, sort, selectedKegiatanId, filterStatusPeserta]);


   useEffect(() => {
      fetchData();
   }, [fetchData]);


   const handleUpdate = (item: MandiriItem) => {
      let mDaerahId = item.mandiriDaerahId ? String(item.mandiriDaerahId) : "";
      let mDesaId = item.mandiriDesaId ? String(item.mandiriDesaId) : "";
      let mKelId = item.mandiriKelompokId ? String(item.mandiriKelompokId) : "";

      if (!mDesaId && item.desaNama && item.desaNama !== "N/A") {
         const matchedDesa = desaList.find(d => d.nama.toLowerCase() === item.desaNama.toLowerCase());
         if (matchedDesa) {
            mDesaId = String(matchedDesa.id);
            mDaerahId = String(matchedDesa.mandiriDaerahId || "");
            
            if (!mKelId && item.kelompokNama && item.kelompokNama !== "N/A") {
               const matchedKelompok = kelompokList.find(k => 
                  k.mandiriDesaId === matchedDesa.id && 
                  k.nama.toLowerCase() === item.kelompokNama?.toLowerCase()
               );
               if (matchedKelompok) {
                  mKelId = String(matchedKelompok.id);
               }
            }
         }
      }

      setEditForm({
         id: item.id,
         statusMandiri: item.statusMandiri || "Aktif",
         statusPeserta: item.statusPeserta || "Utusan Daerah",
         dibayarkanSenilai: item.dibayarkanSenilai ? String(item.dibayarkanSenilai) : "",
         catatan: item.catatan || "",
         resetDevice: false,
         nama: item.nama || "",
         foto: item.foto || "",
         nomorUrut: item.nomorUrut || 0,
         generusId: item.generusId || "",
         jenisKelamin: item.jenisKelamin || "L",
         noTelp: item.noTelp || "",
         tanggalLahir: item.tanggalLahir ? item.tanggalLahir.split('T')[0] : "",
         pekerjaan: item.pekerjaan || "",
         tempatLahir: item.tempatLahir || "",
         alamat: item.alamat || "",
         pendidikan: item.pendidikan || "",
         suku: item.suku || "",
         hobi: item.hobi || "",
         makananMinumanFavorit: item.makananMinumanFavorit || "",
         instagram: item.instagram || "",
         kriteriaPasangan: item.kriteriaPasangan || "",
         targetMenikah: item.targetMenikah || "",
         mandiriDaerahId: mDaerahId,
         mandiriDesaId: mDesaId,
         mandiriKelompokId: mKelId,
         buktiPembayaran: item.buktiPembayaran || "",
      });
      setEditModalOpen(true);
   };

   const submitEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         const payload = {
            id: editForm.id,
            generusId: editForm.generusId,
            statusMandiri: editForm.statusMandiri,
            statusPeserta: editForm.statusPeserta,
            dibayarkanSenilai: editForm.dibayarkanSenilai || null,
            catatan: editForm.catatan,
            resetDevice: editForm.resetDevice,
            nama: editForm.nama,
            foto: editForm.foto,
            noTelp: editForm.noTelp,
            jenisKelamin: editForm.jenisKelamin,
            tanggalLahir: editForm.tanggalLahir || null,
            pekerjaan: editForm.pekerjaan,
            kriteriaPasangan: editForm.kriteriaPasangan || null,
            targetMenikah: editForm.targetMenikah || null,
            mandiriDaerahId: editForm.mandiriDaerahId || null,
            mandiriDesaId: editForm.mandiriDesaId || null,
            mandiriKelompokId: editForm.mandiriKelompokId || null,
            buktiPembayaran: editForm.buktiPembayaran || null,
         };
         const res = await fetch("/api/mandiri", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });
         if (!res.ok) throw new Error("Gagal update data");
         Swal.fire({ icon: "success", title: "Berhasil", timer: 1000, showConfirmButton: false });
         setEditModalOpen(false);
         fetchData();
      } catch (e: any) {
         Swal.fire({ icon: "error", title: "Error", text: e.message });
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleDeleteAll = async () => {
      if (data.length === 0) {
         Swal.fire({ icon: "warning", title: "Data Kosong", text: "Tidak ada data peserta untuk dihapus." });
         return;
      }

      const res = await Swal.fire({
         title: "Hapus Semua Peserta & Panitia?",
         text: "Semua data registrasi dan akun peserta serta panitia untuk kegiatan ini akan dihapus secara permanen. Anda tidak dapat mengembalikan tindakan ini!",
         icon: "warning",
         showCancelButton: true,
         confirmButtonColor: "#ef4444",
         cancelButtonColor: "#64748b",
         confirmButtonText: "Ya, Hapus Semua!",
         cancelButtonText: "Batal"
      });

      if (res.isConfirmed) {
         try {
            const params = new URLSearchParams({ action: "deleteAll" });
            if (selectedKegiatanId) params.set("kegiatanId", selectedKegiatanId);
            
            const response = await fetch(`/api/mandiri?${params}`, { method: "DELETE" });
            if (response.ok) {
               Swal.fire({ icon: "success", title: "Terhapus!", text: "Semua data berhasil dihapus.", timer: 1500, showConfirmButton: false });
               fetchData();
            } else {
               const errorData = await response.json();
               throw new Error(errorData.error || "Gagal menghapus data");
            }
         } catch (e: any) {
            Swal.fire({ icon: "error", title: "Error", text: e.message });
         }
      }
   };

   const handleDelete = async (id: string, nama: string) => {
      const res = await Swal.fire({
         title: "Hapus Peserta?",
         text: `Apakah Anda yakin hapus dengan nama pengguna ${nama}?`,
         icon: "warning",
         showCancelButton: true,
         confirmButtonColor: "#ef4444",
         cancelButtonColor: "#64748b",
         confirmButtonText: "Ya, Hapus!",
      });

      if (res.isConfirmed) {
         await fetch(`/api/mandiri?id=${id}`, { method: "DELETE" });
         Swal.fire({ icon: "success", title: "Terhapus!", timer: 1500, showConfirmButton: false });
         fetchData();
      }
   };

   const handleTolak = async (id: string, nama: string) => {
      const res = await Swal.fire({
         title: "Tolak Pendaftaran?",
         text: `Apakah Anda yakin menolak dan menghapus pendaftaran atas nama ${nama}?`,
         icon: "warning",
         showCancelButton: true,
         confirmButtonColor: "#ef4444",
         cancelButtonColor: "#64748b",
         confirmButtonText: "Ya, Tolak!",
      });

      if (res.isConfirmed) {
         await fetch(`/api/mandiri?id=${id}`, { method: "DELETE" });
         Swal.fire({ icon: "success", title: "Ditolak!", timer: 1500, showConfirmButton: false });
         fetchData();
      }
   };

   const handleIzinkan = async (item: MandiriItem) => {
      const res = await Swal.fire({
         title: "Izinkan Peserta?",
         text: `Peserta atas nama ${item.nama} akan diubah statusnya menjadi Aktif.`,
         icon: "question",
         showCancelButton: true,
         confirmButtonColor: "#3d5a45",
         cancelButtonColor: "#64748b",
         confirmButtonText: "Ya, Izinkan!",
      });

      if (res.isConfirmed) {
         try {
            const bodyPayload = { id: item.id, statusMandiri: "Aktif", generusId: item.generusId };
            const response = await fetch("/api/mandiri", {
               method: "PUT",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(bodyPayload),
            });
            if (!response.ok) throw new Error("Gagal mengizinkan");
            Swal.fire({ icon: "success", title: "Berhasil Diizinkan!", timer: 1500, showConfirmButton: false });
            fetchData();
         } catch (e: any) {
            Swal.fire({ icon: "error", title: "Error", text: e.message });
         }
      }
   };

   const handleFixNomorUrut = async () => {
      const res = await Swal.fire({
         title: "Perbaiki Nomor Peserta?",
         text: "Peserta laki-laki akan berada di nomor 1-199, dan peserta perempuan di nomor 200 ke atas untuk kegiatan yang sedang dipilih.",
         icon: "question",
         showCancelButton: true,
         confirmButtonColor: "#3d5a45",
         cancelButtonColor: "#64748b",
         confirmButtonText: "Ya, Perbaiki",
         cancelButtonText: "Batal"
      });

      if (!res.isConfirmed) return;

      try {
         const response = await fetch("/api/mandiri/fix-nomor-urut", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kegiatanId: selectedKegiatanId }),
         });
         const result = await response.json();
         if (!response.ok) throw new Error(result.error || "Gagal memperbaiki nomor peserta");

         Swal.fire({
            icon: "success",
            title: "Nomor Peserta Diperbaiki",
            text: result.fixedCount > 0
               ? `${result.fixedCount} data peserta berhasil disesuaikan.`
               : "Semua nomor peserta sudah sesuai aturan.",
            timer: 1800,
            showConfirmButton: false
         });
         fetchData();
      } catch (e: any) {
         Swal.fire({ icon: "error", title: "Error", text: e.message });
      }
   };

   const handleExportExcel = async () => {
      try {
         const params = new URLSearchParams({ search, sort, page: "1", limit: "9999" });
         if (selectedKegiatanId) params.set("kegiatanId", selectedKegiatanId);


         if (filterStatusPeserta && filterStatusPeserta !== "all") {
            params.set("statusPeserta", filterStatusPeserta);
         }
         const res = await fetch(`/api/mandiri?${params}`);
         const json = await res.json();
         const rows: MandiriItem[] = Array.isArray(json.data) ? json.data : [];

         if (rows.length === 0) {
            Swal.fire({ icon: "warning", title: "Tidak Ada Data", text: "Tidak ada data peserta untuk diekspor." });
            return;
         }

         Swal.fire({
            title: 'Menyiapkan Export...',
            text: 'Mengunduh data dan foto, mohon tunggu.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
         });


         const workbook = new ExcelJS.Workbook();
         const worksheet = workbook.addWorksheet("Peserta Mandiri");

         worksheet.columns = [
            { header: "No. Peserta", key: "noPeserta", width: 12 },
            { header: "No. Unik", key: "noUnik", width: 15 },
            { header: "Nama", key: "nama", width: 25 },
            { header: "JK", key: "jk", width: 12 },
            { header: "Umur", key: "umur", width: 10 },
            { header: "Pekerjaan", key: "pekerjaan", width: 20 },
            { header: "Tempat Lahir", key: "tempatLahir", width: 20 },
            { header: "Pendidikan", key: "pendidikan", width: 15 },
            { header: "Suku", key: "suku", width: 15 },
            { header: "Hobi", key: "hobi", width: 25 },
            { header: "Makanan Favorit", key: "makananMinumanFavorit", width: 25 },
            { header: "Instagram", key: "instagram", width: 20 },
            { header: "Kriteria Pasangan", key: "kriteriaPasangan", width: 30 },
            { header: "Target Menikah", key: "targetMenikah", width: 15 },
            { header: "Alamat Lengkap", key: "alamat", width: 40 },
            { header: "Daerah", key: "daerah", width: 20 },
            { header: "Desa", key: "desa", width: 15 },
            { header: "Kelompok", key: "kelompok", width: 15 },
            { header: "Kehadiran", key: "kehadiran", width: 15 },
            { header: "Status Akun", key: "statusAkun", width: 15 },
            { header: "Status Peserta", key: "statusPeserta", width: 20 },
            { header: "Dibayarkan", key: "dibayarkan", width: 15 },
            { header: "Bukti Transfer", key: "foto", width: 60 },
            { header: "Catatan", key: "catatan", width: 25 },
         ];

         for (let i = 0; i < rows.length; i++) {
            const item = rows[i];
            const rowNumber = i + 2;
            const rowData = {
               noPeserta: item.nomorUrut ?? "-",
               noUnik: item.nomorUnik,
               foto: "",
               nama: item.nama,
               jk: item.jenisKelamin === "L" ? "Laki-laki" : "Perempuan",
               umur: hitungUmur(item.tanggalLahir),
               pekerjaan: item.pekerjaan || "-",
               tempatLahir: item.tempatLahir || "-",
               pendidikan: item.pendidikan || "-",
               suku: item.suku || "-",
               hobi: item.hobi || "-",
               makananMinumanFavorit: item.makananMinumanFavorit || "-",
               instagram: item.instagram || "-",
               kriteriaPasangan: item.kriteriaPasangan || "-",
               targetMenikah: item.targetMenikah || "-",
               alamat: item.alamat || "-",
               daerah: item.desaKota && item.desaKota !== "N/A" ? item.desaKota : "-",
               desa: item.desaNama && item.desaNama !== "N/A" ? item.desaNama : "-",
               kelompok: item.kelompokNama && item.kelompokNama !== "N/A" ? item.kelompokNama : "-",
               kehadiran: item.keterangan === "pulang" ? "Pulang" : item.isHadir === 1 ? "Hadir" : "Belum Hadir",
               statusAkun: item.statusMandiri,
               statusPeserta: item.statusPeserta || "Utusan Daerah",
               dibayarkan: item.statusPeserta === "Person" ? (item.dibayarkanSenilai ? `Rp ${Number(item.dibayarkanSenilai).toLocaleString("id-ID")}` : "-") : "Gratis",
               catatan: item.catatan || "-",
            };
            worksheet.addRow(rowData);
            worksheet.getRow(rowNumber).height = 250;

            if (item.buktiPembayaran) {
               try {
                  const photoUrl = item.buktiPembayaran.startsWith("http") ? item.buktiPembayaran : `${window.location.origin}${item.buktiPembayaran}`;
                  const imageData = await new Promise<{base64: string, width: number, height: number, colOffset: number, rowOffset: number} | null>((resolve) => {
                     const img = new Image();
                     img.crossOrigin = "Anonymous";
                     img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                           ctx.fillStyle = "#ffffff";
                           ctx.fillRect(0, 0, canvas.width, canvas.height);
                           ctx.drawImage(img, 0, 0);
                           const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                           
                           // Kalkulasi ukuran sel di Excel (perkiraan pixel)
                           const CELL_WIDTH_PX = 450;  // Untuk lebar kolom 60
                           const CELL_HEIGHT_PX = 333; // Untuk tinggi baris 250
                           const MAX_WIDTH = 410;
                           const MAX_HEIGHT = 310;
                           
                           // Sesuaikan skala gambar agar tidak melebihi MAX_WIDTH / MAX_HEIGHT
                           const ratio = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height);
                           const targetWidth = Math.max(10, Math.round(img.width * ratio));
                           const targetHeight = Math.max(10, Math.round(img.height * ratio));
                           
                           // Hitung offset agar gambar berada tepat di tengah-tengah sel
                           const colOffset = (CELL_WIDTH_PX - targetWidth) / 2 / CELL_WIDTH_PX;
                           const rowOffset = (CELL_HEIGHT_PX - targetHeight) / 2 / CELL_HEIGHT_PX;
                           
                           resolve({ 
                               base64: dataUrl.split(",")[1], 
                               width: targetWidth, 
                               height: targetHeight,
                               colOffset,
                               rowOffset
                           });
                        } else {
                           resolve(null);
                        }
                     };
                     img.onerror = () => resolve(null);
                     img.src = photoUrl;
                  });

                  if (imageData) {
                     const imageId = workbook.addImage({
                        base64: imageData.base64,
                        extension: "jpeg",
                     });
                     
                     worksheet.addImage(imageId, {
                        tl: { col: 13 + imageData.colOffset, row: (rowNumber - 1) + imageData.rowOffset },
                        ext: { width: imageData.width, height: imageData.height }
                     });
                  }
               } catch (err) {
                  console.error("Gagal memuat foto", item.buktiPembayaran, err);
               }
            }
         }

         const namaKegiatan = (regTitle || "Peserta_Mandiri").replace(/\s+/g, "_");
         const tanggal = new Date().toISOString().slice(0, 10);
         const suffix = filterStatusPeserta === "all" ? "" : `_${filterStatusPeserta.replace(/\s+/g, "")}`;
         const fileName = `${namaKegiatan}_${tanggal}${suffix}.xlsx`;

         const buffer = await workbook.xlsx.writeBuffer();
         const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
         
         const a = document.createElement("a");
         a.href = window.URL.createObjectURL(blob);
         a.download = fileName;
         a.click();
         window.URL.revokeObjectURL(a.href);

         Swal.close();
      } catch (e) {
         Swal.fire({ icon: "error", title: "Gagal", text: "Gagal mengekspor data ke Excel." });
      }
   };

   return (
      <div style={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
         <style dangerouslySetInnerHTML={{ __html: `
            .toolbar-container {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
                margin-bottom: 20px;
                background: #ffffff;
                padding: 14px;
                border-radius: 12px;
                border: 1px solid #e6dfd3;
                box-shadow: 0 4px 12px -2px rgba(23, 36, 27, 0.05);
             }
            @media (min-width: 900px) {
               .toolbar-container {
                  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
               }
            }
            .toolbar-btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                height: 38px;
                padding: 0 10px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s ease;
                border: 1px solid transparent;
                text-decoration: none;
                white-space: nowrap;
                overflow: hidden;
             }
            .toolbar-btn:active {
               transform: scale(0.98);
            }
            .toolbar-btn svg {
               width: 15px;
               height: 15px;
            }
            .toolbar-btn-success {
               background: #eef4f0;
               color: #26392d;
               border: 1px solid rgba(61, 90, 69, 0.35);
            }
            .toolbar-btn-success:hover {
               background: #e2ede5;
            }
            .toolbar-btn-danger-status {
               background: #fef2f2;
               color: #dc2626;
               border: 1px solid #fecaca;
            }
            .toolbar-btn-danger-status:hover {
               background: #fee2e2;
            }
            .toolbar-btn-secondary {
               background: #faf7f2;
               color: #26392d;
               border: 1px solid #e6dfd3;
            }
            .toolbar-btn-secondary:hover {
               background: #f4efe6;
               border-color: #c5a059;
            }
            .toolbar-btn-primary {
               background: #26392d;
               color: #ffffff;
               border: 1px solid #26392d;
            }
            .toolbar-btn-primary:hover {
               background: #3d5a45;
               border-color: #3d5a45;
            }
            .toolbar-btn-danger {
               background: #fff5f5;
               color: #dc2626;
               border: 1px solid #fecaca;
            }
            .toolbar-btn-danger:hover {
               background: #fee2e2;
            }

            /* Card header */
            .mandiri-card-header {
               display: flex;
               flex-direction: column;
               gap: 12px;
               padding: 16px;
               border-bottom: 1px solid #eee6d9;
            }
            .mandiri-header-row {
               display: flex;
               align-items: center;
               justify-content: space-between;
               gap: 10px;
               flex-wrap: wrap;
            }
            .filter-pill-scroll {
               display: flex;
               gap: 8px;
               flex-wrap: wrap;
               align-items: center;
            }
            .filter-pill-btn {
               display: inline-flex;
               align-items: center;
               gap: 6px;
               padding: 6px 12px;
               border-radius: 20px;
               border: 1px solid #e6dfd3;
               background: #ffffff;
               color: #5b6b60;
               font-size: 13px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.15s ease;
               white-space: nowrap;
            }
            .filter-pill-btn:hover {
               border-color: #c5a059;
               color: #26392d;
            }
            .filter-pill-btn.active {
               background: #26392d;
               border-color: #26392d;
               color: #ffffff;
            }
            .filter-pill-btn .pill-badge {
               background: #f4efe6;
               color: #5b6b60;
               padding: 1px 7px;
               border-radius: 10px;
               font-size: 11px;
               font-weight: 700;
            }
            .filter-pill-btn.active .pill-badge {
               background: rgba(255, 255, 255, 0.22);
               color: #ffffff;
            }
            .pill-divider {
               width: 1px;
               height: 22px;
               background: #e6dfd3;
               margin: 0 2px;
            }
            .mandiri-controls-row {
               display: flex;
               gap: 10px;
               align-items: center;
               flex-wrap: wrap;
               justify-content: space-between;
            }
            .mandiri-sort-group {
               display: inline-flex;
               gap: 6px;
            }
            .btn-sort-mandiri {
               display: inline-flex;
               align-items: center;
               gap: 4px;
               height: 36px;
               padding: 0 12px;
               border-radius: 8px;
               border: 1px solid #e6dfd3;
               background: #ffffff;
               color: #5b6b60;
               white-space: nowrap;
               font-size: 13px;
               font-weight: 600;
               cursor: pointer;
               transition: all 0.15s ease;
            }
            .btn-sort-mandiri:hover {
               border-color: #c5a059;
            }
            .btn-sort-mandiri.active {
               background: #26392d;
               border-color: #26392d;
               color: #ffffff;
            }
            .mandiri-search-wrap {
               position: relative;
               flex: 1;
               min-width: 180px;
               max-width: 320px;
            }
            .mandiri-search-icon {
               position: absolute;
               left: 12px;
               top: 50%;
               transform: translateY(-50%);
               width: 16px;
               height: 16px;
               color: #9aa89e;
               pointer-events: none;
            }
            .mandiri-search-input {
               width: 100%;
               height: 36px;
               padding: 0 12px 0 34px;
               border-radius: 8px;
               border: 1px solid #e6dfd3;
               background: #ffffff;
               font-size: 13px;
               color: #26392d;
               outline: none;
               transition: border-color 0.15s ease, box-shadow 0.15s ease;
            }
            .mandiri-search-input:focus {
               border-color: #c5a059;
               box-shadow: 0 0 0 3px rgba(197, 160, 89, 0.15);
            }
            @media (max-width: 640px) {
               .filter-pill-scroll {
                  flex-wrap: nowrap;
                  overflow-x: auto;
                  padding-bottom: 4px;
                  -webkit-overflow-scrolling: touch;
                  scrollbar-width: none;
               }
               .filter-pill-scroll::-webkit-scrollbar { display: none; }
               .mandiri-controls-row {
                  flex-wrap: nowrap;
               }
               .mandiri-search-wrap {
                  max-width: none;
               }
            }
         ` }} />
         <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <Topbar title={regTitle || "Usia Mandiri / Persiapan Nikah"} role={userRole} />

            <div className="page-content">

               {isClosed && (
                  <div style={{
                     background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "12px",
                     padding: "16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px",
                     color: "#b91c1c"
                  }}>
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24 }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                     </svg>
                     <div>
                        <h4 style={{ margin: 0, fontWeight: "700" }}>Pendaftaran Ditutup Manual</h4>
                        <p style={{ margin: 0, fontSize: "13px", opacity: 0.9 }}>
                           Pendaftaran mandiri saat ini ditutup oleh Admin. Calon peserta tidak dapat mengisi formulir pendaftaran.
                        </p>
                     </div>
                  </div>
               )}

               <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                  <div className="page-header-left">
                     <h2>{regTitle || "Pengelolaan Peserta Mandiri"}</h2>
                     <p>Kelola data peserta yang memasuki usia mandiri / persiapan nikah</p>
                  </div>
                  {!(userRole === "tim_pnkb" || userRole === "tim_pnkb_gambuh") && kegiatanList.length > 0 && (
                     <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <label style={{ fontWeight: 600, fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>Kegiatan:</label>
                        <select
                           className="form-control"
                           style={{ minWidth: 200, maxWidth: 320, height: 38 }}
                           value={selectedKegiatanId}
                           onChange={e => setSelectedKegiatanId(e.target.value)}
                        >
                           {kegiatanList.map(k => (
                              <option key={k.id} value={k.id}>{k.judul} ({k.kota})</option>
                           ))}
                        </select>
                     </div>
                  )}
               </div>

               <div className="toolbar-container">
                   {!(userRole === "tim_pnkb" || userRole === "tim_pnkb_gambuh") && (
                      <button
                         className={`toolbar-btn ${regStatus === "1" ? 'toolbar-btn-success' : 'toolbar-btn-danger-status'}`}
                         onClick={handleSettings}
                         title="Pengaturan Pendaftaran"
                      >
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                         </svg>
                         {regStatus === "1" ? "Pendaftaran Buka" : "Pendaftaran Tutup"}
                      </button>
                   )}
                   {!(userRole === "tim_pnkb" || userRole === "tim_pnkb_gambuh") && (
                      <button
                         className="toolbar-btn toolbar-btn-secondary"
                         onClick={() => {
                            const url = `${window.location.origin}/mandiri/daftar`;
                            navigator.clipboard.writeText(url);
                            Swal.fire({ icon: "success", title: "Link Disalin!", text: "Link pendaftaran mandiri berhasil disalin ke clipboard.", timer: 1500, showConfirmButton: false });
                         }}
                      >
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                         </svg>
                         Link Peserta Wajib
                      </button>
                   )}
                   {!(userRole === "tim_pnkb" || userRole === "tim_pnkb_gambuh") && (
                      <button
                         className="toolbar-btn toolbar-btn-secondary"
                         onClick={() => {
                            const url = `${window.location.origin}/mandiri/daftar?status=person`;
                            navigator.clipboard.writeText(url);
                            Swal.fire({ icon: "success", title: "Link Disalin!", text: "Link pendaftaran mandiri (Person) berhasil disalin ke clipboard.", timer: 1500, showConfirmButton: false });
                         }}
                      >
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                         </svg>
                         Link Person
                      </button>
                   )}
                   {!(userRole === "tim_pnkb" || userRole === "tim_pnkb_gambuh") && (
                      <button
                         className="toolbar-btn toolbar-btn-secondary"
                         onClick={handleFixNomorUrut}
                         title="Perbaiki nomor peserta sesuai jenis kelamin"
                      >
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
                            <path d="M3 21v-5h5" />
                         </svg>
                         Perbaiki Nomor
                      </button>
                   )}
                   {(userRole === "admin_romantic_room" || userRole === "admin" || userRole === "pengurus_daerah" || userRole === "kmm_daerah" || userRole === "tim_pnkb" || userRole === "tim_pnkb_gambuh") && (
                      <button
                         className="toolbar-btn toolbar-btn-primary"
                         onClick={handleExportExcel}
                         title="Export Data Peserta ke Excel"
                      >
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                         </svg>
                         Export Excel
                      </button>
                   )}
                   {!(userRole === "tim_pnkb" || userRole === "tim_pnkb_gambuh") && (
                      <button
                         className="toolbar-btn toolbar-btn-danger"
                         onClick={handleDeleteAll}
                         title="Hapus Semua Data Peserta"
                      >
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                         </svg>
                         Hapus Semua
                      </button>
                   )}
                </div>

               <div className="card">
                  <div className="mandiri-card-header">
                     <div className="mandiri-header-row">
                        <span className="card-title" style={{ marginBottom: 0 }}>Daftar Peserta ({total})</span>
                     </div>
                     <div className="filter-pill-scroll">
                        <button
                           className={`filter-pill-btn ${filterStatusPeserta === "all" ? "active" : ""}`}
                           onClick={() => setFilterStatusPeserta("all")}
                        >
                           Semua <span className="pill-badge">{utusanDaerahCount + personCount}</span>
                        </button>
                        <button
                           className={`filter-pill-btn ${filterStatusPeserta === "Utusan Daerah" ? "active" : ""}`}
                           onClick={() => setFilterStatusPeserta("Utusan Daerah")}
                        >
                           Utusan Daerah <span className="pill-badge">{utusanDaerahCount}</span>
                        </button>
                        <button
                           className={`filter-pill-btn ${filterStatusPeserta === "Person" ? "active" : ""}`}
                           onClick={() => setFilterStatusPeserta("Person")}
                        >
                           Person <span className="pill-badge">{personCount}</span>
                        </button>

                        <div className="pill-divider" />

                        <button
                           className={`filter-pill-btn ${filterStatusPeserta === "pesertaAll" ? "active" : ""}`}
                           onClick={() => setFilterStatusPeserta("pesertaAll")}
                        >
                           Peserta <span className="pill-badge">{pesertaAllCount}</span>
                        </button>
                        <button
                           className={`filter-pill-btn ${filterStatusPeserta === "pesertaL" ? "active" : ""}`}
                           onClick={() => setFilterStatusPeserta("pesertaL")}
                        >
                           Peserta (L) <span className="pill-badge">{pesertaLCount}</span>
                        </button>
                        <button
                           className={`filter-pill-btn ${filterStatusPeserta === "pesertaP" ? "active" : ""}`}
                           onClick={() => setFilterStatusPeserta("pesertaP")}
                        >
                           Peserta (P) <span className="pill-badge">{pesertaPCount}</span>
                        </button>

                        <div className="pill-divider" />

                        <button
                           className={`filter-pill-btn ${filterStatusPeserta === "panitiaAll" ? "active" : ""}`}
                           onClick={() => setFilterStatusPeserta("panitiaAll")}
                        >
                           Panitia <span className="pill-badge">{panitiaAllCount}</span>
                        </button>
                        <button
                           className={`filter-pill-btn ${filterStatusPeserta === "panitiaL" ? "active" : ""}`}
                           onClick={() => setFilterStatusPeserta("panitiaL")}
                        >
                           Panitia (L) <span className="pill-badge">{panitiaLCount}</span>
                        </button>
                        <button
                           className={`filter-pill-btn ${filterStatusPeserta === "panitiaP" ? "active" : ""}`}
                           onClick={() => setFilterStatusPeserta("panitiaP")}
                        >
                           Panitia (P) <span className="pill-badge">{panitiaPCount}</span>
                        </button>
                     </div>

                     <div className="mandiri-controls-row">
                        <div className="mandiri-sort-group">
                           <button 
                              className={`btn-sort-mandiri ${sort === 'asc' ? 'active' : ''}`} 
                              onClick={() => setSort(sort === 'asc' ? '' : 'asc')}
                              title="Urutkan No. Terkecil ke Terbesar"
                           >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                 <path d="M12 19V5M5 12l7-7 7 7" />
                              </svg>
                              1-9
                           </button>
                           <button 
                              className={`btn-sort-mandiri ${sort === 'desc' ? 'active' : ''}`} 
                              onClick={() => setSort(sort === 'desc' ? '' : 'desc')}
                              title="Urutkan No. Terbesar ke Terkecil"
                           >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                 <path d="M12 5v14M5 12l7 7 7-7" />
                              </svg>
                              9-1
                           </button>
                        </div>
                        <div className="mandiri-search-wrap">
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mandiri-search-icon">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                           </svg>
                           <input 
                              type="text" 
                              className="mandiri-search-input" 
                              placeholder="Cari nama, nomor unik, desa..." 
                              value={search} 
                              onChange={(e) => setSearch(e.target.value)} 
                           />
                        </div>
                     </div>
                  </div>

                  <div className="table-wrapper">
                     {loading && data.length === 0 ? (
                        <div className="loading"><div className="spinner" /></div>
                     ) : data.length === 0 ? (
                        <div className="empty-state" style={{ padding: "40px" }}>
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, opacity: 0.3 }}><path d="M12 2v20M2 12h20" /></svg>
                           <p>Belum ada peserta mandiri yang terdaftar.</p>
                        </div>
                     ) : (
                        <>
                           <div className="desktop-only-table">
                              <table>
                                 <thead>
                                    <tr>
                                       <th>No. Peserta</th>
                                       <th>No. Unik</th>
                                       <th>Foto</th>
                                       <th>Nama</th>
                                       <th>JK</th>
                                       <th>Umur</th>
                                       <th>Pekerjaan</th>
                                       <th>Daerah / Desa</th>
                                       <th>Kelompok</th>
                                       <th style={{ textAlign: "center" }}>Kehadiran</th>
                                       <th>Status Akun</th>
                                       <th>Status Peserta</th>
                                       <th>Dibayarkan Senilai</th>
                                       <th>Foto Bukti Bayar</th>
                                       <th>Catatan</th>
                                       <th>Target Menikah</th>
                                       {userRole !== "tim_pnkb_gambuh" && <th>Aksi</th>}
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {data.map((item) => (
                                       <tr key={item.id}>
                                          <td data-label="No. Peserta">
                                             <span style={{ fontWeight: "700", color: "var(--primary)" }}>{item.nomorUrut}</span>
                                          </td>
                                          <td data-label="No. Unik">
                                             <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: "700", color: "var(--primary)" }}>{item.nomorUnik}</span>
                                                <button 
                                                   onClick={() => {
                                                      navigator.clipboard.writeText(item.nomorUnik);
                                                      Swal.fire({ icon: "success", title: "Disalin!", text: `Nomor unik ${item.nomorUnik} berhasil disalin.`, timer: 1000, showConfirmButton: false });
                                                   }}
                                                   style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "inline-flex", alignItems: "center", color: "#64748b", borderRadius: "4px" }}
                                                   title="Salin Nomor Unik"
                                                   onMouseOver={(e) => e.currentTarget.style.background = "#f1f5f9"}
                                                   onMouseOut={(e) => e.currentTarget.style.background = "none"}
                                                >
                                                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
                                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                   </svg>
                                                </button>
                                             </div>
                                          </td>
                                          <td data-label="Foto">
                                             <div 
                                                style={{ width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, cursor: item.foto ? "zoom-in" : "default" }}
                                                onClick={() => {
                                                   if (item.foto) {
                                                      Swal.fire({
                                                         imageUrl: item.foto,
                                                         imageAlt: `Foto ${item.nama}`,
                                                         showConfirmButton: false,
                                                         showCloseButton: true,
                                                         width: "auto",
                                                         padding: "1rem"
                                                      });
                                                   }
                                                }}
                                             >
                                                {item.foto ? <img src={item.foto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : item.nama.charAt(0)}
                                             </div>
                                          </td>
                                          <td data-label="Nama" style={{ fontWeight: 500 }}>{item.nama}</td>
                                          <td data-label="JK">{item.jenisKelamin}</td>
                                          <td data-label="Umur">{hitungUmur(item.tanggalLahir)}</td>
                                          <td data-label="Pekerjaan">{item.pekerjaan || "-"}</td>
                                          <td data-label="Daerah / Desa" style={{ fontSize: 12, opacity: 0.8 }}>
                                             {item.desaKota && item.desaKota !== "N/A" ? item.desaKota : "-"} / {item.desaNama && item.desaNama !== "N/A" ? item.desaNama : "-"}
                                          </td>
                                          <td data-label="Kelompok" style={{ fontSize: 12, opacity: 0.8 }}>
                                             {item.kelompokNama && item.kelompokNama !== "N/A" ? item.kelompokNama : "-"}
                                          </td>
                                          <td data-label="Kehadiran" style={{ textAlign: "center" }}>
                                             {item.keterangan === "pulang" ? (
                                                <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>Pulang</span>
                                             ) : item.isHadir === 1 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                   <span className="badge badge-green">Hadir</span>
                                                   {item.waktuHadir && (
                                                      <span style={{ fontSize: '10px', opacity: 0.6 }}>
                                                         {new Date(item.waktuHadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                      </span>
                                                   )}
                                                </div>
                                             ) : (
                                                <span className="badge badge-gray">Belum Hadir</span>
                                             )}
                                          </td>
                                          <td data-label="Status Akun">
                                             <span className={`badge ${item.statusMandiri === "Aktif" ? "badge-blue" : "badge-gray"}`}>
                                                {item.statusMandiri}
                                             </span>
                                          </td>
                                          <td data-label="Status Peserta">
                                             <span className={`badge ${item.statusPeserta === "Person" ? "badge-purple" : "badge-blue"}`}>
                                                {item.statusPeserta || "Utusan Daerah"}
                                             </span>
                                          </td>
                                          <td data-label="Dibayarkan Senilai">
                                             {item.statusPeserta !== "Person" ? (
                                                <span className="badge badge-green">Gratis</span>
                                             ) : item.dibayarkanSenilai ? (
                                                <span style={{ fontWeight: 600, color: "#166534" }}>
                                                   Rp {Number(item.dibayarkanSenilai).toLocaleString("id-ID")}
                                                </span>
                                             ) : (
                                                <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>
                                             )}
                                          </td>
                                          <td data-label="Foto Bukti Bayar">
                                             {item.statusPeserta !== "Person" ? (
                                                <span className="badge badge-green">Gratis</span>
                                             ) : item.buktiPembayaran ? (
                                                <a href={item.buktiPembayaran} target="_blank" rel="noopener noreferrer" title="Lihat bukti pembayaran ukuran penuh">
                                                   <img
                                                      src={item.buktiPembayaran}
                                                      alt="Bukti Pembayaran"
                                                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0" }}
                                                   />
                                                </a>
                                             ) : (
                                                <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>
                                             )}
                                          </td>
                                          <td data-label="Catatan" style={{ fontSize: 12, maxWidth: "150px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                             {item.catatan || "gratis"}
                                          </td>
                                          <td data-label="Target Menikah">{item.targetMenikah || "-"}</td>
                                          {userRole !== "tim_pnkb_gambuh" && (
                                          <td data-label="Aksi">
                                             <div className="flex gap-2">
                                                {item.statusMandiri === "Menunggu" ? (
                                                   <>
                                                      <button className="btn btn-sm" style={{ backgroundColor: "#3d5a45", color: "white" }} onClick={() => handleIzinkan(item)}>Izinkan</button>
                                                      <button className="btn btn-sm btn-danger" onClick={() => handleTolak(item.id, item.nama)}>Tidak Izinkan</button>
                                                   </>
                                                ) : (
                                                   <>
                                                      <button className="btn btn-sm btn-secondary" onClick={() => handleUpdate(item)}>Edit</button>
                                                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id, item.nama)}>Hapus</button>
                                                   </>
                                                )}
                                             </div>
                                          </td>
                                          )}
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>

                           <div className="mobile-only-cards">
                              {data.map((item) => (
                                 <div key={item.id} className="mobile-card">
                                    <div className="card-top-row">
                                       <span className="no-urut-badge">#{item.nomorUrut}</span>
                                       <div className="unik-badge-container">
                                          <span className="unik-label">ID:</span>
                                          <span className="unik-value">{item.nomorUnik}</span>
                                          <button 
                                             onClick={() => {
                                                navigator.clipboard.writeText(item.nomorUnik);
                                                Swal.fire({ icon: "success", title: "Disalin!", text: `Nomor unik ${item.nomorUnik} berhasil disalin.`, timer: 1000, showConfirmButton: false });
                                             }}
                                             className="btn-copy-unik"
                                             title="Salin Nomor Unik"
                                          >
                                             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 12, height: 12 }}>
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                             </svg>
                                          </button>
                                       </div>
                                    </div>

                                    <div className="profile-row">
                                       <div 
                                          className="avatar-wrapper"
                                          style={{ cursor: item.foto ? "zoom-in" : "default" }}
                                          onClick={() => {
                                             if (item.foto) {
                                                Swal.fire({
                                                   imageUrl: item.foto,
                                                   imageAlt: `Foto ${item.nama}`,
                                                   showConfirmButton: false,
                                                   showCloseButton: true,
                                                   width: "auto",
                                                   padding: "1rem"
                                                });
                                             }
                                          }}
                                       >
                                          {item.foto ? (
                                             <img src={item.foto} alt={item.nama} className="avatar-img" />
                                          ) : (
                                             <span className="avatar-initial">{item.nama.charAt(0).toUpperCase()}</span>
                                          )}
                                       </div>
                                       <div className="profile-info">
                                          <h3 className="profile-name">{item.nama}</h3>
                                          <div className="profile-badges">
                                             <span className={`gender-badge ${item.jenisKelamin === 'L' ? 'male' : 'female'}`}>
                                                {item.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                                             </span>
                                             <span className="category-badge">{hitungUmur(item.tanggalLahir)}</span>
                                          </div>
                                       </div>
                                    </div>

                                    <div className="location-row">
                                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="loc-icon">
                                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                          <circle cx="12" cy="10" r="3" />
                                       </svg>
                                       <span className="location-text">
                                          {item.desaKota && item.desaKota !== "N/A" ? item.desaKota : "-"} / {item.desaNama && item.desaNama !== "N/A" ? item.desaNama : "-"}
                                          {item.kelompokNama && item.kelompokNama !== "N/A" ? ` / ${item.kelompokNama}` : ""}
                                       </span>
                                    </div>

                                    <div className="status-row">
                                       <div className="status-item">
                                          <span className="status-label">Pekerjaan</span>
                                          <span style={{ fontSize: 12 }}>{item.pekerjaan || "-"}</span>
                                       </div>

                                       <div className="status-item">
                                          <span className="status-label">Kehadiran</span>
                                          {item.keterangan === "pulang" ? (
                                             <span className="badge-red">Pulang</span>
                                          ) : item.isHadir === 1 ? (
                                             <div className="attendance-present">
                                                <span className="badge badge-green">Hadir</span>
                                                {item.waktuHadir && (
                                                   <span className="attendance-time">
                                                      {new Date(item.waktuHadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                   </span>
                                                )}
                                             </div>
                                          ) : (
                                             <span className="badge badge-gray">Belum Hadir</span>
                                          )}
                                       </div>

                                       <div className="status-item">
                                          <span className="status-label">Target Menikah</span>
                                          <span style={{ fontSize: 12 }}>{item.targetMenikah || "-"}</span>
                                       </div>

                                       <div className="status-item">
                                          <span className="status-label">Status Akun</span>
                                          <span className={`badge ${item.statusMandiri === "Aktif" ? "badge-blue" : "badge-gray"}`}>
                                             {item.statusMandiri}
                                          </span>
                                       </div>
                                       <div className="status-item">
                                          <span className="status-label">Status Peserta</span>
                                          <span className={`badge ${item.statusPeserta === "Person" ? "badge-purple" : "badge-blue"}`}>
                                             {item.statusPeserta || "Utusan Daerah"}
                                          </span>
                                       </div>
                                       <div className="status-item">
                                          <span className="status-label">Dibayarkan Senilai</span>
                                          {item.statusPeserta !== "Person" ? (
                                             <span className="badge badge-green">Gratis</span>
                                          ) : item.dibayarkanSenilai ? (
                                             <span style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>
                                                Rp {Number(item.dibayarkanSenilai).toLocaleString("id-ID")}
                                             </span>
                                          ) : (
                                             <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>
                                          )}
                                       </div>
                                       <div className="status-item">
                                          <span className="status-label">Foto Bukti Bayar</span>
                                          {item.statusPeserta !== "Person" ? (
                                             <span className="badge badge-green">Gratis</span>
                                          ) : item.buktiPembayaran ? (
                                             <a href={item.buktiPembayaran} target="_blank" rel="noopener noreferrer" title="Lihat bukti pembayaran ukuran penuh">
                                                <img
                                                   src={item.buktiPembayaran}
                                                   alt="Bukti Pembayaran"
                                                   style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0" }}
                                                />
                                             </a>
                                          ) : (
                                             <span style={{ color: "#94a3b8", fontSize: 12 }}>-</span>
                                          )}
                                       </div>
                                    </div>

                                    {item.catatan && (
                                       <div className="notes-box">
                                          <span className="notes-title">Catatan:</span>
                                          <p className="notes-content">{item.catatan}</p>
                                       </div>
                                    )}

                                    {userRole !== "tim_pnkb_gambuh" && (
                                    <div className="card-actions">
                                       {item.statusMandiri === "Menunggu" ? (
                                          <>
                                             <button className="btn btn-sm flex-grow" style={{ backgroundColor: "#3d5a45", color: "white" }} onClick={() => handleIzinkan(item)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, marginRight: 6 }}>
                                                   <path d="M20 6L9 17l-5-5" />
                                                </svg>
                                                Izinkan
                                             </button>
                                             <button className="btn btn-sm btn-danger-outline" onClick={() => handleTolak(item.id, item.nama)}>
                                                Tidak Izinkan
                                             </button>
                                          </>
                                       ) : (
                                          <>
                                             <button className="btn btn-sm btn-secondary flex-grow" onClick={() => handleUpdate(item)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, marginRight: 6 }}>
                                                   <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                   <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                                Edit Status
                                             </button>
                                             <button className="btn btn-sm btn-danger-outline" onClick={() => handleDelete(item.id, item.nama)}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                                   <polyline points="3 6 5 6 21 6" />
                                                   <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                             </button>
                                          </>
                                       )}
                                    </div>
                                    )}
                                 </div>
                              ))}
                           </div>
                        </>
                     )}
                  </div>

                  {total > limit && (
                     <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: "13px", color: "#64748b" }}>
                           Halaman {page} dari {Math.ceil(total / limit)}
                        </span>
                        <div style={{ display: "flex", gap: "5px" }}>
                           <button 
                              className="btn btn-sm btn-secondary" 
                              disabled={page === 1} 
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                           >
                              Prev
                           </button>
                           {/* Simple pagination: show max 5 page buttons */}
                           {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1)
                              .filter(p => p === 1 || p === Math.ceil(total / limit) || Math.abs(p - page) <= 1)
                              .map((p, i, arr) => (
                                 <div key={p} style={{ display: "flex", gap: "5px" }}>
                                    {i > 0 && p - arr[i-1] > 1 && <span style={{ alignSelf: "flex-end", color: "#cbd5e1" }}>...</span>}
                                    <button 
                                       className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`}
                                       onClick={() => setPage(p)}
                                    >
                                       {p}
                                    </button>
                                 </div>
                              ))
                           }
                           <button 
                              className="btn btn-sm btn-secondary" 
                              disabled={page === Math.ceil(total / limit)} 
                              onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                           >
                              Next
                           </button>
                        </div>
                     </div>
                  )}
               </div>

            </div>
         </div>

         {/* Edit Modal */}
         {editModalOpen && (
            <div
               style={{
                  position: "fixed",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  backdropFilter: "blur(4px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 9999,
               }}
            >
               <div
                  className="card animate-fade-in"
                  style={{
                     width: "100%",
                     maxWidth: "500px",
                     margin: "20px",
                     padding: "24px",
                     boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                     maxHeight: "90vh",
                     overflowY: "auto"
                  }}
               >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                     <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                        Update Status Akun
                     </h3>
                     <button 
                        onClick={() => setEditModalOpen(false)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
                     >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                           <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                     </button>
                  </div>
                  
                  <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                     <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "2px" }}>Peserta</div>
                     <div style={{ fontWeight: "700", color: "#0f172a" }}>{editForm.nama} <span style={{ color: "#94a3b8", fontWeight: "normal" }}>#{editForm.nomorUrut}</span></div>
                  </div>

                  <form onSubmit={submitEdit}>
                     {/* Data Diri Section */}
                     <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "16px" }}>1. Data Peserta</div>

                        <div className="form-group" style={{ marginBottom: "24px", textAlign: "center" }}>
                           <PhotoUpload
                              value={editForm.foto}
                              onChange={(url) => setEditForm((prev) => ({ ...prev, foto: url }))}
                              helperText="Maksimal 1 MB"
                           />
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                           <label className="form-label">Nama Lengkap</label>
                           <input
                              type="text"
                              className="form-control"
                              value={editForm.nama}
                              onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                              required
                           />
                        </div>

                        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Jenis Kelamin</label>
                              <select
                                 className="form-control"
                                 value={editForm.jenisKelamin}
                                 onChange={(e) => setEditForm({ ...editForm, jenisKelamin: e.target.value })}
                                 required
                              >
                                 <option value="L">Laki-laki</option>
                                 <option value="P">Perempuan</option>
                              </select>
                           </div>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Nomor WA</label>
                              <input
                                 type="text"
                                 className="form-control"
                                 value={editForm.noTelp}
                                 onChange={(e) => setEditForm({ ...editForm, noTelp: e.target.value })}
                              />
                           </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Tempat Lahir</label>
                              <input
                                 type="text"
                                 className="form-control"
                                 placeholder="Kota Kelahiran"
                                 value={editForm.tempatLahir || ""}
                                 onChange={(e) => setEditForm({ ...editForm, tempatLahir: e.target.value })}
                              />
                           </div>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Tanggal Lahir</label>
                              <input
                                 type="date"
                                 className="form-control"
                                 value={editForm.tanggalLahir || ""}
                                 onChange={(e) => setEditForm({ ...editForm, tanggalLahir: e.target.value })}
                              />
                           </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                           <label className="form-label">Pendidikan Terakhir <span style={{ color: "#ef4444" }}>*</span></label>
                           <input
                              type="text"
                              className="form-control"
                              placeholder="S1/SMA/dll"
                              value={editForm.pendidikan || ""}
                              onChange={(e) => setEditForm({ ...editForm, pendidikan: e.target.value })}
                              required
                           />
                        </div>
                        
                        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Pekerjaan <span style={{ color: "#ef4444" }}>*</span></label>
                              <input
                                 type="text"
                                 className="form-control"
                                 placeholder="Pekerjaan saat ini"
                                 value={editForm.pekerjaan || ""}
                                 onChange={(e) => setEditForm({ ...editForm, pekerjaan: e.target.value })}
                                 required
                              />
                           </div>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Suku <span style={{ color: "#ef4444" }}>*</span></label>
                              <input
                                 type="text"
                                 className="form-control"
                                 placeholder="Betawi / Jawa / dll"
                                 value={editForm.suku || ""}
                                 onChange={(e) => setEditForm({ ...editForm, suku: e.target.value })}
                                 required
                              />
                           </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Hobi <span style={{ color: "#ef4444" }}>*</span></label>
                              <input
                                 type="text"
                                 className="form-control"
                                 placeholder="Hobi anda"
                                 value={editForm.hobi || ""}
                                 onChange={(e) => setEditForm({ ...editForm, hobi: e.target.value })}
                                 required
                              />
                           </div>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Favorit Makanan/Minuman <span style={{ color: "#ef4444" }}>*</span></label>
                              <input
                                 type="text"
                                 className="form-control"
                                 placeholder="Sate / Jus / dll"
                                 value={editForm.makananMinumanFavorit || ""}
                                 onChange={(e) => setEditForm({ ...editForm, makananMinumanFavorit: e.target.value })}
                                 required
                              />
                           </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                           <label className="form-label">Kriteria Pasangan (Opsional)</label>
                           <textarea
                              className="form-control"
                              rows={3}
                              placeholder="Sebutkan kriteria pasangan yang Anda harapkan"
                              value={editForm.kriteriaPasangan || ""}
                              onChange={(e) => setEditForm({ ...editForm, kriteriaPasangan: e.target.value })}
                           />
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                           <label className="form-label">Akun Instagram (Opsional)</label>
                           <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                              <span style={{ position: "absolute", left: "10px", color: "#94a3b8" }}>@</span>
                              <input
                                 type="text"
                                 className="form-control"
                                 style={{ paddingLeft: "30px" }}
                                 placeholder="username_kamu"
                                 value={editForm.instagram || ""}
                                 onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                              />
                           </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                           <label className="form-label">Alamat Lengkap</label>
                           <textarea
                              className="form-control"
                              rows={3}
                              placeholder="Alamat saat ini (opsional)"
                              value={editForm.alamat || ""}
                              onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                           />
                        </div>
                     </div>

                     {/* Wilayah Section */}
                     <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "16px" }}>2. Wilayah / Asal</div>
                        
                        <div className="form-group" style={{ marginBottom: "16px" }}>
                           <label className="form-label">Daerah</label>
                           <select
                              className="form-control"
                              value={editForm.mandiriDaerahId}
                              onChange={(e) => setEditForm({ ...editForm, mandiriDaerahId: e.target.value, mandiriDesaId: "", mandiriKelompokId: "" })}
                           >
                              <option value="">-- Pilih Daerah --</option>
                              {daerahList.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                           </select>
                        </div>

                        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Desa</label>
                              <select
                                 className="form-control"
                                 value={editForm.mandiriDesaId}
                                 onChange={(e) => setEditForm({ ...editForm, mandiriDesaId: e.target.value, mandiriKelompokId: "" })}
                                 disabled={!editForm.mandiriDaerahId}
                              >
                                 <option value="">-- Pilih Desa --</option>
                                 {desaList.filter(d => d.mandiriDaerahId === Number(editForm.mandiriDaerahId)).map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
                              </select>
                           </div>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Kelompok</label>
                              <select
                                 className="form-control"
                                 value={editForm.mandiriKelompokId}
                                 onChange={(e) => setEditForm({ ...editForm, mandiriKelompokId: e.target.value })}
                                 disabled={!editForm.mandiriDesaId}
                              >
                                 <option value="">-- Pilih Kelompok --</option>
                                 {kelompokList.filter(k => k.mandiriDesaId === Number(editForm.mandiriDesaId)).map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                              </select>
                           </div>
                        </div>
                     </div>

                     {/* Status & Pembayaran Section */}
                     <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "16px" }}>3. Status & Pembayaran</div>
                        
                        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Status Akun</label>
                              <select
                                 className="form-control"
                                 value={editForm.statusMandiri}
                                 onChange={(e) => setEditForm({ ...editForm, statusMandiri: e.target.value })}
                              >
                                 <option value="Aktif">Aktif</option>
                                 <option value="Selesai">Selesai</option>
                                 <option value="Batal">Batal</option>
                              </select>
                           </div>

                           <div className="form-group" style={{ flex: 1 }}>
                              <label className="form-label">Status Peserta</label>
                              <select
                                 className="form-control"
                                 value={editForm.statusPeserta}
                                 onChange={(e) => setEditForm({ ...editForm, statusPeserta: e.target.value })}
                              >
                                 <option value="Utusan Daerah">Utusan Daerah</option>
                                 <option value="Person">Person</option>
                              </select>
                           </div>
                        </div>

                        {editForm.statusPeserta === "Person" && (
                           <>
                              <div className="form-group" style={{ marginBottom: "16px" }}>
                                 <label className="form-label">Dibayarkan Senilai (Rp)</label>
                                 <input
                                    type="number"
                                    className="form-control"
                                    placeholder="Contoh: 150000"
                                    value={editForm.dibayarkanSenilai}
                                    onChange={(e) => setEditForm({ ...editForm, dibayarkanSenilai: e.target.value })}
                                 />
                              </div>

                              <div className="form-group" style={{ marginBottom: "16px" }}>
                                 <label className="form-label">Kriteria Pasangan</label>
                                 <textarea
                                    className="form-control"
                                    value={editForm.kriteriaPasangan || ""}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, kriteriaPasangan: e.target.value }))}
                                 />
                              </div>

                              <div className="form-group" style={{ marginBottom: "16px" }}>
                                 <label className="form-label">Target Menikah</label>
                                 <select
                                    className="form-control"
                                    value={editForm.targetMenikah || ""}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, targetMenikah: e.target.value }))}
                                 >
                                    <option value="">-- Pilih Target Menikah --</option>
                                    {Array.from({ length: 15 }, (_, i) => 2026 + i).map(y => (
                                       <option key={y} value={String(y)}>{y}</option>
                                    ))}
                                 </select>
                              </div>

                              <hr style={{ margin: "24px 0", borderTop: "1px dashed #e2e8f0" }} />

                              <div className="form-group" style={{ marginBottom: "24px", textAlign: "center" }}>
                                 <label className="form-label" style={{ textAlign: "left", display: "block" }}>Foto Bukti Bayar</label>
                                 <PhotoUpload
                                    value={editForm.buktiPembayaran}
                                    onChange={(url) => setEditForm((prev) => ({ ...prev, buktiPembayaran: url }))}
                                    helperText="Maksimal 1 MB"
                                 />
                                 {editForm.buktiPembayaran && (
                                    <div style={{ marginTop: "12px" }}>
                                       <a 
                                          href={`/api/download?url=${encodeURIComponent(editForm.buktiPembayaran)}`}
                                          className="btn btn-sm btn-secondary" 
                                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                                       >
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                             <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                             <polyline points="7 10 12 15 17 10" />
                                             <line x1="12" y1="15" x2="12" y2="3" />
                                          </svg>
                                          Unduh Bukti Bayar
                                       </a>
                                       <a 
                                          href={editForm.buktiPembayaran}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn btn-sm btn-outline" 
                                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}
                                       >
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                             <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                          </svg>
                                          Lihat
                                       </a>
                                    </div>
                                 )}
                              </div>
                           </>
                        )}

                        <div className="form-group" style={{ marginBottom: "16px" }}>
                           <label className="form-label">Catatan</label>
                           <textarea
                              className="form-control"
                              rows={2}
                              placeholder="Catatan tambahan..."
                              value={editForm.catatan}
                              onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                           ></textarea>
                        </div>
                     </div>



                     <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                        <button
                           type="button"
                           onClick={() => setEditModalOpen(false)}
                           className="btn btn-outline"
                           style={{ margin: 0 }}
                           disabled={isSubmitting}
                        >
                           Batal
                        </button>
                        <button type="submit" className="btn btn-primary" style={{ margin: 0 }} disabled={isSubmitting}>
                           {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         <style jsx>{`
            .desktop-only-table {
               display: block;
               overflow-x: auto;
               -webkit-overflow-scrolling: touch;
            }
            .desktop-only-table table {
               min-width: 1500px;
            }
            .mobile-only-cards {
               display: none;
            }
            .badge-blue { background: #eef4f0; color: #26392d; }
            .badge-purple { background: #f7f0e2; color: #8a6d2f; }
            .badge-gray {
               background: #faf7f2;
               color: #5b6b60;
               padding: 4px 8px;
               border-radius: 6px;
               font-size: 11px;
               font-weight: 700;
            }
            .badge-green {
               background: #eef4f0;
               color: #3d5a45;
               padding: 4px 8px;
               border-radius: 6px;
               font-size: 11px;
               font-weight: 700;
            }
            table thead th {
               position: sticky;
               top: 0;
               background: #faf7f2;
               z-index: 10;
               box-shadow: 0 1px 0 #e6dfd3;
            }
            @media (max-width: 1024px) {
               .table-wrapper {
                  margin: 0 !important;
                  padding: 0 !important;
                  overflow: visible !important;
               }
               .desktop-only-table {
                  display: none;
               }
               .mobile-only-cards {
                  display: flex;
                  flex-direction: column;
                  gap: 14px;
                  padding: 4px 0;
               }
               .mobile-card {
                  background: #ffffff;
                  border: 1px solid #e6dfd3;
                  border-radius: 12px;
                  padding: 14px;
                  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03);
                  display: flex;
                  flex-direction: column;
                  gap: 12px;
                  transition: transform 0.2s, box-shadow 0.2s;
               }
               .mobile-card:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
               }
               .card-top-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1px solid #f4efe6;
                  padding-bottom: 8px;
               }
               .no-urut-badge {
                  background: #f4efe6;
                  color: #5b6b60;
                  font-weight: 700;
                  font-size: 12px;
                  padding: 4px 8px;
                  border-radius: 6px;
               }
               .unik-badge-container {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  background: #eef4f0;
                  border: 1px solid rgba(61, 90, 69, 0.25);
                  padding: 2px 8px;
                  border-radius: 6px;
               }
               .unik-label {
                  font-size: 10px;
                  font-weight: 600;
                  color: #3d5a45;
                  text-transform: uppercase;
               }
               .unik-value {
                  font-family: monospace;
                  font-size: 13px;
                  font-weight: 700;
                  color: #26392d;
               }
               .btn-copy-unik {
                  background: none;
                  border: none;
                  padding: 2px;
                  cursor: pointer;
                  color: #3d5a45;
                  display: inline-flex;
                  align-items: center;
                  border-radius: 4px;
               }
               .btn-copy-unik:hover {
                  background: #e2ede5;
               }
               .profile-row {
                  display: flex;
                  gap: 12px;
                  align-items: center;
               }
               .avatar-wrapper {
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  overflow: hidden;
                  background: #f4efe6;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid #e6dfd3;
                  flex-shrink: 0;
               }
               .avatar-img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
               }
               .avatar-initial {
                  font-size: 18px;
                  font-weight: 700;
                  color: #5b6b60;
               }
               .profile-info {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
               }
               .profile-name {
                  margin: 0;
                  font-size: 15px;
                  font-weight: 700;
                  color: #26392d;
               }
               .profile-badges {
                  display: flex;
                  gap: 6px;
                  flex-wrap: wrap;
               }
               .gender-badge {
                  font-size: 11px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 500;
               }
               .gender-badge.male {
                  background: #eef4f0;
                  color: #26392d;
               }
               .gender-badge.female {
                  background: #f7f0e2;
                  color: #8a6d2f;
               }
               .category-badge {
                  background: #f4efe6;
                  color: #5b6b60;
                  font-size: 11px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 500;
               }
               .location-row {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  color: #5b6b60;
                  font-size: 12.5px;
               }
               .loc-icon {
                  width: 14px;
                  height: 14px;
                  color: #9aa89e;
                  flex-shrink: 0;
               }
               .location-text {
                  font-weight: 500;
               }
               .status-row {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 12px;
                  background: #faf7f2;
                  padding: 10px;
                  border-radius: 10px;
               }
               .status-item {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
               }
               .status-label {
                  font-size: 10px;
                  font-weight: 600;
                  color: #9aa89e;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
               }
               .attendance-present {
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
               }
               .attendance-time {
                  font-size: 9.5px;
                  color: #5b6b60;
                  font-weight: 500;
                  padding-left: 2px;
               }
               .notes-box {
                  background: #fffbeb;
                  border: 1px dashed #fef3c7;
                  border-radius: 8px;
                  padding: 8px 12px;
               }
               .notes-title {
                  font-size: 10px;
                  font-weight: 700;
                  color: #b45309;
                  text-transform: uppercase;
                  display: block;
                  margin-bottom: 2px;
               }
               .notes-content {
                  margin: 0;
                  font-size: 12px;
                  color: #78350f;
                  line-height: 1.4;
               }
               .card-actions {
                  display: flex;
                  gap: 8px;
                  margin-top: 4px;
               }
               .mobile-card:hover {
                  transform: translateY(-1px);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
               }
               .card-top-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  border-bottom: 1px solid #f4efe6;
                  padding-bottom: 8px;
               }
               .no-urut-badge {
                  background: #f4efe6;
                  color: #5b6b60;
                  font-weight: 700;
                  font-size: 12px;
                  padding: 4px 8px;
                  border-radius: 6px;
               }
               .unik-badge-container {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  background: #eef4f0;
                  border: 1px solid rgba(61, 90, 69, 0.25);
                  padding: 2px 8px;
                  border-radius: 6px;
               }
               .unik-label {
                  font-size: 10px;
                  font-weight: 600;
                  color: #3d5a45;
                  text-transform: uppercase;
               }
               .unik-value {
                  font-family: monospace;
                  font-size: 13px;
                  font-weight: 700;
                  color: #26392d;
               }
               .btn-copy-unik {
                  background: none;
                  border: none;
                  padding: 2px;
                  cursor: pointer;
                  color: #3d5a45;
                  display: inline-flex;
                  align-items: center;
                  border-radius: 4px;
               }
               .btn-copy-unik:hover {
                  background: #e2ede5;
               }
               .profile-row {
                  display: flex;
                  gap: 12px;
                  align-items: center;
               }
               .avatar-wrapper {
                  width: 48px;
                  height: 48px;
                  border-radius: 50%;
                  overflow: hidden;
                  background: #f4efe6;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border: 2px solid #e6dfd3;
                  flex-shrink: 0;
               }
               .avatar-img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
               }
               .avatar-initial {
                  font-size: 18px;
                  font-weight: 700;
                  color: #5b6b60;
               }
               .profile-info {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
               }
               .profile-name {
                  margin: 0;
                  font-size: 15px;
                  font-weight: 700;
                  color: #26392d;
               }
               .profile-badges {
                  display: flex;
                  gap: 6px;
                  flex-wrap: wrap;
               }
               .gender-badge {
                  font-size: 11px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 500;
               }
               .gender-badge.male {
                  background: #eef4f0;
                  color: #26392d;
               }
               .gender-badge.female {
                  background: #f7f0e2;
                  color: #8a6d2f;
               }
               .category-badge {
                  background: #f4efe6;
                  color: #5b6b60;
                  font-size: 11px;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-weight: 500;
               }
               .location-row {
                  display: flex;
                  align-items: center;
                  gap: 6px;
                  color: #5b6b60;
                  font-size: 12.5px;
               }
               .loc-icon {
                  width: 14px;
                  height: 14px;
                  color: #9aa89e;
                  flex-shrink: 0;
               }
               .location-text {
                  font-weight: 500;
               }
               .status-row {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 12px;
                  background: #faf7f2;
                  padding: 10px;
                  border-radius: 10px;
               }
               .status-item {
                  display: flex;
                  flex-direction: column;
                  gap: 4px;
               }
               .status-label {
                  font-size: 10px;
                  font-weight: 600;
                  color: #9aa89e;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
               }
               .attendance-present {
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
               }
               .attendance-time {
                  font-size: 9.5px;
                  color: #5b6b60;
                  font-weight: 500;
                  padding-left: 2px;
               }
               .notes-box {
                  background: #fffbeb;
                  border: 1px dashed #fef3c7;
                  border-radius: 8px;
                  padding: 8px 12px;
               }
               .notes-title {
                  font-size: 10px;
                  font-weight: 700;
                  color: #b45309;
                  text-transform: uppercase;
                  display: block;
                  margin-bottom: 2px;
               }
               .notes-content {
                  margin: 0;
                  font-size: 12px;
                  color: #78350f;
                  line-height: 1.4;
               }
               .card-actions {
                  display: flex;
                  gap: 8px;
                  margin-top: 4px;
               }
               .flex-grow {
                  flex-grow: 1;
               }
               .btn-danger-outline {
                  background: #fff5f5;
                  border: 1px solid #fee2e2;
                  color: #ef4444;
                  padding: 6px 12px;
                  border-radius: 6px;
                  cursor: pointer;
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  transition: all 0.2s;
               }
               .btn-danger-outline:hover {
                  background: #fee2e2;
                  border-color: #fca5a5;
               }
               .badge-red {
                  background: #fee2e2;
                  color: #ef4444;
                  border: 1px solid #fca5a5;
                  padding: 3px 8px;
                  border-radius: 4px;
                  font-size: 11px;
                  font-weight: bold;
                  display: inline-block;
                  width: fit-content;
               }
               
               /* Make page header and card search-bar stack nicely on mobile */
               .page-header {
                  flex-direction: column;
                  align-items: stretch !important;
                  gap: 12px !important;
               }
               .page-header-left {
                  margin-bottom: 4px;
               }
               .page-header > div {
                  display: flex;
                  width: 100%;
                  gap: 8px;
                  flex-wrap: wrap;
               }
               .page-header > div > .btn {
                  flex: 1;
                  justify-content: center;
                  font-size: 13px;
                  padding: 8px 12px;
                  white-space: nowrap;
               }
               .card-header {
                  flex-direction: column;
                  align-items: stretch !important;
                  gap: 12px !important;
               }
               .card-header > div {
                  width: 100%;
                  justify-content: space-between;
               }
               .search-bar {
                  max-width: none !important;
                  flex-grow: 1;
               }
            }
         `}</style>
      </div>
   );
}

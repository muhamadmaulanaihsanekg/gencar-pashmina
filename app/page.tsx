"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import HomeHeader from "@/components/HomeHeader";
import HomeNavbar from "@/components/HomeNavbar";
import {
  Heart,
  UserPlus,
  ArrowRight,
  MapPin,
  Users,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Sparkles,
  HeartHandshake
} from "lucide-react";
import "./landing.css";

function FloralOrnament() {
  return (
    <svg viewBox="0 0 160 24" width="160" height="24" fill="none" aria-hidden="true">
      <path d="M10 12 H65 M95 12 H150" stroke="#c5a059" strokeWidth="1" strokeOpacity="0.6" />
      <circle cx="80" cy="12" r="3.5" fill="#c5a059" />
      <path d="M72 12 Q 76 6 80 12 Q 84 6 88 12 Q 84 18 80 12 Q 76 18 72 12 Z" fill="#c5a059" fillOpacity="0.4" />
      <circle cx="68" cy="12" r="1.5" fill="#c5a059" />
      <circle cx="92" cy="12" r="1.5" fill="#c5a059" />
    </svg>
  );
}

function TaarufPortalContent() {
  const [session, setSession] = useState<any>(null);
  const [heroLogoFailed, setHeroLogoFailed] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setSession(d);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="portal-root">
      <div className="arabesque-bg-layer" aria-hidden="true" />
      <HomeHeader session={session} />
      <HomeNavbar session={session} />

      <main>
        {/* ═══ SACRED MIHRAB ARCH HERO ═══ */}
        <section className="hero-section">
          <div className="hero-ambient-glow" />

          <div className="lp-wrap">
            <div className="mihrab-container">
              <div className="mihrab-frame">
                <div className="mihrab-inner-contour" />

                {/* Hanging Lantern Photorealistic Glow Assets */}
                <img
                  src="/img/lantern-glow.png"
                  alt=""
                  aria-hidden="true"
                  className="mihrab-lantern-asset-left"
                />
                <img
                  src="/img/lantern-glow.png"
                  alt=""
                  aria-hidden="true"
                  className="mihrab-lantern-asset-right"
                />

                {/* Floral Corner Accents */}
                <img
                  src="/img/floral-corner-sage.png"
                  alt=""
                  aria-hidden="true"
                  className="mihrab-floral-left"
                />
                <img
                  src="/img/floral-corner-sage.png"
                  alt=""
                  aria-hidden="true"
                  className="mihrab-floral-right"
                />

                {/* Top Arch Crest & Organization Badge */}
                <div className="mihrab-crest">
                  <div className="crest-badge">
                    <div className="crest-logo-wrap">
                      {!heroLogoFailed ? (
                        <img
                          src="/img/pashmina-logo.png?v=8"
                          alt="Pashmina 8.0"
                          className="crest-logo-img"
                          onError={() => setHeroLogoFailed(true)}
                        />
                      ) : (
                        <Sparkles size={20} className="text-amber-600" />
                      )}
                    </div>
                    <span className="crest-title">Program Resmi Usia Mandiri</span>
                  </div>
                </div>

                {/* Sacred Rings Crest */}
                <div className="taaruf-crest-wrap">
                  <img
                    src="/img/taaruf-rings-symbol.png"
                    alt="Simbol Ikatan Suci"
                    className="taaruf-crest-img"
                  />
                </div>

                {/* Edition Ribbon */}
                <div className="mihrab-edition">
                  <span className="edition-line" />
                  <span>PASMINA 8.0</span>
                  <span className="edition-line reverse" />
                </div>

                {/* Main Sacred Heading */}
                <h1 className="mihrab-heading">
                  Pertemuan Dua Hati Teriring Ridho Ilahi
                </h1>

                {/* Ornamental Gold Flourish */}
                <div className="mihrab-divider">
                  <FloralOrnament />
                </div>

                {/* Event Schedule & Location Pill */}
                <div className="mihrab-date-badge">
                  <div className="date-badge-item">
                    <Calendar size={15} className="text-amber-300" />
                    <span>25 Oktober 2026</span>
                  </div>
                  <span className="date-badge-dot">&bull;</span>
                  <div className="date-badge-item">
                    <MapPin size={15} className="text-amber-300" />
                    <span>Padepokan Asad, Jakarta Timur 2</span>
                  </div>
                </div>

                {/* Lead Narrative */}
                <p className="mihrab-lead">
                  Fasilitasi ta&apos;aruf terarah &amp; amanah bagi generasi mandiri. Sistem pendataan profil, penelusuran kriteria calon pendamping, dan pengelolaan ruang pertemuan ta&apos;aruf di bawah bimbingan dewan penasehat serta Tim Gambuh resmi.
                </p>

                {/* CTA Actions */}
                <div className="mihrab-actions">
                  <Link href="/mandiri/katalog" className="btn-royal-gold">
                    <Heart size={18} fill="#17241b" />
                    <span>Buka Katalog Peserta</span>
                    <ArrowRight size={16} />
                  </Link>

                  <Link href="/mandiri/daftar" className="btn-ivory-glass">
                    <UserPlus size={18} />
                    <span>Formulir Pendaftaran</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* ═══ 3 SACRED VALUE PILLARS ═══ */}
            <div className="pillars-grid">
              <div className="pillar-card">
                <div className="pillar-icon-wrap">
                  <MapPin size={22} />
                </div>
                <div>
                  <div className="pillar-label">Lokasi Penyelenggaraan</div>
                  <h3 className="pillar-title">Padepokan Asad &amp; Bilik Ta&apos;aruf</h3>
                  <p className="pillar-desc">
                    Fasilitas ruang pertemuan private &amp; nyaman, tertata rapi sesuai adab syar&apos;i tanpa khalwat.
                  </p>
                </div>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-wrap">
                  <Users size={22} />
                </div>
                <div>
                  <div className="pillar-label">Bimbingan &amp; Pengawalan</div>
                  <h3 className="pillar-title">Tim Gambuh &amp; Penasehat</h3>
                  <p className="pillar-desc">
                    Didampingi penuh oleh para sesepuh dan dewan penasehat berpengalaman dari perkenalan hingga khitbah.
                  </p>
                </div>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-wrap">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="pillar-label">Amanah &amp; Terverifikasi</div>
                  <h3 className="pillar-title">Validasi Data &amp; Restu Wali</h3>
                  <p className="pillar-desc">
                    Seluruh profil tervalidasi panitia daerah dan dalam sepengetahuan orang tua atau wali sah.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ ALUR IKHTIAR SUCI TA'ARUF ═══ */}
        <section className="narrative-journey-section">
          <div className="lp-wrap">
            <div className="narrative-journey-grid">
              {/* Visual Showcase */}
              <div className="narrative-visual-col">
                <div className="narrative-visual-frame">
                  <img
                    src="/img/taaruf-journey-scene.png"
                    alt="Bilik Pertemuan Ta'aruf Terbimbing di Padepokan Asad"
                    className="narrative-scene-img"
                  />
                  <div className="narrative-visual-overlay">
                    <div className="narrative-verse-badge">
                      <div className="verse-arabic-translation">
                        &ldquo;Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.&rdquo;
                      </div>
                      <div className="verse-ref">QS. Ar-Rum: 21 &middot; Menjemput Sakinah</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Narrative & Guided Steps */}
              <div className="narrative-content-col">
                <div className="section-pretitle">Alur Bimbingan Syar&apos;i</div>
                <h2 className="section-title-sacred">Ikhtiar Suci Menuju Mahligai Rumah Tangga</h2>
                <p className="section-desc-sacred">
                  Empat tahapan mulia yang dirancang terarah, amanah, dan beradab demi menjaga kesucian proses ta&apos;aruf hingga ke gerbang pernikahan.
                </p>

                <div className="narrative-steps-flow">
                  <div className="narrative-step-card">
                    <div className="narrative-step-number">01</div>
                    <div className="narrative-step-body">
                      <h4>Luruskan Niat &amp; Registrasi Mandiri</h4>
                      <p>
                        Memulai dengan niat ibadah yang tulus, melengkapi data profil serta kriteria diri secara jujur dan transparan.
                      </p>
                    </div>
                  </div>

                  <div className="narrative-step-card">
                    <div className="narrative-step-number">02</div>
                    <div className="narrative-step-body">
                      <h4>Kajian Profil &amp; Doa Istikharah</h4>
                      <p>
                        Meneliti keselarasan visi hidup berkeluarga melalui katalog terverifikasi dengan pertimbangan matang dan memohon petunjuk Allah.
                      </p>
                    </div>
                  </div>

                  <div className="narrative-step-card">
                    <div className="narrative-step-number">03</div>
                    <div className="narrative-step-body">
                      <h4>Tatap Muka Terbimbing (Bilik Ta&apos;aruf)</h4>
                      <p>
                        Dialog langsung di bilik khusus Padepokan Asad didampingi Tim Gambuh &amp; Penasehat resmi guna menghindarkan dari khalwat.
                      </p>
                    </div>
                  </div>

                  <div className="narrative-step-card">
                    <div className="narrative-step-number">04</div>
                    <div className="narrative-step-body">
                      <h4>Musyawarah Wali &amp; Menuju Janji Suci</h4>
                      <p>
                        Melanjutkan kecocokan hati ke jenjang restu orang tua dan keluarga besar menuju khitbah serta akad yang diridhoi Ilahi.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="narrative-actions-row">
                  <Link href="/mandiri/katalog" className="btn-royal-gold">
                    <Heart size={16} fill="#17241b" />
                    <span>Telusuri Katalog Peserta</span>
                    <ArrowRight size={15} />
                  </Link>
                  <Link href="/mandiri/daftar" className="btn-ivory-glass">
                    <UserPlus size={16} />
                    <span>Daftarkan Profil Anda</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ KETENTUAN ADAB & TATA TERTIB ═══ */}
        <section className="guidelines-section">
          <div className="lp-wrap">
            <div className="section-head-sacred">
              <div className="section-pretitle">Pilar Etika</div>
              <h2 className="section-title-sacred">Ketentuan &amp; Tata Tertib Ta&apos;aruf</h2>
              <p className="section-desc-sacred">
                Empat pilar utama yang wajib diindahkan seluruh peserta demi menjaga kesucian niat dan adab mulia.
              </p>
            </div>

            <div className="guidelines-grid">
              <div className="guideline-card-sacred">
                <div className="guideline-seal">01</div>
                <h4 className="guideline-title-sacred">Niat Ibadah Lillahi Ta&apos;ala</h4>
                <p className="guideline-body-sacred">
                  Menempuh jalan ta&apos;aruf semata-mata mencari keridhoan Allah Subhanahu wa Ta&apos;ala dan menyempurnakan separuh agama dengan cara terhormat.
                </p>
              </div>

              <div className="guideline-card-sacred">
                <div className="guideline-seal">02</div>
                <h4 className="guideline-title-sacred">Kerahasiaan Profil &amp; Amanah</h4>
                <p className="guideline-body-sacred">
                  Dilarang mendokumentasikan, mengambil tangkapan layar, atau menyebarluaskan biodata dan foto peserta kepada pihak yang tidak berkepentingan.
                </p>
              </div>

              <div className="guideline-card-sacred">
                <div className="guideline-seal">03</div>
                <h4 className="guideline-title-sacred">Wajib Didampingi Tim Gambuh</h4>
                <p className="guideline-body-sacred">
                  Setiap interaksi dialog tatap muka difasilitasi dalam ruang khusus bersama pendamping resmi guna menghindarkan dari fitnah dan khalwat.
                </p>
              </div>

              <div className="guideline-card-sacred">
                <div className="guideline-seal">04</div>
                <h4 className="guideline-title-sacred">Kejujuran &amp; Restu Wali</h4>
                <p className="guideline-body-sacred">
                  Menyampaikan informasi latar belakang pribadi secara jujur dan transparan serta mengutamakan restu orang tua atau wali dari kedua belah pihak.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ PESAN DOA & JAMINAN AMANAH ═══ */}
        <section className="blessing-callout-section">
          <div className="lp-wrap">
            <div className="blessing-card">
              <div className="blessing-crest">
                <HeartHandshake size={24} />
              </div>
              <h3 className="blessing-title">Menjemput Takdir Terbaik dengan Adab &amp; Tawakkal</h3>
              <p className="blessing-narrative">
                Pernikahan bukan sekadar mempertemukan dua insan, melainkan menyatukan dua keluarga dalam naungan ridho Allah Subhanahu wa Ta&apos;ala. Percayakan langkah ikhtiar Anda dalam wadah yang amanah, terjaga kerahasiaannya, dan senantiasa berpegang teguh pada tuntunan syariat.
              </p>

              <div className="blessing-pillars-row">
                <div className="blessing-pill">
                  <ShieldCheck size={16} />
                  <span>Kerahasiaan Profil &amp; Kontak Terjaga</span>
                </div>
                <div className="blessing-pill">
                  <Users size={16} />
                  <span>Didampingi Penuh Tim Gambuh &amp; Wali</span>
                </div>
                <div className="blessing-pill">
                  <Sparkles size={16} />
                  <span>Suasana Santun Tanpa Khalwat</span>
                </div>
              </div>

              <div>
                <Link href="/mandiri/daftar" className="blessing-action-btn">
                  <span>Mulai Langkah Ikhtiar Mandiri</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═══ MOBILE STICKY ACTION BAR ═══ */}
      <aside className="mobile-sticky-bar" aria-label="Aksi Cepat Mobile">
        <Link href="/mandiri/katalog" className="mobile-sticky-btn-primary">
          <Heart size={16} fill="currentColor" />
          <span>Katalog Peserta</span>
        </Link>
        <Link href="/mandiri/daftar" className="mobile-sticky-btn-secondary">
          <UserPlus size={16} />
          <span>Daftar</span>
        </Link>
      </aside>

      {/* ═══ FOOTER ═══ */}
      <footer className="site-footer">
        <div className="lp-wrap">
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} PASHMINA 8.0 &middot; Portal Resmi Ta&apos;aruf &amp; Usia Mandiri Generus Muda Cengkareng. Seluruh hak cipta dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ padding: "48px 20px", textAlign: "center", color: "#5e6d62" }}>Memuat Portal Ta&apos;aruf...</div>}>
      <TaarufPortalContent />
    </Suspense>
  );
}

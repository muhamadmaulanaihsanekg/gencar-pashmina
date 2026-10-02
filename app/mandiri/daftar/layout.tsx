import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pendaftaran Peserta Mandiri",
  description: "Formulir Pendaftaran Peserta Mandiri Pashmina 8.0",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

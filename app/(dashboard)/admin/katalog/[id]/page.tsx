import ClientView from "./ClientView";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page({ params }: { params: { id: string } }) {
  return <ClientView params={params} />;
}

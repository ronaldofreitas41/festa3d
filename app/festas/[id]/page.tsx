import EditorClient from "@/components/EditorClient";

export const metadata = { title: "Montar festa — Festa 3D" };

export default async function EditorPage(props: PageProps<"/festas/[id]">) {
  const { id } = await props.params;
  return <EditorClient id={id} />;
}

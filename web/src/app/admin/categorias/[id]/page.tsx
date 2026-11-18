"use client";
import { useParams } from "next/navigation";
import { GroupingEditor } from "@/components/admin/groupings";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <GroupingEditor key={id} kind="categoria" id={id} />;
}

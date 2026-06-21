import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Layout from "@/components/layout";
import { TimetablePage } from "@/components/timetable/TimetablePage";

export default async function TimetableEditorRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cookieStore = await cookies();
  const isAuthenticated = !!cookieStore.get("access_token")?.value;

  if (!isAuthenticated) {
    redirect("/login");
  }

  const { id } = await params;
  const { year } = await searchParams;
  const yearParam = typeof year === "string" ? year : null;
  const timetableId = parseInt(id, 10);

  if (isNaN(timetableId)) {
    redirect("/timetable");
  }

  return (
    <Layout>
      <TimetablePage timetableId={timetableId} yearParam={yearParam} />
    </Layout>
  );
}

import { PublicTimetableView } from "@/components/timetable/PublicTimetableView";

export default async function PublicTimetableRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen flex flex-col bg-md-surface">
      <PublicTimetableView token={token} />
    </div>
  );
}

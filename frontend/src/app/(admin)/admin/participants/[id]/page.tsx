import { AppRoute } from "@/components/layout/AppRoute";
export default async function AdminParticipantPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AppRoute page="admin-participant-detail" participantId={id} />; }

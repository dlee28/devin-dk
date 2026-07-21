// Routing shell: wires the thin KYC app into the Next.js router.
import CaseDetailPage from "@/apps/kyc/CaseDetailPage";

export default function Page({ params }: { params: { id: string } }) {
  return <CaseDetailPage caseId={params.id} />;
}

import { getGig } from '@/lib/google-calendar';
import EditGigForm from '@/components/EditGigForm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EditGigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gig = await getGig(id);

  return (
    <div className="max-w-lg">
      <Link
        href={`/gigs/${id}`}
        className="text-xs font-black uppercase hover:underline decoration-2 mb-8 block"
      >
        ← BACK
      </Link>
      <h1 className="text-4xl font-black uppercase tracking-tighter leading-none mb-2">
        {gig.artist}
      </h1>
      <p className="text-xs font-bold uppercase mb-8 text-gray-600 dark:text-gray-400">{gig.location}</p>
      <EditGigForm gig={gig} />
    </div>
  );
}

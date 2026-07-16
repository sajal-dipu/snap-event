import { PublicLayout } from "@/components/layout/PublicLayout";
import { photographerService } from "@/services/PhotographerService";
import { PublicProfileView } from "@/features/photographers/components/PublicProfileView";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const photographer = await photographerService.getById(id);
  
  if (!photographer) {
    return {
      title: "Photographer Not Found | SnapEvent",
      description: "The requested photographer profile could not be found."
    };
  }

  return {
    title: `${photographer.name} | Professional Photographer | SnapEvent`,
    description: photographer.bio || `View portfolio, starting prices at ₹${photographer.startingPrice}, and verified booking reviews for ${photographer.name}.`,
    openGraph: {
      title: `${photographer.name} Portfolio`,
      description: photographer.tagline || `Book verified photographer ${photographer.name} on SnapEvent.`,
      images: photographer.profileImage?.secureUrl ? [{ url: photographer.profileImage.secureUrl }] : []
    }
  };
}

export default async function PhotographerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const photographer = await photographerService.getById(id);

  if (!photographer) {
    notFound();
  }

  return (
    <PublicLayout>
      <PublicProfileView photographer={photographer} />
    </PublicLayout>
  );
}

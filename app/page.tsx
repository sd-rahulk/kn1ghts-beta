import { SiteExperience } from "@/components/SiteExperience";
import { getKnightsHomeData } from "@/data/knights";

export default async function Home() {
  const data = await getKnightsHomeData();
  return <SiteExperience data={data} />;
}

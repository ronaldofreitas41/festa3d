import HomeHero from "@/components/HomeHero";
import HomeSteps from "@/components/HomeSteps";

export default function Home() {
  return (
    <main>
      <HomeHero />
      <div className="container">
        <HomeSteps />
      </div>
    </main>
  );
}

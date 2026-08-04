import Logo from "../components/Logo";
import ContinueFromHereCard from "../components/ContinueFromHereCard";
import type { CurrentJourney } from "../domain/CurrentJourney";
import "./Home.css";

type HomeProps = {
  currentJourney: CurrentJourney;
};

export default function Home({
  currentJourney,
}: HomeProps) {
  return (
    <main className="home">
      <header className="home__header">
        <Logo />
      </header>

      <section className="home__content">
        <ContinueFromHereCard journey={currentJourney} />
      </section>
    </main>
  );
}
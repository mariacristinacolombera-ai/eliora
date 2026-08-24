import Logo from "../components/Logo";
import AreasSection from "../components/AreasSection";
import "./Home.css";

export default function Home() {
  return (
    <main className="home surface-paper">
      <header className="home__header">
        <Logo />
      </header>

      <section className="home__content">
  <AreasSection />
</section>
    </main>
  );
}
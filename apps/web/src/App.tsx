import Logo from "./components/Logo";
import ContinueFromHereCard from "./components/ContinueFromHereCard";
const currentRelationship = {
  title: "Pizza in teglia",
  lastStep: "Ieri hai messo l'impasto in frigorifero.",
  nextTime: "Oggi alle 16:30",
  nextStep: "Tira fuori l'impasto.",
};
export default function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f1e8",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "2rem",
        padding: "2rem",
      }}
    >
      <Logo />
      <ContinueFromHereCard relationship={currentRelationship} />
    </main>
  );
}
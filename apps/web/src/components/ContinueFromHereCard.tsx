import type { Relationship } from "../domain/Relationship";
type ContinueFromHereCardProps = {
  relationship: Relationship;
};

export default function ContinueFromHereCard({
  relationship,
}: ContinueFromHereCardProps) {
  return (
    <section>
      <p>Continua da qui</p>

      <h2>{relationship.title}</h2>

      <p>{relationship.lastStep}</p>

      <p>{relationship.nextTime}</p>

      <strong>{relationship.nextStep}</strong>

      <div>
        <button>Continua</button>
        <button>Apri</button>
      </div>
    </section>
  );
}
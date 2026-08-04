import type { CurrentJourney } from "../domain/CurrentJourney";
import "./ContinueFromHereCard.css";

const relationshipTypeLabels = {
  recipe: "Ricetta",
  project: "Progetto",
  care: "Cura",
  ritual: "Rituale",
};

function formatNextActionTime(nextActionAt: Date) {
  const now = new Date();

  const differenceInMilliseconds =
    nextActionAt.getTime() - now.getTime();

  const differenceInMinutes = Math.ceil(
    differenceInMilliseconds / 1000 / 60
  );

  if (differenceInMinutes <= 0) {
    return "È il momento di continuare";
  }

  if (differenceInMinutes < 60) {
    return `Tra ${differenceInMinutes} minuti`;
  }

  const differenceInHours = Math.ceil(
    differenceInMinutes / 60
  );

  if (differenceInHours < 24) {
    return `Tra circa ${differenceInHours} ore`;
  }

  return nextActionAt.toLocaleString("it-IT", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ContinueFromHereCardProps = {
  journey: CurrentJourney;
};

export default function ContinueFromHereCard({
journey,
}: ContinueFromHereCardProps) {
  return (
  <section className="continue-card">
    <p className="continue-card__eyebrow">Continua da qui</p>

    <p className="continue-card__type">
      {relationshipTypeLabels[journey.relationship.type]}
    </p>

    <h2 className="continue-card__title">
      {journey.relationship.title}
    </h2>

    <p className="continue-card__last-step">
      {journey.lastStep}
    </p>

    <div className="continue-card__next">
      <span className="continue-card__time">
        {formatNextActionTime(journey.nextActionAt)}
      </span>

      <strong>{journey.nextStep}</strong>
    </div>

    <div className="continue-card__actions">
      <button
        className="continue-card__button continue-card__button--primary"
      >
        Continua
      </button>

      <button
        className="continue-card__button continue-card__button--secondary"
      >
        Apri
      </button>
    </div>
  </section>
);
}
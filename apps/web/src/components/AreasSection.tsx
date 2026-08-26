import { useNavigate } from "react-router-dom";
import gesture from "../assets/eliora-gesture-apricot.svg";
import "./AreasSection.css";

const areas = [
  {
    id: "recipes",
    title: "Ricette",
    description: "Sapori, prove e ricordi da ritrovare.",
  },
  {
    id: "projects",
    title: "Progetti",
    description: "Idee che crescono tra le tue mani.",
  },
  {
    id: "care",
    title: "Cura",
    description: "Gesti dedicati a ciò che ami.",
  },
  {
    id: "rituals",
    title: "Rituali",
    description: "Piccoli spazi a cui tornare.",
  },
];

export default function AreasSection() {
  const navigate = useNavigate();

  return (
    <section className="areas" aria-labelledby="areas-title">
  <img
    className="areas__gesture"
    src={gesture}
    alt=""
    aria-hidden="true"
  />

  <header className="areas__header">
        <h2 id="areas-title" className="areas__title">
          Di cosa hai bisogno in questo momento?
        </h2>
        
        <p className="areas__eyebrow">I tuoi spazi</p>

        
      </header>

      <div className="areas__grid">
        {areas.map((area) => (
          <button
            className="areas__card"
            key={area.id}
            type="button"
            onClick={() => {
              if (area.id === "recipes") {
                navigate("/recipes");
              }
            }}
          >
            <span className="areas__card-title">
              {area.title}
            </span>

            <span className="areas__card-description">
              {area.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
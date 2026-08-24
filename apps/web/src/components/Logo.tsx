import logo from "../assets/eliora-logo-primary.svg";
import "./Logo.css";

export default function Logo() {
  return (
    <img
      className="logo"
      src={logo}
      alt="Eliora"
    />
  );
}
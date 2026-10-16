import logoBds from '../assets/logo_bds.svg'
import './Navbar.css'

export function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <img src={logoBds} alt="Logo BDS" className="logo" />
          <span className="navbar-title">Interpromos 2026</span>
        </div>
        <ul className="navbar-links">
          <li><a href="/">Accueil</a></li>
          <li><a href="/planning">Planning</a></li>
          <li><a href="/classement">Classement</a></li>
          <li><a href="/equipes">Équipes</a></li>
        </ul>
      </div>
    </nav>
  )
}

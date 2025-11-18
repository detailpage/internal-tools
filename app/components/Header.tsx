'use client'

export default function Header() {
  return (
    <header id="header" className="header" role="banner" aria-label="Site header">
      <nav className="navbar navbar-dark bg-primary navbar-expand-lg" id="navbar-main">
        <div className="navbar-brand-wrapper">
          <a href="/" className="navbar-brand">
            <img
              src="https://raw.githubusercontent.com/ryan-detailpage/logo_repo/main/dplogo.png"
              alt="DetailPage"
              className="img-fluid"
              style={{height: '30px', width: 'auto'}}
            />
          </a>
        </div>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#CollapsingNavbar"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse justify-content-end" id="CollapsingNavbar">
          <ul className="nav flex-row">
            <li className="nav-item">
              <a href="/reports" className="nav-link">Amazon Insights</a>
            </li>
            <li className="nav-item">
              <a href="/optimized-content" className="nav-link active">Search Optimization</a>
            </li>
            <li className="nav-item">
              <a href="/user/edit" className="nav-link">Account</a>
            </li>
            <li className="nav-item">
              <a href="mailto:customer-support@detailpage.com" className="nav-link">Support</a>
            </li>
            <li className="nav-item">
              <a href="/user/logout" className="nav-link">Logout</a>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  )
}

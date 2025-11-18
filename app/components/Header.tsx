'use client'

export default function Header() {
  return (
    <nav className="navbar navbar-expand-lg header">
      <div className="container-fluid">
        <a href="/" className="navbar-brand">
          <img src="https://insights.detailpage.com/themes/custom/detailpage_base/dpLogo.png" alt="DetailPage" />
        </a>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <a className="nav-link active" href="/" title="Client Tools">
                <i className="fas fa-tools"></i> Client Tools
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="https://insights.detailpage.com/reports" target="_blank" rel="noopener noreferrer" title="Amazon Insights">
                <i className="fas fa-chart-line"></i> Amazon Insights
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="https://insights.detailpage.com/optimized-content" target="_blank" rel="noopener noreferrer" title="Search Optimization">
                <i className="fas fa-list"></i> Search Optimization
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="https://insights.detailpage.com/user/edit" target="_blank" rel="noopener noreferrer" title="Account">
                <i className="fas fa-user-circle"></i> Account
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}

// navbar-loader.js - Updated
async function loadNavbar() {
    try {
        if (document.querySelector('.top-navbar')) return;
        const response = await fetch('/navbar.html');
        if (!response.ok) throw new Error('Navbar not found');
        const navbarHtml = await response.text();
        document.body.insertAdjacentHTML('afterbegin', navbarHtml);
    } catch (error) {
        console.error('Navbar load failed:', error);
        document.body.insertAdjacentHTML('afterbegin', `
            <nav style="background:#fff; padding:12px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e8ecf1;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:28px;">🏴‍☠️</span>
                    <h2 style="font-size:18px;">POP</h2>
                </div>
                <a href="login.html" style="background:#e94560; color:white; padding:8px 20px; border-radius:30px; text-decoration:none;">Sign In</a>
            </nav>
        `);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
    loadNavbar();
}
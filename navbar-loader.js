// navbar-loader.js
async function loadNavbar() {
    try {
        const response = await fetch('/navbar.html');
        const navbarHtml = await response.text();
        document.body.insertAdjacentHTML('afterbegin', navbarHtml);
        
        // Active page class add করুন
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            }
        });
        
        // Mobile menu functionality
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navLinks = document.getElementById('navLinks');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                navLinks.classList.toggle('show');
            });
        }
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.top-navbar') && navLinks?.classList.contains('show')) {
                navLinks.classList.remove('show');
            }
        });
        
        // Logout functionality
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (typeof supabase !== 'undefined') {
                    await supabase.auth.signOut();
                }
                localStorage.clear();
                window.location.href = 'index.html';
            });
        }
        
    } catch (error) {
        console.error('Navbar load failed:', error);
    }
}

// DOM লোড হলে navbar load করুন
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
    loadNavbar();
}
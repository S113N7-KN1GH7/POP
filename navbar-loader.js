// navbar-loader.js - Updated version
async function loadNavbar() {
    try {
        // Check if navbar already exists
        if (document.querySelector('.top-navbar')) return;
        
        const response = await fetch('/navbar.html');
        if (!response.ok) throw new Error('Navbar not found');
        const navbarHtml = await response.text();
        document.body.insertAdjacentHTML('afterbegin', navbarHtml);
        
        // Re-initialize navbar functionality
        initNavbarFeatures();
        
    } catch (error) {
        console.error('Navbar load failed:', error);
        // Fallback navbar
        document.body.insertAdjacentHTML('afterbegin', `
            <nav class="top-navbar" style="background:#fff; padding:15px 20px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e8ecf1;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:28px;">🏴‍☠️</span>
                    <h2 style="font-size:18px;">PIRATES OF PITCH</h2>
                </div>
                <div>
                    <a href="index.html" style="color:#e94560; margin:0 10px;">Home</a>
                    <a href="login.html" style="color:#e94560;">Login</a>
                </div>
            </nav>
        `);
    }
}

function initNavbarFeatures() {
    // Active page highlight
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
    
    // Mobile menu
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.top-navbar') && navLinks?.classList.contains('show')) {
                navLinks.classList.remove('show');
            }
        });
    }
    
    // Auth UI update
    async function updateAuthUI() {
        const authContainer = document.getElementById('authButtons');
        if (!authContainer) return;
        
        try {
            if (typeof supabase === 'undefined' || !supabase.auth) {
                authContainer.innerHTML = `
                    <a href="login.html" class="login-nav-btn"><i class="fas fa-sign-in-alt"></i> Login</a>
                    <a href="signup.html" class="signup-nav-btn"><i class="fas fa-user-plus"></i> Sign Up</a>
                `;
                return;
            }
            
            const { data: { user }, error } = await supabase.auth.getUser();
            
            if (user && !error) {
                let playerName = user.user_metadata?.player_name || user.email.split('@')[0];
                let avatarUrl = `https://ui-avatars.com/api/?background=e94560&color=fff&bold=true&size=32&name=${encodeURIComponent(playerName)}`;
                
                try {
                    const { data: player } = await supabase
                        .from('players')
                        .select('photo, player_name')
                        .eq('id', user.id)
                        .single();
                    if (player?.photo) avatarUrl = player.photo;
                    if (player?.player_name) playerName = player.player_name;
                } catch(e) {}
                
                authContainer.innerHTML = `
                    <div class="user-info">
                        <img class="user-avatar" src="${avatarUrl}" alt="${playerName}">
                        <span class="user-name">${playerName.substring(0, 15)}</span>
                        <button id="navbarLogoutBtn" class="logout-nav-btn"><i class="fas fa-sign-out-alt"></i> <span>Logout</span></button>
                    </div>
                `;
                
                document.getElementById('navbarLogoutBtn')?.addEventListener('click', async () => {
                    await supabase.auth.signOut();
                    localStorage.removeItem('pop123_user');
                    localStorage.removeItem('pop123_club');
                    window.location.href = 'index.html';
                });
            } else {
                authContainer.innerHTML = `
                    <a href="login.html" class="login-nav-btn"><i class="fas fa-sign-in-alt"></i> <span>Login</span></a>
                    <a href="signup.html" class="signup-nav-btn"><i class="fas fa-user-plus"></i> <span>Sign Up</span></a>
                    <a href="club-login.html" class="login-nav-btn"><i class="fas fa-building"></i> <span>Club</span></a>
                `;
            }
        } catch (err) {
            authContainer.innerHTML = `
                <a href="login.html" class="login-nav-btn"><i class="fas fa-sign-in-alt"></i> Login</a>
                <a href="signup.html" class="signup-nav-btn"><i class="fas fa-user-plus"></i> Sign Up</a>
            `;
        }
    }
    
    updateAuthUI();
    
    // Listen for auth state changes
    if (typeof supabase !== 'undefined') {
        supabase.auth.onAuthStateChange(() => {
            updateAuthUI();
        });
    }
}

// Load navbar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
    loadNavbar();
}
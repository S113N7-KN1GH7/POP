
// =============================================
// DASHBOARD.JS - POP123 Pirates of Pitch
// Complete Dashboard JavaScript
// =============================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
const supabaseUrl = 'https://uwybeitqpnaqmcmqwbkv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eWJlaXRxcG5hcW1jbXF3Ymt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODA0NDUsImV4cCI6MjA5Mjk1NjQ0NX0.EEleJhKLpGgWEppaSYCSQTP_swHDUHZ3ciycuBHUO8g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =============================================
// SESSION MANAGER CLASS
// =============================================
class SessionManager {
    static async checkSession() {
        const localUser = localStorage.getItem('pop123_user');
        
        if (!localUser) {
            this.redirectToLogin();
            return false;
        }
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError || !refreshData.user) {
                this.clearSession();
                this.redirectToLogin();
                return false;
            } else {
                localStorage.setItem('pop123_user', JSON.stringify(refreshData.user));
                return true;
            }
        }
        
        return true;
    }
    
    static clearSession() {
        localStorage.removeItem('pop123_user');
        localStorage.removeItem('supabase_session');
    }
    
    static redirectToLogin() {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
    
    static async logout() {
        await supabase.auth.signOut();
        this.clearSession();
        window.location.href = 'index.html';
    }
}

// =============================================
// DASHBOARD CONTROLLER
// =============================================
class DashboardController {
    constructor() {
        this.user = null;
        this.player = null;
    }
    
    async init() {
        const sessionValid = await SessionManager.checkSession();
        if (!sessionValid) return;
        
        await this.loadUserData();
        await this.loadPlayerStats();
        await this.loadRecentMatches();
        this.setupEventListeners();
    }
    
    async loadUserData() {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            SessionManager.redirectToLogin();
            return;
        }
        
        this.user = user;
        
        // Update UI with user info
        document.getElementById('playerName').innerText = user.user_metadata?.player_name || user.email.split('@')[0];
        document.getElementById('displayName').innerText = user.user_metadata?.player_name || user.email.split('@')[0];
        document.getElementById('playerEmail').innerText = user.email;
    }
    
    async loadPlayerStats() {
        const { data: player, error } = await supabase
            .from('players')
            .select('*')
            .eq('id', this.user.id)
            .single();
        
        if (error) {
            console.error('Error loading player stats:', error);
            return;
        }
        
        this.player = player;
        this.updateStatsUI(player);
        this.updateGamingInfoUI(player);
        await this.updatePlayerRank();
    }
    
    updateStatsUI(player) {
        // Basic stats
        document.getElementById('wins').innerText = player.win || 0;
        document.getElementById('losses').innerText = player.loss || 0;
        document.getElementById('draws').innerText = player.draw || 0;
        document.getElementById('points').innerText = player.pts || 0;
        
        // Goal stats
        const gf = player.gf || 0;
        const ga = player.ga || 0;
        const gd = gf - ga;
        
        document.getElementById('gf').innerText = gf;
        document.getElementById('ga').innerText = ga;
        
        const gdElement = document.getElementById('gd');
        gdElement.innerText = gd >= 0 ? `+${gd}` : gd;
        gdElement.className = `gd-value ${gd >= 0 ? 'positive' : 'negative'}`;
        
        // Total matches
        const totalMatches = (player.win || 0) + (player.loss || 0) + (player.draw || 0);
        document.getElementById('totalMatches').innerText = totalMatches;
        
        // Win rate
        const winRate = totalMatches > 0 ? ((player.win / totalMatches) * 100).toFixed(1) : 0;
        document.getElementById('winRate').innerText = winRate + '%';
        
        // Goal progress (GF / (GF + GA) * 100)
        const totalGoals = gf + ga;
        const goalProgress = totalGoals > 0 ? (gf / totalGoals) * 100 : 0;
        document.getElementById('goalProgress').style.width = goalProgress + '%';
        
        // Profile images
        if (player.photo) {
            document.getElementById('profilePhoto').src = player.photo;
        }
        if (player.cover_photo) {
            document.getElementById('coverPhoto').src = player.cover_photo;
        } else {
            document.getElementById('coverPhoto').src = 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200';
        }
    }
    
    updateGamingInfoUI(player) {
        if (player.konami_user_id) {
            document.getElementById('konamiId').innerText = player.konami_user_id;
        }
        if (player.device_name) {
            document.getElementById('deviceName').innerText = player.device_name;
        }
        if (player.number) {
            document.getElementById('playerPhone').innerText = player.number;
        }
        if (player.fb_id_link) {
            document.getElementById('fbLink').innerHTML = `<a href="${player.fb_id_link}" target="_blank" style="color:#45A29E;">View Profile <i class="fas fa-external-link-alt"></i></a>`;
        }
        if (player.created_at) {
            const date = new Date(player.created_at);
            document.getElementById('joinedDate').innerText = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }
    
    async updatePlayerRank() {
        const { data: ranked, error } = await supabase
            .from('players')
            .select('player_name, pts')
            .order('pts', { ascending: false });
        
        if (!error && ranked) {
            const rank = ranked.findIndex(p => p.player_name === this.player.player_name) + 1;
            const rankNumber = rank > 0 ? rank : ranked.length + 1;
            document.getElementById('playerRank').innerText = '#' + rankNumber;
            
            // Add rank badge color based on position
            const rankBadge = document.querySelector('.rank-badge');
            if (rankNumber === 1) {
                rankBadge.style.borderColor = '#FFD700';
            } else if (rankNumber <= 3) {
                rankBadge.style.borderColor = '#C0C0C0';
            } else if (rankNumber <= 10) {
                rankBadge.style.borderColor = '#CD7F32';
            }
        }
    }
    
    async loadRecentMatches() {
        const { data: matches, error } = await supabase
            .from('matches')
            .select('*')
            .or(`player1_id.eq.${this.user.id},player2_id.eq.${this.user.id}`)
            .order('match_date', { ascending: false })
            .limit(10);
        
        const container = document.getElementById('recentMatches');
        
        if (error || !matches || matches.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-futbol" style="font-size: 40px; opacity: 0.3;"></i>
                    <p style="margin-top: 10px;">No matches played yet</p>
                    <p style="font-size: 12px; color: #45A29E;">Start your journey today!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = matches.map(match => {
            const isWinner = match.winner_id === this.user.id;
            const player1Score = match.player1_score || 0;
            const player2Score = match.player2_score || 0;
            const score = `${player1Score} - ${player2Score}`;
            const matchDate = new Date(match.match_date);
            const timeAgo = this.getTimeAgo(matchDate);
            
            return `
                <div class="match-item">
                    <span class="match-result ${isWinner ? 'win' : 'loss'}">
                        <i class="fas ${isWinner ? 'fa-trophy' : 'fa-skull'}"></i>
                        ${isWinner ? 'VICTORY' : 'DEFEAT'}
                    </span>
                    <span class="match-score">${score}</span>
                    <span class="match-date" title="${matchDate.toLocaleString()}">
                        <i class="far fa-clock"></i> ${timeAgo}
                    </span>
                </div>
            `;
        }).join('');
    }
    
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }
    
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => SessionManager.logout());
        }
        
        // Profile button
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showProfileModal();
            });
        }
        
        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSettingsModal();
            });
        }
    }
    
    showProfileModal() {
        // You can implement a profile edit modal here
        alert('Profile edit feature coming soon!');
    }
    
    showSettingsModal() {
        // You can implement settings modal here
        alert('Settings feature coming soon!');
    }
}

// =============================================
// INITIALIZE DASHBOARD
// =============================================
const dashboard = new DashboardController();
dashboard.init();

// =============================================
// AUTO REFRESH DATA (Every 30 seconds)
// =============================================
setInterval(async () => {
    await dashboard.loadPlayerStats();
    await dashboard.loadRecentMatches();
}, 30000);


import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Supabase Configuration
const supabaseUrl = 'https://uwybeitqpnaqmcmqwbkv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eWJlaXRxcG5hcW1jbXF3Ymt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODA0NDUsImV4cCI6MjA5Mjk1NjQ0NX0.EEleJhKLpGgWEppaSYCSQTP_swHDUHZ3ciycuBHUO8g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Global variables for uploaded images
let uploadedProfileUrl = null;
let uploadedCoverUrl = null;

// ============ FILE UPLOAD HANDLERS ============
function setupFileUpload() {
    // Profile Photo Upload
    const profileInput = document.getElementById('profile_photo');
    const profileBox = document.getElementById('profileUploadBox');
    
    if (profileInput) {
        profileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await uploadImage(file, 'profile');
            }
        });
        
        // Drag and drop for profile
        profileBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            profileBox.classList.add('drag-over');
        });
        
        profileBox.addEventListener('dragleave', () => {
            profileBox.classList.remove('drag-over');
        });
        
        profileBox.addEventListener('drop', async (e) => {
            e.preventDefault();
            profileBox.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                await uploadImage(file, 'profile');
            }
        });
    }
    
    // Cover Photo Upload
    const coverInput = document.getElementById('cover_photo');
    const coverBox = document.getElementById('coverUploadBox');
    
    if (coverInput) {
        coverInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await uploadImage(file, 'cover');
            }
        });
        
        coverBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            coverBox.classList.add('drag-over');
        });
        
        coverBox.addEventListener('dragleave', () => {
            coverBox.classList.remove('drag-over');
        });
        
        coverBox.addEventListener('drop', async (e) => {
            e.preventDefault();
            coverBox.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                await uploadImage(file, 'cover');
            }
        });
    }
}

async function uploadImage(file, type) {
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showError('Image must be less than 5MB');
        return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showError('Please upload an image file');
        return;
    }
    
    // Show loading
    const previewDiv = document.getElementById(`${type}Preview`);
    previewDiv.innerHTML = '<div class="spinner"></div>';
    
    try {
        // Create unique file name
        const timestamp = Date.now();
        const fileName = `${type}_${timestamp}_${file.name}`;
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('player-photos')
            .upload(`temp/${fileName}`, file);
        
        if (error) throw error;
        
        // Get public URL
        const { data: publicUrl } = supabase.storage
            .from('player-photos')
            .getPublicUrl(`temp/${fileName}`);
        
        const imageUrl = publicUrl.publicUrl;
        
        // Save URL based on type
        if (type === 'profile') {
            uploadedProfileUrl = imageUrl;
        } else {
            uploadedCoverUrl = imageUrl;
        }
        
        // Show preview
        previewDiv.innerHTML = `
            <img src="${imageUrl}" alt="${type} preview">
            <div class="preview-actions">
                <button onclick="removeImage('${type}')">Remove</button>
            </div>
        `;
        
    } catch (error) {
        console.error('Upload error:', error);
        showError('Failed to upload image. Please try again.');
        previewDiv.innerHTML = '';
    }
}

window.removeImage = (type) => {
    if (type === 'profile') {
        uploadedProfileUrl = null;
        document.getElementById('profilePreview').innerHTML = '';
        document.getElementById('profile_photo').value = '';
    } else {
        uploadedCoverUrl = null;
        document.getElementById('coverPreview').innerHTML = '';
        document.getElementById('cover_photo').value = '';
    }
};

// ============ SIGNUP FUNCTION ============
if (document.getElementById('signupForm')) {
    setupFileUpload();
    
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get form values
        const player_name = document.getElementById('player_name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const fb_id_link = document.getElementById('fb_id_link').value || null;
        const number = document.getElementById('number').value || null;
        const konami_user_id = document.getElementById('konami_user_id').value || null;
        const device_name = document.getElementById('device_name').value || null;
        
        // Validation
        if (password !== confirmPassword) {
            showError("❌ Passwords don't match!");
            return;
        }
        
        if (password.length < 6) {
            showError("❌ Password must be at least 6 characters!");
            return;
        }
        
        if (player_name.length < 3) {
            showError("❌ Player name must be at least 3 characters!");
            return;
        }
        
        if (!device_name) {
            showError("❌ Please enter your device/mobile name!");
            return;
        }
        
        const submitBtn = document.querySelector('.auth-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating Account...';
        submitBtn.disabled = true;
        
        try {
            // 1. Create Auth User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        player_name: player_name,
                        device_name: device_name
                    }
                }
            });
            
            if (authError) throw authError;
            
            // 2. Insert into players table
            const { error: insertError } = await supabase
                .from('players')
                .insert([{
                    id: authData.user.id,
                    player_name: player_name,
                    email: email,
                    fb_id_link: fb_id_link,
                    photo: uploadedProfileUrl,
                    cover_photo: uploadedCoverUrl,
                    number: number,
                    konami_user_id: konami_user_id,
                    device_name: device_name,
                    win: 0,
                    loss: 0,
                    draw: 0,
                    gf: 0,
                    ga: 0,
                    pts: 0,
                    created_at: new Date(),
                    updated_at: new Date()
                }]);
            
            if (insertError) throw insertError;
            
            alert('✅ Registration Successful! Please login.');
            window.location.href = 'login.html';
            
        } catch (error) {
            console.error('Signup error:', error);
            showError(error.message || "Registration failed. Please try again.");
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ============ LOGIN FUNCTION ============
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const submitBtn = document.querySelector('.auth-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';
        submitBtn.disabled = true;
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            showError(error.message);
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        } else {
            localStorage.setItem('pop123_user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        }
    });
}

// ============ DASHBOARD FUNCTION ============
if (window.location.pathname.includes('dashboard.html')) {
    loadDashboard();
}

async function loadDashboard() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'login.html';
        return;
    }
    
    const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (playerError && playerError.code === 'PGRST116') {
        await supabase.from('players').insert([{
            id: user.id,
            player_name: user.user_metadata?.player_name || 'Pirate',
            email: user.email,
            device_name: user.user_metadata?.device_name || 'Not specified',
            win: 0, loss: 0, draw: 0, gf: 0, ga: 0, pts: 0
        }]);
        loadDashboard();
        return;
    }
    
    if (player) {
        document.getElementById('playerName').innerText = player.player_name;
        document.getElementById('playerEmail').innerText = player.email;
        document.getElementById('wins').innerText = player.win || 0;
        document.getElementById('losses').innerText = player.loss || 0;
        document.getElementById('draws').innerText = player.draw || 0;
        document.getElementById('points').innerText = player.pts || 0;
        document.getElementById('gf').innerText = player.gf || 0;
        document.getElementById('ga').innerText = player.ga || 0;
        
        const gd = (player.gf || 0) - (player.ga || 0);
        const gdElement = document.getElementById('gd');
        gdElement.innerText = gd;
        gdElement.classList.add(gd >= 0 ? 'positive' : 'negative');
        
        const totalMatches = (player.win || 0) + (player.loss || 0) + (player.draw || 0);
        document.getElementById('totalMatches').innerText = totalMatches;
        
        if (player.konami_user_id) {
            document.getElementById('konamiId').innerText = player.konami_user_id;
        }
        if (player.device_name) {
            document.getElementById('deviceName').innerText = player.device_name;
        }
        if (player.number) {
            document.getElementById('playerPhone').innerText = player.number;
        }
        if (player.photo) {
            document.getElementById('profilePhoto').src = player.photo;
        }
        if (player.cover_photo) {
            document.getElementById('coverPhoto').src = player.cover_photo;
        }
    }
}

// ============ LOGOUT ============
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('pop123_user');
        window.location.href = 'index.html';
    });
}

function showError(message) {
    const errorDiv = document.getElementById('errorMsg');
    if (errorDiv) {
        errorDiv.innerText = message;
        setTimeout(() => { errorDiv.innerText = ''; }, 5000);
    }
}
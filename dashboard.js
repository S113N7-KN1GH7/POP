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
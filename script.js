import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ============ YOUR SUPABASE CONFIGURATION ============
const supabaseUrl = 'https://uwybeitqpnaqmcmqwbkv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3eWJlaXRxcG5hcW1jbXF3Ymt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODA0NDUsImV4cCI6MjA5Mjk1NjQ0NX0.EEleJhKLpGgWEppaSYCSQTP_swHDUHZ3ciycuBHUO8g';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============ CHECK IF USER IS LOGGED IN ============
async function checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        const currentPage = window.location.pathname;
        if (!currentPage.includes('login.html') && !currentPage.includes('signup.html') && !currentPage.includes('index.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }
    return user;
}

// ============ LOGIN FUNCTION ============
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const submitBtn = document.querySelector('#loginForm button');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Logging in...';
        submitBtn.disabled = true;
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) {
            document.getElementById('errorMsg').innerText = error.message;
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        } else {
            localStorage.setItem('pop123_user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        }
    });
}

// ============ SIGNUP FUNCTION ============
if (document.getElementById('signupForm')) {
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (password !== confirmPassword) {
            document.getElementById('errorMsg').innerText = "❌ Passwords don't match!";
            return;
        }
        
        if (password.length < 6) {
            document.getElementById('errorMsg').innerText = "❌ Password must be at least 6 characters!";
            return;
        }
        
        if (username.length < 3) {
            document.getElementById('errorMsg').innerText = "❌ Username must be at least 3 characters!";
            return;
        }
        
        const submitBtn = document.querySelector('#signupForm button');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Creating account...';
        submitBtn.disabled = true;
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        });
        
        if (error) {
            document.getElementById('errorMsg').innerText = "❌ " + error.message;
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        } else {
            const { error: profileError } = await supabase
                .from('players')
                .insert([{ 
                    id: data.user.id,
                    email: email, 
                    username: username,
                    total_matches: 0,
                    wins: 0,
                    points: 0,
                    created_at: new Date()
                }]);
            
            if (profileError) {
                console.error('Profile error:', profileError);
                document.getElementById('errorMsg').innerText = "❌ Account created but profile setup failed. Please try logging in.";
            } else {
                alert('✅ Account created successfully! Please login.');
                window.location.href = 'login.html';
            }
        }
    });
}

// ============ DASHBOARD FUNCTIONS ============
if (window.location.pathname.includes('dashboard.html')) {
    loadDashboard();
}

async function loadDashboard() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'login.html';
        return;
    }
    
    if (document.getElementById('userEmail')) {
        document.getElementById('userEmail').innerText = user.email;
    }
    
    let { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (playerError && playerError.code === 'PGRST116') {
        const { error: insertError } = await supabase
            .from('players')
            .insert([{
                id: user.id,
                email: user.email,
                username: user.user_metadata?.username || user.email.split('@')[0],
                total_matches: 0,
                wins: 0,
                points: 0
            }]);
        
        if (!insertError) {
            const { data: newPlayer } = await supabase
                .from('players')
                .select('*')
                .eq('id', user.id)
                .single();
            player = newPlayer;
        }
    }
    
    if (player) {
        if (document.getElementById('username')) document.getElementById('username').innerText = player.username;
        if (document.getElementById('totalMatches')) document.getElementById('totalMatches').innerText = player.total_matches || 0;
        if (document.getElementById('wins')) document.getElementById('wins').innerText = player.wins || 0;
        if (document.getElementById('points')) document.getElementById('points').innerText = player.points || 0;
        
        const winRate = player.total_matches > 0 
            ? ((player.wins / player.total_matches) * 100).toFixed(1) 
            : 0;
        if (document.getElementById('winRate')) document.getElementById('winRate').innerText = winRate + '%';
    }
}

// ============ LEADERBOARD FUNCTION ============
if (window.location.pathname.includes('leaderboard.html')) {
    loadLeaderboard();
}

async function loadLeaderboard() {
    const { data: players, error } = await supabase
        .from('players')
        .select('username, points, wins, total_matches')
        .order('points', { ascending: false })
        .limit(20);
    
    if (error) {
        console.error('Leaderboard error:', error);
        return;
    }
    
    const tbody = document.getElementById('leaderboardBody');
    if (tbody) {
        tbody.innerHTML = '';
        players.forEach((player, index) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>🏴‍☠️ ${player.username}</td>
                <td>${player.points || 0}</td>
                <td>${player.wins || 0}</td>
                <td>${player.total_matches || 0}</td>
            `;
        });
    }
}

// ============ MATCH HISTORY FUNCTION ============
if (window.location.pathname.includes('matches.html')) {
    loadMatchHistory();
}

async function loadMatchHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    const { data: matches, error } = await supabase
        .from('matches')
        .select(`
            *,
            player1:players!matches_player1_id_fkey(username),
            player2:players!matches_player2_id_fkey(username),
            winner:players!matches_winner_id_fkey(username)
        `)
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .order('match_date', { ascending: false })
        .limit(20);
    
    if (error) {
        console.error('Matches error:', error);
        return;
    }
    
    const container = document.getElementById('matchesList');
    if (container && matches) {
        container.innerHTML = '';
        matches.forEach(match => {
            const isWinner = match.winner_id === user.id;
            const result = isWinner ? '✅ Won' : '❌ Lost';
            const opponent = match.player1_id === user.id ? match.player2?.username : match.player1?.username;
            
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.innerHTML = `
                <div class="match-result ${isWinner ? 'win' : 'loss'}">${result}</div>
                <div class="match-details">
                    <span>vs <strong>${opponent || 'Unknown'}</strong></span>
                    <span class="match-date">${new Date(match.match_date).toLocaleDateString()}</span>
                </div>
            `;
            container.appendChild(matchCard);
        });
        
        if (matches.length === 0) {
            container.innerHTML = '<p class="no-matches">No matches played yet. Start your journey!</p>';
        }
    }
}

// ============ LOGOUT FUNCTION ============
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('pop123_user');
        window.location.href = 'index.html';
    });
}
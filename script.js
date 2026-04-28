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
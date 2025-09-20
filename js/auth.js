// Authentication Module for TechCloud
class AuthManager {
    constructor() {
        console.log('AuthManager: Constructor called');
        this.currentUser = null;
        this.currentSession = null;
        this.refreshTimer = null;
        this.isUserInitiatedSignIn = false; // Flag to track user-initiated sign-in
        this.isSigningOut = false; // Flag to track signout process
        this.sessionCheckComplete = false; // Flag to track initial session check
        
        // Check if supabaseClient is available
        if (typeof supabaseClient === 'undefined') {
            console.error('AuthManager: supabaseClient not available!');
            throw new Error('Supabase client not initialized');
        }
        
        console.log('AuthManager: Starting initialization...');
        this.init();
    }

    async init() {
        try {
            console.log('AuthManager: init() called');
            
            // Initially show auth links while checking session
            this.showAuthLinks();
            
            console.log('AuthManager: Getting current session...');
            // Get current session (this includes refresh if needed)
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) {
                console.error('Session error:', error);
            }
            
            this.currentSession = session;
            this.currentUser = session?.user || null;
            this.sessionCheckComplete = true; // Mark initial check as complete
            this.updateUI();
            
            // Set up session refresh if we have a session
            if (session) {
                this.setupSessionRefresh(session);
            }
            
            // Listen for auth changes
            supabaseClient.auth.onAuthStateChange((event, session) => {
                console.log('Auth state change:', event, session?.user?.email);
                
                // Skip processing during signout to prevent conflicts
                if (this.isSigningOut && event === 'SIGNED_OUT') {
                    console.log('Signout in progress, skipping state change processing');
                    return;
                }
                
                this.currentSession = session;
                this.currentUser = session?.user || null;
                this.updateUI();
                
                // Clear existing refresh timer
                if (this.refreshTimer) {
                    clearTimeout(this.refreshTimer);
                    this.refreshTimer = null;
                }
                
                // Only handle redirects for actual authentication events, not initial session checks
                if (event === 'SIGNED_IN') {
                    // Only redirect if this is a fresh sign-in, not a session restoration
                    if (this.isUserInitiatedSignIn && this.sessionCheckComplete) {
                        this.handleSignIn();
                        this.isUserInitiatedSignIn = false; // Reset flag
                    }
                    if (session) {
                        this.setupSessionRefresh(session);
                    }
                } else if (event === 'SIGNED_OUT') {
                    // Reset signout flag after processing
                    setTimeout(() => {
                        this.isSigningOut = false;
                    }, 1000);
                    this.handleSignOut();
                } else if (event === 'TOKEN_REFRESHED' && session) {
                    // Just setup refresh, don't redirect
                    this.setupSessionRefresh(session);
                }
            });
            
            // Set up periodic session refresh
            this.startPeriodicRefresh();
            
        } catch (error) {
            console.error('Auth initialization error:', error);
        }
    }

    // Set up automatic session refresh based on token expiry
    setupSessionRefresh(session) {
        if (!session || !session.expires_at) return;
        
        const expiresAt = session.expires_at * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        // Refresh 5 minutes before expiry (or immediately if already expired)
        const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 1000);
        
        console.log(`Session expires in ${Math.round(timeUntilExpiry / 1000 / 60)} minutes, refreshing in ${Math.round(refreshTime / 1000 / 60)} minutes`);
        
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        this.refreshTimer = setTimeout(async () => {
            await this.refreshSession();
        }, refreshTime);
    }

    // Manually refresh the session
    async refreshSession() {
        try {
            console.log('Refreshing session...');
            const { data: { session }, error } = await supabaseClient.auth.refreshSession();
            
            if (error) {
                console.error('Session refresh error:', error);
                // If refresh fails, sign out the user
                await this.signOut();
                return false;
            }
            
            if (session) {
                console.log('Session refreshed successfully');
                this.currentSession = session;
                this.currentUser = session.user;
                this.setupSessionRefresh(session);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Session refresh error:', error);
            return false;
        }
    }

    // Start periodic session refresh (every 30 minutes as backup)
    startPeriodicRefresh() {
        setInterval(async () => {
            if (this.currentSession && this.currentUser) {
                const { data: { session }, error } = await supabaseClient.auth.getSession();
                
                if (error || !session) {
                    console.log('Session lost, signing out...');
                    await this.signOut();
                } else if (session.expires_at) {
                    const expiresAt = session.expires_at * 1000;
                    const now = Date.now();
                    const timeUntilExpiry = expiresAt - now;
                    
                    // If session expires in less than 10 minutes, refresh it
                    if (timeUntilExpiry < (10 * 60 * 1000)) {
                        await this.refreshSession();
                    }
                }
            }
        }, 30 * 60 * 1000); // Check every 30 minutes
    }

    // Sign up new user
    async signUp(email, password, fullName) {
        try {
            this.isUserInitiatedSignIn = true; // Set flag for user-initiated sign-up
            
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            if (data.user && !data.user.email_confirmed_at) {
                this.showMessage('Please check your email to confirm your account!', 'info');
                return { success: true, needsConfirmation: true };
            }

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Sign up error:', error);
            this.showMessage(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Sign in existing user
    async signIn(email, password, rememberMe = false) {
        try {
            // Set session persistence based on "Remember Me"
            const sessionOptions = {
                email: email,
                password: password
            };

            // If remember me is checked, we'll rely on the default localStorage persistence
            // If not, we could implement session-only storage, but Supabase handles this automatically
            
            this.isUserInitiatedSignIn = true; // Set flag for user-initiated sign-in
            
            const { data, error } = await supabaseClient.auth.signInWithPassword(sessionOptions);

            if (error) throw error;

            // Store remember me preference
            if (rememberMe) {
                localStorage.setItem('techcloud-remember-me', 'true');
                localStorage.setItem('techcloud-user-email', email);
            } else {
                localStorage.removeItem('techcloud-remember-me');
                localStorage.removeItem('techcloud-user-email');
            }

            this.showMessage('Successfully signed in!', 'success');
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Sign in error:', error);
            this.showMessage(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Sign out user
    async signOut() {
        try {
            this.isSigningOut = true; // Set signout flag
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
            
            this.showMessage('Successfully signed out!', 'success');
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            this.showMessage(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });

            if (error) throw error;

            this.showMessage('Password reset email sent!', 'success');
            return { success: true };
        } catch (error) {
            console.error('Reset password error:', error);
            this.showMessage(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Show auth links initially (before session check)
    showAuthLinks() {
        const authLinks = document.querySelectorAll('.auth-links');
        const userInfo = document.querySelectorAll('.user-info');
        
        authLinks.forEach(link => link.style.display = 'list-item');
        userInfo.forEach(info => info.style.display = 'none');
    }

    // Update UI based on auth state
    updateUI() {
        const authLinks = document.querySelectorAll('.auth-links');
        const userInfo = document.querySelectorAll('.user-info');
        const protectedContent = document.querySelectorAll('.protected-content');

        if (this.currentUser) {
            // User is logged in - hide auth links, show user info
            authLinks.forEach(link => {
                link.style.setProperty('display', 'none', 'important');
            });
            userInfo.forEach(info => {
                info.style.setProperty('display', 'list-item', 'important');
                const userNameEl = info.querySelector('.user-name');
                if (userNameEl) {
                    userNameEl.textContent = this.currentUser.user_metadata?.full_name || this.currentUser.email;
                }
            });
            protectedContent.forEach(content => content.style.display = 'block');
        } else {
            // User is not logged in - show auth links, hide user info
            authLinks.forEach(link => {
                link.style.setProperty('display', 'list-item', 'important');
            });
            userInfo.forEach(info => {
                info.style.setProperty('display', 'none', 'important');
            });
            protectedContent.forEach(content => content.style.display = 'none');
        }
    }

    // Handle successful sign in
    handleSignIn() {
        // Don't automatically redirect - let user stay on current page or navigate manually
        // This prevents unwanted redirects from login/signup pages
        console.log('User successfully signed in:', this.currentUser?.email);
        
        // Optional: Could add logic here to redirect to a specific dashboard page
        // if needed in the future, but for now let users stay where they are
    }

    // Handle sign out
    handleSignOut() {
        // Redirect to home page if on protected page
        if (window.location.pathname.includes('profile.html') || 
            window.location.pathname.includes('dashboard.html')) {
            window.location.href = 'index.html';
        }
    }

    // Show message to user
    showMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.auth-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} auth-message`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        messageDiv.innerHTML = `
            <button type="button" class="close" onclick="this.parentElement.remove()">
                <span>&times;</span>
            </button>
            ${message}
        `;

        document.body.appendChild(messageDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Check if user is authenticated (async to handle session restoration)
    async isAuthenticated() {
        // If we already have a current user, return true
        if (this.currentUser) {
            return true;
        }
        
        // Try to get session from Supabase (handles localStorage restoration)
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) {
                console.error('Session check error:', error);
                return false;
            }
            
            if (session && session.user) {
                this.currentSession = session;
                this.currentUser = session.user;
                this.setupSessionRefresh(session);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Authentication check error:', error);
            return false;
        }
    }

    // Get current user (async to handle session restoration)
    async getCurrentUser() {
        // If we already have a current user, return it
        if (this.currentUser) {
            return this.currentUser;
        }
        
        // Try to restore session and get user
        const isAuth = await this.isAuthenticated();
        return isAuth ? this.currentUser : null;
    }

    // Require authentication for protected pages (now async)
    async requireAuth() {
        console.log('requireAuth() called');
        console.log('Current user before check:', this.currentUser);
        
        const isAuth = await this.isAuthenticated();
        console.log('isAuthenticated() result:', isAuth);
        
        if (!isAuth) {
            console.log('Authentication failed, redirecting to login...');
            this.showMessage('Please log in to access this page', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }
        
        console.log('Authentication successful');
        return true;
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth.js: DOM loaded, starting initialization...');
    
    // Ensure auth links are visible immediately
    const authLinks = document.querySelectorAll('.auth-links');
    authLinks.forEach(link => {
        link.style.display = 'list-item';
        link.style.visibility = 'visible';
    });
    
    // Wait for Supabase to be available before initializing AuthManager
    function initializeAuthManager() {
        console.log('Auth.js: Checking for Supabase availability...');
        
        if (typeof window.supabase !== 'undefined' && typeof supabaseClient !== 'undefined') {
            console.log('Auth.js: Supabase available, initializing AuthManager...');
            try {
                window.authManager = new AuthManager();
                console.log('Auth.js: AuthManager initialized successfully');
            } catch (error) {
                console.error('Auth.js: Error initializing AuthManager:', error);
                // Retry after a delay
                setTimeout(initializeAuthManager, 1000);
            }
        } else {
            console.log('Auth.js: Supabase not ready, retrying in 100ms...');
            setTimeout(initializeAuthManager, 100);
        }
    }
    
    // Start initialization
    initializeAuthManager();
    
    // Debug: Log navigation elements
    console.log('Auth links found:', authLinks.length);
    console.log('Navigation setup complete');
});

// Add CSS for animations
const authStyle = document.createElement('style');
authStyle.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .auth-message {
        animation: slideIn 0.3s ease-out;
    }
    
    .user-info {
        display: none;
    }
    
    .protected-content {
        display: none;
    }
`;
document.head.appendChild(authStyle);

// Supabase Configuration for TechCloud
// Replace these with your actual Supabase project credentials

const SUPABASE_URL = 'https://xbdvkvarpthptbepqbhb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZHZrdmFycHRocHRiZXBxYmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODExMTksImV4cCI6MjA3Mjc1NzExOX0.5sQHHhjNtFsDW2PwlTl-8jqpvaiF1-6JoGjX4CgnP08';

// Wait for Supabase to be available
let supabaseClient;

// Initialize Supabase client with error handling
function initializeSupabase() {
    try {
        console.log('Supabase-config: Attempting to initialize Supabase...');
        console.log('Supabase-config: window.supabase available:', typeof window.supabase !== 'undefined');
        
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase library not loaded');
            return false;
        }
        
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
        console.log('Supabase client initialized successfully');
        console.log('Supabase-config: supabaseClient created:', !!supabaseClient);
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// Contact Form Functions
class ContactFormHandler {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        this.init();
    }

    init() {
        if (initializeSupabase()) {
            this.supabase = supabaseClient;
            this.initialized = true;
            console.log('ContactFormHandler initialized successfully');
        } else {
            console.error('Failed to initialize ContactFormHandler');
        }
    }

    // Submit contact form message to Supabase
    async submitContactMessage(formData) {
        try {
            console.log('ContactFormHandler.submitContactMessage called with:', formData);
            
            if (!this.initialized || !this.supabase) {
                console.error('ContactFormHandler not properly initialized');
                throw new Error('Contact form service not available. Please refresh the page.');
            }

            // Get user's IP and user agent for tracking
            const userAgent = navigator.userAgent;
            
            const messageData = {
                name: formData.name,
                email: formData.email,
                subject: formData.subject,
                message: formData.message,
                user_agent: userAgent,
                status: 'new'
            };

            console.log('Inserting message data:', messageData);

            // Use upsert instead of insert to bypass some RLS issues
            const { data, error } = await this.supabase
                .from('contact_messages')
                .insert(messageData)
                .select();

            console.log('Supabase insert response:', { data, error });

            if (error) {
                console.error('Supabase insert error:', error);
                
                // If it's a permission error, try alternative approach
                if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
                    console.log('Attempting alternative insert method...');
                    
                    // Try with explicit RPC call or direct table access
                    const { data: rpcData, error: rpcError } = await this.supabase.rpc('insert_contact_message', {
                        p_name: formData.name,
                        p_email: formData.email,
                        p_subject: formData.subject,
                        p_message: formData.message,
                        p_user_agent: userAgent
                    });
                    
                    if (rpcError) {
                        console.error('RPC insert error:', rpcError);
                        throw new Error('Database permission error. Please contact support or try again later.');
                    }
                    
                    return {
                        success: true,
                        data: rpcData,
                        message: 'Message sent successfully!'
                    };
                }
                
                throw error;
            }

            return {
                success: true,
                data: data,
                message: 'Message sent successfully!'
            };

        } catch (error) {
            console.error('Error submitting contact form:', error);
            
            let errorMessage = 'Failed to send message. Please try again.';
            
            // Handle specific Supabase errors
            if (error.code === 'PGRST116') {
                errorMessage = 'Database table not found. Please contact support.';
            } else if (error.code === '42501' || error.message.includes('permission')) {
                errorMessage = 'Database permission error. Please contact support.';
            } else if (error.message && error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (error.message && error.message.includes('not found')) {
                errorMessage = 'Service temporarily unavailable. Please try again later.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return {
                success: false,
                error: error.message || error.code || 'Unknown error',
                message: errorMessage
            };
        }
    }

    // Get all contact messages (for admin use)
    async getContactMessages(limit = 50, offset = 0) {
        try {
            if (!this.initialized || !this.supabase) {
                throw new Error('Contact form service not available');
            }

            const { data, error } = await this.supabase
                .from('contact_messages')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                throw error;
            }

            return {
                success: true,
                data: data,
                count: data.length
            };

        } catch (error) {
            console.error('Error fetching contact messages:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // Update message status (for admin use)
    async updateMessageStatus(messageId, status) {
        try {
            if (!this.initialized || !this.supabase) {
                throw new Error('Contact form service not available');
            }

            const { data, error } = await this.supabase
                .from('contact_messages')
                .update({ status: status })
                .eq('id', messageId)
                .select();

            if (error) {
                throw error;
            }

            return {
                success: true,
                data: data,
                message: 'Status updated successfully!'
            };

        } catch (error) {
            console.error('Error updating message status:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to update status.'
            };
        }
    }

    // Get contact message statistics (for admin dashboard)
    async getMessageStats() {
        try {
            if (!this.initialized || !this.supabase) {
                throw new Error('Contact form service not available');
            }

            const { data, error } = await this.supabase
                .from('contact_message_stats')
                .select('*')
                .single();

            if (error) {
                throw error;
            }

            return {
                success: true,
                data: data
            };

        } catch (error) {
            console.error('Error fetching message stats:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }
}

// Initialize when DOM is ready or Supabase is loaded
function createContactFormHandler() {
    if (typeof window.supabase !== 'undefined') {
        window.contactFormHandler = new ContactFormHandler();
        console.log('ContactFormHandler created and assigned to window');
    } else {
        console.log('Supabase not yet available, retrying...');
        setTimeout(createContactFormHandler, 100);
    }
}

// Try to initialize immediately
createContactFormHandler();

// Also try when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createContactFormHandler);
} else {
    createContactFormHandler();
}

// Initialize Supabase immediately when script loads
console.log('Supabase-config: Script loaded, attempting immediate initialization...');
if (typeof window.supabase !== 'undefined') {
    initializeSupabase();
} else {
    console.log('Supabase-config: window.supabase not available yet, will retry...');
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContactFormHandler;
}

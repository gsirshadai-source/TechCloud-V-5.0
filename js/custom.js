// Modern TechCloud JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links (only for anchor links on the same page)
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            // Only prevent default and smooth scroll if the target section exists on this page
            if (targetSection) {
                e.preventDefault();
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
            // If target section doesn't exist, let the browser handle the navigation normally
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.modern-nav');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile navbar collapse
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (navbarCollapse.classList.contains('show')) {
                    navbarToggler.click();
                }
            });
        });
    }

    // Enhanced Contact form handling with Supabase integration
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            console.log('Contact form submitted'); // Debug log
            
            // Get form data with more specific selectors
            const nameInput = this.querySelector('input[placeholder="Your Name"]');
            const emailInput = this.querySelector('input[placeholder="Your Email"]');
            const subjectInput = this.querySelector('input[placeholder="Subject"]');
            const messageInput = this.querySelector('textarea[placeholder="Your Message"]');
            
            // Check if elements exist
            if (!nameInput || !emailInput || !subjectInput || !messageInput) {
                console.error('Form elements not found:', {
                    nameInput: !!nameInput,
                    emailInput: !!emailInput,
                    subjectInput: !!subjectInput,
                    messageInput: !!messageInput
                });
                showNotification('Form configuration error. Please refresh the page.', 'error');
                return;
            }
            
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const subject = subjectInput.value.trim();
            const message = messageInput.value.trim();
            
            console.log('Form data:', { name, email, subject, message }); // Debug log
            
            // Validate form data
            if (!name || !email || !subject || !message) {
                showNotification('Please fill in all fields.', 'error');
                return;
            }
            
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address.', 'error');
                return;
            }
            
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]') || this.querySelector('.btn');
            const originalText = submitButton ? submitButton.textContent : '';
            if (submitButton) {
                submitButton.textContent = 'Sending...';
                submitButton.disabled = true;
            }
            
            try {
                // Check if Supabase is available
                console.log('Checking Supabase availability...'); // Debug log
                console.log('window.supabase:', typeof window.supabase); // Debug log
                console.log('window.contactFormHandler:', typeof window.contactFormHandler); // Debug log
                
                if (typeof window.supabase === 'undefined') {
                    throw new Error('Supabase library not loaded. Please check your internet connection.');
                }
                
                if (typeof window.contactFormHandler === 'undefined') {
                    throw new Error('Contact form handler not initialized. Please refresh the page.');
                }
                
                console.log('Submitting to Supabase...'); // Debug log
                
                // Submit to Supabase
                const result = await window.contactFormHandler.submitContactMessage({
                    name: name,
                    email: email,
                    subject: subject,
                    message: message
                });
                
                console.log('Supabase result:', result); // Debug log
                
                if (result.success) {
                    showNotification('Thank you for your message! We\'ll get back to you soon.', 'success');
                    this.reset();
                } else {
                    console.error('Supabase error:', result.error); // Debug log
                    throw new Error(result.message || result.error || 'Failed to send message');
                }
                
            } catch (error) {
                console.error('Contact form error:', error); // Debug log
                console.error('Error stack:', error.stack); // Debug log
                
                let errorMessage = 'Failed to send message. Please try again.';
                
                // Provide more specific error messages
                if (error.message.includes('Failed to fetch')) {
                    errorMessage = 'Network error. Please check your internet connection.';
                } else if (error.message.includes('not found')) {
                    errorMessage = 'Database table not found. Please contact support.';
                } else if (error.message.includes('permission')) {
                    errorMessage = 'Permission denied. Please contact support.';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                showNotification(errorMessage, 'error');
            } finally {
                // Reset button state
                if (submitButton) {
                    submitButton.textContent = originalText || 'Send Message';
                    submitButton.disabled = false;
                }
            }
        });
    }

    // Add loading animation to launch buttons
    const launchButtons = document.querySelectorAll('.launch-btn');
    launchButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Add loading state
            const originalText = this.textContent;
            this.textContent = 'Loading...';
            this.style.pointerEvents = 'none';
            
            // Reset after a short delay (for visual feedback)
            setTimeout(() => {
                this.textContent = originalText;
                this.style.pointerEvents = 'auto';
            }, 1000);
        });
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe service cards and app cards for animation
    const animatedElements = document.querySelectorAll('.service-card-modern, .app-card, .tech-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fa ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fa fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        color: white;
        font-family: 'Inter', sans-serif;
        animation: slideInRight 0.3s ease;
        background: ${getNotificationColor(type)};
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        default: return 'fa-info-circle';
    }
}

function getNotificationColor(type) {
    switch (type) {
        case 'success': return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        case 'error': return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        case 'warning': return 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)';
        default: return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0.25rem;
        margin-left: auto;
        opacity: 0.8;
        transition: opacity 0.2s;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
`;
document.head.appendChild(style);

// AI Chatbot Functionality
class TechCloudChatbot {
    constructor() {
        this.isOpen = false;
        this.isTyping = false;
        this.conversationHistory = [];
        this.useAI = true; // Flag to enable/disable AI API calls
        
        // Enhanced knowledge base for better responses
        this.knowledgeBase = {
            greetings: [
                "Hello! I'm your TechCloud AI Assistant. How can I help you today?",
                "Hi there! Welcome to TechCloud. What can I assist you with?",
                "Greetings! I'm here to help with any questions about TechCloud's services."
            ],
            services: {
                cloud: "Our Cloud Infrastructure service provides scalable solutions using AWS, Azure, and Google Cloud Platform. We handle everything from migration to optimization, ensuring 99.9% uptime and enterprise-grade security.",
                devops: "Our DevOps & Automation service streamlines your development process with CI/CD pipelines, containerization using Docker and Kubernetes, and infrastructure as code. We help reduce deployment time by up to 80%.",
                security: "Our Cybersecurity solutions include comprehensive security audits, compliance frameworks, zero-trust architecture, and 24/7 monitoring. We protect your digital assets with industry-leading security practices."
            },
            applications: {
                portfolio: "Portfolio Manager Pro is our advanced investment tracking application featuring real-time analytics, risk assessment, automated reporting, and interactive charts. Perfect for investment professionals and serious traders.",
                health: "Health Tracker is a comprehensive health monitoring app that tracks blood sugar, blood pressure, heart rate, and temperature with AI-powered insights and trend analysis."
            },
            pricing: "Our pricing is customized based on your specific needs and project scope. We offer flexible packages starting from consultation to full-scale implementations. Contact us for a free consultation and personalized quote.",
            contact: "You can reach us through our contact form on the homepage, or continue chatting with me for immediate assistance. For urgent matters, our support team is available 24/7.",
            technology: "We work with cutting-edge technologies including AWS, Azure, Google Cloud, Docker, Kubernetes, React, Node.js, Python, Java, and various security frameworks. Our tech stack is always evolving with industry standards."
        };
        
        this.initializeChatbot();
    }
    
    initializeChatbot() {
        const toggle = document.getElementById('chatbotToggle');
        const window = document.getElementById('chatbotWindow');
        const minimize = document.getElementById('chatbotMinimize');
        const input = document.getElementById('chatbotInput');
        const sendBtn = document.getElementById('chatbotSend');
        const notification = document.getElementById('chatNotification');
        
        if (!toggle || !window || !minimize || !input || !sendBtn) {
            console.error('Chatbot elements not found');
            return;
        }
        
        // Toggle chatbot window
        toggle.addEventListener('click', () => this.toggleChatbot());
        minimize.addEventListener('click', () => this.closeChatbot());
        
        // Handle input
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Hide notification after first interaction
        toggle.addEventListener('click', () => {
            if (notification) {
                notification.style.display = 'none';
            }
        });
        
        // Auto-resize input
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !document.getElementById('aiChatbot').contains(e.target)) {
                this.closeChatbot();
            }
        });
        
        console.log('TechCloud Chatbot initialized successfully');
    }
    
    toggleChatbot() {
        if (this.isOpen) {
            this.closeChatbot();
        } else {
            this.openChatbot();
        }
    }
    
    openChatbot() {
        const window = document.getElementById('chatbotWindow');
        const input = document.getElementById('chatbotInput');
        
        this.isOpen = true;
        window.classList.add('active');
        
        // Focus input after animation
        setTimeout(() => {
            if (input) input.focus();
        }, 300);
        
        this.updateResponseTime();
    }
    
    closeChatbot() {
        const window = document.getElementById('chatbotWindow');
        
        this.isOpen = false;
        window.classList.remove('active');
    }
    
    async sendMessage() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();
        
        if (!message || this.isTyping) return;
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        input.style.height = 'auto';
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Get response with delay for realistic feel
        setTimeout(async () => {
            try {
                const response = await this.getResponse(message);
                this.hideTypingIndicator();
                this.addMessage(response, 'bot');
            } catch (error) {
                console.error('Response Error:', error);
                this.hideTypingIndicator();
                this.addMessage('I apologize for the technical difficulty. Let me help you with our services instead. What would you like to know about TechCloud?', 'bot');
            }
        }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
    }
    
    addMessage(content, sender, isError = false) {
        const messagesContainer = document.getElementById('chatbotMessages');
        const messageDiv = document.createElement('div');
        const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageDiv.className = `message ${sender}-message ${isError ? 'error' : ''}`;
        
        const avatarIcon = sender === 'user' ? 'fa-user' : 'fa-robot';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fa ${avatarIcon}"></i>
            </div>
            <div class="message-content">
                <p>${this.formatMessage(content)}</p>
                <span class="timestamp">${timestamp}</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Store in conversation history
        this.conversationHistory.push({
            role: sender === 'user' ? 'user' : 'assistant',
            content: content,
            timestamp: new Date().toISOString()
        });
        
        // Limit history to last 10 messages
        if (this.conversationHistory.length > 10) {
            this.conversationHistory = this.conversationHistory.slice(-10);
        }
    }
    
    formatMessage(content) {
        // Convert newlines to <br> and handle basic formatting
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }
    
    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatbotMessages');
        const typingDiv = document.createElement('div');
        
        typingDiv.className = 'message bot-message typing-indicator-message';
        typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="fa fa-robot"></i>
            </div>
            <div class="typing-indicator">
                <span>AI is typing</span>
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
        this.isTyping = true;
    }
    
    hideTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator-message');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        this.isTyping = false;
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('chatbotMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    async getResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Greetings
        if (this.containsAny(lowerMessage, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
            return this.getRandomResponse(this.knowledgeBase.greetings);
        }
        
        // Services
        if (this.containsAny(lowerMessage, ['service', 'services', 'what do you do', 'what does techcloud do'])) {
            return `TechCloud offers three main services:

🔹 **Cloud Infrastructure** - Scalable solutions with AWS, Azure, and Google Cloud
🔹 **DevOps & Automation** - CI/CD pipelines, containerization, and infrastructure as code  
🔹 **Cybersecurity** - Comprehensive security solutions and compliance frameworks

Would you like to know more about any specific service?`;
        }
        
        // Cloud Infrastructure
        if (this.containsAny(lowerMessage, ['cloud', 'infrastructure', 'aws', 'azure', 'google cloud'])) {
            return this.knowledgeBase.services.cloud;
        }
        
        // DevOps
        if (this.containsAny(lowerMessage, ['devops', 'automation', 'ci/cd', 'docker', 'kubernetes'])) {
            return this.knowledgeBase.services.devops;
        }
        
        // Security
        if (this.containsAny(lowerMessage, ['security', 'cybersecurity', 'secure', 'protection'])) {
            return this.knowledgeBase.services.security;
        }
        
        // Applications
        if (this.containsAny(lowerMessage, ['app', 'application', 'portfolio', 'health tracker'])) {
            if (this.containsAny(lowerMessage, ['portfolio', 'investment', 'trading'])) {
                return this.knowledgeBase.applications.portfolio;
            } else if (this.containsAny(lowerMessage, ['health', 'medical', 'tracker'])) {
                return this.knowledgeBase.applications.health;
            } else {
                return `We've built some amazing applications:

📊 **Portfolio Manager Pro** - Advanced investment tracking with real-time analytics
❤️ **Health Tracker** - Comprehensive health monitoring with AI insights

You can try them directly from our homepage! What type of application interests you most?`;
            }
        }
        
        // Pricing
        if (this.containsAny(lowerMessage, ['price', 'pricing', 'cost', 'how much', 'quote'])) {
            return this.knowledgeBase.pricing;
        }
        
        // Contact/Support
        if (this.containsAny(lowerMessage, ['contact', 'support', 'help', 'reach you'])) {
            return this.knowledgeBase.contact;
        }
        
        // Technology
        if (this.containsAny(lowerMessage, ['technology', 'tech stack', 'tools', 'programming'])) {
            return this.knowledgeBase.technology;
        }
        
        // About TechCloud
        if (this.containsAny(lowerMessage, ['about', 'who are you', 'company', 'team'])) {
            return `TechCloud is a modern technology company focused on digital transformation. We have:

✅ **10+ years** of combined experience
✅ **500+ projects** completed successfully  
✅ **50+ happy clients** worldwide
✅ **99% uptime** guarantee

We're passionate about leveraging cutting-edge technology to solve real-world problems and drive business growth.`;
        }
        
        // Capabilities
        if (this.containsAny(lowerMessage, ['what can you do', 'capabilities', 'features'])) {
            return `I can help you with:

💬 **Information** about TechCloud services and applications
🔧 **Technical questions** about our solutions
💰 **Pricing** and consultation details
📞 **Contact** information and support
🚀 **Getting started** with our services

What would you like to know more about?`;
        }
        
        // Default intelligent responses based on keywords
        if (this.containsAny(lowerMessage, ['thank', 'thanks'])) {
            return "You're welcome! Is there anything else I can help you with regarding TechCloud's services?";
        }
        
        if (this.containsAny(lowerMessage, ['bye', 'goodbye', 'see you'])) {
            return "Thank you for visiting TechCloud! Feel free to reach out anytime. Have a great day! 👋";
        }
        
        // Fallback response with helpful suggestions
        return `I'd be happy to help! I can provide information about:

🔹 **Services** - Cloud, DevOps, and Cybersecurity solutions
🔹 **Applications** - Portfolio Manager and Health Tracker
🔹 **Pricing** - Custom quotes and consultations
🔹 **Technology** - Our tech stack and capabilities
🔹 **Contact** - How to reach our team

What would you like to know more about?`;
    }
    
    containsAny(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }
    
    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    updateResponseTime() {
        const responseTimeElement = document.getElementById('responseTime');
        if (responseTimeElement) {
            const times = ['~1s', '~2s', 'instant'];
            const randomTime = times[Math.floor(Math.random() * times.length)];
            responseTimeElement.textContent = `${randomTime} response time`;
        }
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure all other scripts are loaded
    setTimeout(() => {
        window.techCloudChatbot = new TechCloudChatbot();
    }, 1000);
});
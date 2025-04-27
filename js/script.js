// Load herbal recommendations data
let herbalData = null;
let userContributions = null;
let currentUser = null;
let authToken = null;

async function loadData() {
    try {
        const [herbalResponse, userResponse] = await Promise.all([
            fetch('./data/herbal_recommendations.json'),
            fetch('./data/user_contributions.json')
        ]);

        if (!herbalResponse.ok || !userResponse.ok) {
            throw new Error('Failed to fetch data files');
        }

        herbalData = await herbalResponse.json();
        userContributions = await userResponse.json();
        
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        appendMessage('system', 'I apologize, but I\'m having trouble accessing my knowledge base right now. Please try again later. Error: ' + error.message);
    }
}

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const loginFormHTML = `
    <div id="login-form" class="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg mb-6">
        <h2 class="text-2xl font-playfair text-forest mb-4">Login</h2>
        <form id="form-login" class="space-y-4">
            <input type="text" id="login-username" placeholder="Username or Email" class="w-full px-4 py-2 border border-sage rounded-lg focus:outline-none focus:border-forest" required />
            <input type="password" id="login-password" placeholder="Password" class="w-full px-4 py-2 border border-sage rounded-lg focus:outline-none focus:border-forest" required />
            <button type="submit" class="w-full bg-forest text-white py-2 rounded-lg hover:bg-sage transition-colors">Login</button>
        </form>
        <p class="mt-4 text-center text-sm text-deepForest">Don't have an account? <a href="#" id="show-register" class="text-forest hover:text-sage cursor-pointer">Register here</a></p>
    </div>
`;
const registerFormHTML = `
    <div id="register-form" class="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg mb-6 hidden">
        <h2 class="text-2xl font-playfair text-forest mb-4">Register</h2>
        <form id="form-register" class="space-y-4">
            <input type="text" id="register-username" placeholder="Username" class="w-full px-4 py-2 border border-sage rounded-lg focus:outline-none focus:border-forest" required />
            <input type="email" id="register-email" placeholder="Email" class="w-full px-4 py-2 border border-sage rounded-lg focus:outline-none focus:border-forest" required />
            <input type="password" id="register-password" placeholder="Password" class="w-full px-4 py-2 border border-sage rounded-lg focus:outline-none focus:border-forest" required />
            <button type="submit" class="w-full bg-forest text-white py-2 rounded-lg hover:bg-sage transition-colors">Register</button>
        </form>
        <p class="mt-4 text-center text-sm text-deepForest">Already have an account? <a href="#" id="show-login" class="text-forest hover:text-sage cursor-pointer">Login here</a></p>
    </div>
`;
const userInfoHTML = `
    <div id="user-info" class="max-w-md mx-auto p-4 bg-white rounded-lg shadow-lg mb-6 flex justify-between items-center">
        <span id="user-greeting" class="text-forest font-semibold"></span>
        <button id="logout-btn" class="bg-forest text-white px-4 py-2 rounded-lg hover:bg-sage transition-colors">Logout</button>
    </div>
`;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check if required DOM elements exist
    if (!chatMessages || !chatForm || !userInput) {
        console.error('Required DOM elements not found. Checking elements...');
        chatMessages = document.getElementById('chat-messages');
        chatForm = document.getElementById('chat-form');
        userInput = document.getElementById('user-input');
        
        if (!chatMessages || !chatForm || !userInput) {
            console.error('Critical DOM elements are missing. Chat functionality will not work.');
            return;
        }
    }

    // Show login or user info
    if (localStorage.getItem('authToken')) {
        authToken = localStorage.getItem('authToken');
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
        showUserInfo();
        await loadUserInteractions();
    } else {
        showLoginForm();
    }

    // Show loading state
    const loadingElement = showLoading();
    
    // Load data
    await loadData();
    
    // Remove loading state
    removeLoading(loadingElement);
    
    // Setup event listeners
    setupEventListeners();
});

function setupEventListeners() {
    try {
        // Form submission
        if (chatForm) {
            chatForm.addEventListener('submit', handleSubmit);
        }

        // Quick ailment buttons
        const ailmentButtons = document.querySelectorAll('.ailment-btn');
        if (ailmentButtons.length > 0) {
            ailmentButtons.forEach(button => {
                button.addEventListener('click', () => {
                    userInput.value = button.textContent;
                    handleSubmit(new Event('submit'));
                });
            });
        }

        // Add keyboard event listener for Enter key
        if (userInput) {
            userInput.addEventListener('keypress', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSubmit(event);
                }
            });
        }

        // Contribute button
        const contributeBtn = document.getElementById('contribute-btn');
        if (contributeBtn) {
            contributeBtn.addEventListener('click', showContributionForm);
        }

        // Login form events
        document.body.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'show-register') {
                e.preventDefault();
                showRegisterForm();
            } else if (e.target && e.target.id === 'show-login') {
                e.preventDefault();
                showLoginForm();
            } else if (e.target && e.target.id === 'logout-btn') {
                e.preventDefault();
                logoutUser();
            }
        });

        document.body.addEventListener('submit', async (e) => {
            if (e.target && e.target.id === 'form-login') {
                e.preventDefault();
                await loginUser();
            } else if (e.target && e.target.id === 'form-register') {
                e.preventDefault();
                await registerUser();
            }
        });

        console.log('Event listeners setup completed');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        appendMessage('system', 'There was an error initializing the chat interface. Please refresh the page.');
    }
}

async function loginUser() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrUsername: username, password }),
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            clearChatMessages();
            showUserInfo();
            await loadUserInteractions();
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed due to server error');
    }
}

async function registerUser() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();

    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            clearChatMessages();
            showUserInfo();
            await loadUserInteractions();
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed due to server error');
    }
}

function logoutUser() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    clearChatMessages();
    showLoginForm();
}

function showLoginForm() {
    clearChatMessages();
    chatMessages.insertAdjacentHTML('beforebegin', loginFormHTML);
    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.remove();
    const userInfo = document.getElementById('user-info');
    if (userInfo) userInfo.remove();
}

function showRegisterForm() {
    clearChatMessages();
    chatMessages.insertAdjacentHTML('beforebegin', registerFormHTML);
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.remove();
    const userInfo = document.getElementById('user-info');
    if (userInfo) userInfo.remove();
}

function showUserInfo() {
    clearChatMessages();
    chatMessages.insertAdjacentHTML('beforebegin', userInfoHTML);
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.remove();
    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.remove();
    const userGreeting = document.getElementById('user-greeting');
    if (userGreeting && currentUser) {
        userGreeting.textContent = `Welcome, ${currentUser.username}!`;
    }
}

function clearChatMessages() {
    chatMessages.innerHTML = '';
}

async function loadUserInteractions() {
    if (!authToken) return;

    try {
        const response = await fetch('http://localhost:5000/api/interactions', {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });

        if (response.ok) {
            const interactions = await response.json();
            clearChatMessages();
            interactions.reverse().forEach(interaction => {
                appendMessage('user', interaction.query);
                appendMessage('system', interaction.response);
            });
        } else {
            console.error('Failed to load user interactions');
        }
    } catch (error) {
        console.error('Error loading user interactions:', error);
    }
}

async function saveUserInteraction(query, response) {
    if (!authToken) return;

    try {
        await fetch('http://localhost:5000/api/interactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
            },
            body: JSON.stringify({ query, response }),
        });
    } catch (error) {
        console.error('Error saving user interaction:', error);
    }
}

function processUserInput(message) {
    if (!herbalData) {
        appendMessage('system', 'Still loading herbal database. Please try again in a moment.');
        return;
    }

    // Show user's message
    appendMessage('user', message);

    // Show loading indicator
    const loadingElement = showLoading();

    try {
        const normalizedInput = message.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        let matchFound = false;
        let responseText = '';

        // Check official recommendations
        for (const [ailment, data] of Object.entries(herbalData)) {
            const normalizedAilment = ailment.replace(/_/g, ' ');
            if (normalizedInput.includes(normalizedAilment)) {
                responseText = data.recommendation;
                setTimeout(() => {
                    removeLoading(loadingElement);
                    appendHerbalRecommendation(data, false);
                    saveUserInteraction(message, responseText);
                }, 500);
                matchFound = true;
                break;
            }
        }

        // Check user contributions
        if (!matchFound && userContributions && userContributions.user_remedies.length > 0) {
            for (const contribution of userContributions.user_remedies) {
                if (normalizedInput.includes(contribution.ailment.toLowerCase())) {
                    responseText = contribution.recommendation;
                    setTimeout(() => {
                        removeLoading(loadingElement);
                        appendHerbalRecommendation(contribution, true);
                        saveUserInteraction(message, responseText);
                    }, 500);
                    matchFound = true;
                    break;
                }
            }
        }

        if (!matchFound) {
            responseText = 'I don\'t have specific recommendations for that ailment yet. Would you like to contribute a remedy? ' +
                '<button onclick="showContributionForm()" class="mt-2 px-4 py-2 bg-forest text-white rounded-lg hover:bg-sage transition-colors">Contribute Remedy</button>';
            setTimeout(() => {
                removeLoading(loadingElement);
                appendMessage('system', responseText);
                saveUserInteraction(message, responseText);
            }, 500);
        }
    } catch (error) {
        console.error('Error processing input:', error);
        removeLoading(loadingElement);
        appendMessage('system', 'Sorry, there was an error processing your request. Please try again.');
    }
}

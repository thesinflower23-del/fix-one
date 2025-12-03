/* ============================================
   BestBuddies Pet Grooming - Authentication
   ============================================ */

import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";
import { getCurrentUser, setCurrentUser, clearCurrentUser, getUsers, saveUsers } from "./firebase-db.js";

// Get Firebase Auth
function getFirebaseAuth() {
  return window.firebaseAuth;
}

function getFirebaseDatabase() {
  return window.firebaseDatabase;
}

// Signup function
async function signup(event) {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = 'customer'; // All signups are customers

  // Validation
  if (!name || !email || !password) {
    customAlert.warning('Missing Information', 'Please fill in all fields');
    return;
  }

  if (password.length < 6) {
    customAlert.warning('Weak Password', 'Password must be at least 6 characters');
    return;
  }

  try {
    const auth = getFirebaseAuth();

    if (auth) {
      // Use Firebase Auth for signup
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in database
      const db = getFirebaseDatabase();
      if (db) {
        const userProfile = {
          id: user.uid,
          name: name,
          email: email,
          role: role,
          warnings: 0,
          isBanned: false,
          createdAt: Date.now()
        };

        const userRef = ref(db, `users/${user.uid}`);
        await set(userRef, userProfile);

        // Also save to localStorage
        setCurrentUser(userProfile);
      } else {
        // Fallback to localStorage
        const newUser = {
          id: user.uid,
          name: name,
          email: email,
          password: password, // Note: Firebase handles password, this is just for localStorage fallback
          role: role,
          createdAt: Date.now(),
          warnings: 0
        };

        const users = await getUsers();
        users.push(newUser);
        await saveUsers(users);
        setCurrentUser(newUser);
      }

      // Check for return URL (for browse-first booking flow)
      const urlParams = new URLSearchParams(window.location.search);
      const returnPage = urlParams.get('return') || 'customer-dashboard.html';

      // Redirect
      redirect(returnPage);
      return;
    }

    // Fallback to localStorage if Firebase not available
    const users = await getUsers();
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      customAlert.warning('Email Registered', 'Email already registered. Please login instead.');
      return;
    }

    // Create new user
    const newUser = {
      id: 'user-' + Date.now(),
      name: name,
      email: email,
      password: password,
      role: role,
      createdAt: Date.now(),
      warnings: 0
    };

    // Add user to storage
    users.push(newUser);
    await saveUsers(users);

    // Auto-login
    setCurrentUser(newUser);

    // Check for return URL (for browse-first booking flow)
    const urlParams = new URLSearchParams(window.location.search);
    const returnPage = urlParams.get('return') || 'customer-dashboard.html';

    // Redirect
    redirect(returnPage);
  } catch (error) {
    console.error('Signup error:', error);
    let errorMessage = 'An error occurred during signup. Please try again.';

    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered. Please login instead.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please use a stronger password.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    customAlert.error('Signup Error', errorMessage);
  }
}

// Login function
async function login(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Validation
  if (!email || !password) {
    customAlert.warning('Missing Information', 'Please enter both email and password');
    return;
  }

  try {
    const auth = getFirebaseAuth();

    if (auth) {
      // Use Firebase Auth for login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user profile from database
      const db = getFirebaseDatabase();
      if (db) {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const userProfile = snapshot.val();
          userProfile.id = user.uid;
          console.log('Login: User profile from Firebase:', userProfile);
          setCurrentUser(userProfile);
        } else {
          // Create basic profile if doesn't exist
          // Try to get name from localStorage first (in case user signed up but profile wasn't saved)
          const cachedUser = localStorage.getItem('currentUser');
          let userName = user.email?.split('@')[0] || 'Customer';
          if (cachedUser) {
            try {
              const cached = JSON.parse(cachedUser);
              if (cached.name) {
                userName = cached.name;
              }
            } catch (e) {
              console.warn('Could not parse cached user:', e);
            }
          }

          const userProfile = {
            id: user.uid,
            email: user.email,
            name: userName,
            role: 'customer',
            warnings: 0,
            isBanned: false,
            createdAt: Date.now()
          };
          console.log('Login: Creating new user profile:', userProfile);
          await set(userRef, userProfile);
          setCurrentUser(userProfile);
        }
      } else {
        // Fallback: get from localStorage
        const users = await getUsers();
        const userProfile = users.find(u => u.id === user.uid || u.email === email);
        if (userProfile) {
          setCurrentUser(userProfile);
        } else {
          setCurrentUser({
            id: user.uid,
            email: user.email,
            name: user.email,
            role: 'customer'
          });
        }
      }

      // Check for return URL (for browse-first booking flow)
      const urlParams = new URLSearchParams(window.location.search);
      const returnPage = urlParams.get('return');

      if (returnPage) {
        redirect(returnPage);
      } else {
        // Get user role to determine redirect
        const currentUser = await getCurrentUser();
        if (currentUser && currentUser.role === 'admin') {
          redirect('admin-dashboard.html');
        } else if (currentUser && (currentUser.role === 'groomer' || currentUser.role === 'staff')) {
          redirect('groomer-dashboard.html');
        } else {
          redirect('customer-dashboard.html');
        }
      }
      return;
    }

    // Fallback to localStorage if Firebase not available
    const users = await getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      customAlert.error('Login Failed', 'Invalid email or password');
      return;
    }

    // Set current user
    setCurrentUser(user);

    // Check for return URL (for browse-first booking flow)
    const urlParams = new URLSearchParams(window.location.search);
    const returnPage = urlParams.get('return');

    if (returnPage) {
      // Return to booking flow or specified page
      redirect(returnPage);
    } else if (user.role === 'admin') {
      redirect('admin-dashboard.html');
    } else if (user.role === 'groomer' || user.role === 'staff') {
      redirect('groomer-dashboard.html');
    } else {
      redirect('customer-dashboard.html');
    }
  } catch (error) {
    console.error('Login error:', error);
    let errorMessage = 'Invalid email or password';

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email. Please sign up first.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    customAlert.error('Login Failed', errorMessage);
  }
}

// Logout function
async function logout(event) {
  // Prevent default link behavior if event is provided
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  try {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
      console.log('Firebase Auth signout successful');
    }
  } catch (error) {
    console.error('Logout error:', error);
  }

  // Clear all user data from localStorage
  clearCurrentUser();

  // Clear any cached Firebase user data
  const auth = getFirebaseAuth();
  if (auth && auth.currentUser) {
    localStorage.removeItem(`firebase_user_${auth.currentUser.uid}`);
  }

  // Clear all localStorage items related to current user
  localStorage.removeItem('currentUser');

  console.log('Logout complete, redirecting to index...');

  // Use window.location for reliable redirect
  window.location.href = 'index.html';
}

// Require login - redirect if not logged in
async function requireLogin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('login.html');
    return false;
  }
  return true;
}

// Require admin - redirect if not admin
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('login.html');
    return false;
  }
  if (user.role !== 'admin') {
    redirect('customer-dashboard.html');
    return false;
  }
  return true;
}

// Require groomer - redirect if not groomer
async function requireGroomer() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('login.html');
    return false;
  }
  if (user.role !== 'groomer' && user.role !== 'staff') {
    redirect('customer-dashboard.html');
    return false;
  }
  return true;
}

// Alias for backward compatibility
const requireStaff = requireGroomer;

// Make auth functions globally available
window.requireLogin = requireLogin;
window.requireAdmin = requireAdmin;
window.requireGroomer = requireGroomer;
window.requireStaff = requireStaff;

// Make logout function globally available for onclick handlers
window.logout = logout;

// Initialize login form
document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', login);
  }

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', signup);
  }
});

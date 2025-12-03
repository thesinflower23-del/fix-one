/* ============================================
   Firebase Realtime Database - Initialize Default Data
   ============================================
   Run this script in browser console after Firebase is initialized
   Or import and call initializeFirebaseData()
   ============================================ */

import { ref, set, get } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

// Get Firebase Database
function getDatabase() {
  return window.firebaseDatabase;
}

// Default packages data
const DEFAULT_PACKAGES = {
  "full-basic": {
    id: "full-basic",
    name: "✂️ Full Package · Basic",
    type: "any",
    duration: 75,
    includes: [
      "Bath & Dry",
      "Brush / De-Shedding",
      "Hair Cut (Basic)",
      "Nail Trim",
      "Ear Clean",
      "Foot Pad Clean",
      "Cologne"
    ],
    tiers: [
      { label: "5kg & below", price: 530 },
      { label: "5.1 – 8kg", price: 630 },
      { label: "8.1 – 15kg", price: 750 },
      { label: "15.1 – 30kg", price: 800 },
      { label: "30kg & above", price: 920 }
    ]
  },
  "full-styled": {
    id: "full-styled",
    name: "✂️ Full Package · Trimming & Styling",
    type: "any",
    duration: 90,
    includes: [
      "Bath & Dry",
      "Brush / De-Shedding",
      "Hair Cut (Styled)",
      "Nail Trim",
      "Ear Clean",
      "Foot Pad Clean",
      "Cologne"
    ],
    tiers: [
      { label: "5kg & below", price: 630 },
      { label: "5.1 – 8kg", price: 730 },
      { label: "8.1 – 15kg", price: 880 },
      { label: "15.1 – 30kg", price: 930 },
      { label: "30kg & above", price: 1050 }
    ]
  },
  "bubble-bath": {
    id: "bubble-bath",
    name: "🧴 Shampoo Bath 'n Bubble",
    type: "any",
    duration: 60,
    includes: [
      "Bath & Dry",
      "Brush / De-Shedding",
      "Hygiene Trim",
      "Nail Trim",
      "Ear Clean",
      "Foot Pad Clean",
      "Cologne"
    ],
    tiers: [
      { label: "5kg & below", price: 350 },
      { label: "5.1 – 8kg", price: 450 },
      { label: "8.1 – 15kg", price: 550 },
      { label: "15.1 – 30kg", price: 600 },
      { label: "30kg & above", price: 700 }
    ]
  },
  "single-service": {
    id: "single-service",
    name: "🚿 Single Service · Mix & Match",
    type: "any",
    duration: 45,
    includes: [
      "Choose from Nail Trim, Ear Clean, or Hygiene Focus",
      "Add to any package as needed"
    ],
    tiers: [
      { label: "Nail Trim 5kg & below", price: 50 },
      { label: "Nail Trim 30kg & above", price: 80 },
      { label: "Ear Clean 5kg & below", price: 70 },
      { label: "Ear Clean 30kg & above", price: 90 }
    ]
  },
  "addon-toothbrush": {
    id: "addon-toothbrush",
    name: "🛁 Add-on · Toothbrush",
    type: "addon",
    duration: 5,
    includes: ["Individual toothbrush to bring home"],
    tiers: [
      { label: "Per item", price: 25 }
    ]
  },
  "addon-dematting": {
    id: "addon-dematting",
    name: "🛁 Add-on · De-matting",
    type: "addon",
    duration: 25,
    includes: ["Targeted de-matting service"],
    tiers: [
      { label: "Light tangles", price: 80 },
      { label: "Heavy tangles", price: 250 }
    ]
  }
};

// Default groomers data
const DEFAULT_GROOMERS = {
  "groomer-sam": {
    id: "groomer-sam",
    name: "Sam",
    specialty: "Small breed specialist",
    maxDailyBookings: 3,
    reserve: false
  },
  "groomer-jom": {
    id: "groomer-jom",
    name: "Jom",
    specialty: "Double-coat care",
    maxDailyBookings: 3,
    reserve: false
  },
  "groomer-botchoy": {
    id: "groomer-botchoy",
    name: "Botchoy",
    specialty: "Creative trims & styling",
    maxDailyBookings: 3,
    reserve: false
  },
  "groomer-jinold": {
    id: "groomer-jinold",
    name: "Jinold",
    specialty: "Senior pet handler",
    maxDailyBookings: 3,
    reserve: false
  },
  "groomer-ejay": {
    id: "groomer-ejay",
    name: "Ejay",
    specialty: "Cat whisperer",
    maxDailyBookings: 3,
    reserve: false
  }
};

// Initialize Firebase with default data
async function initializeFirebaseData() {
  const db = getDatabase();
  
  if (!db) {
    console.error('Firebase Database not initialized!');
    alert('Firebase Database not initialized. Make sure Firebase is loaded.');
    return;
  }

  try {
    console.log('Starting Firebase data initialization...');

    // Check if packages already exist
    const packagesRef = ref(db, 'packages');
    const packagesSnapshot = await get(packagesRef);
    
    if (!packagesSnapshot.exists() || Object.keys(packagesSnapshot.val()).length === 0) {
      console.log('Initializing packages...');
      await set(packagesRef, DEFAULT_PACKAGES);
      console.log('✅ Packages initialized');
    } else {
      console.log('⚠️ Packages already exist, skipping...');
    }

    // Check if groomers already exist
    const groomersRef = ref(db, 'groomers');
    const groomersSnapshot = await get(groomersRef);
    
    if (!groomersSnapshot.exists() || Object.keys(groomersSnapshot.val()).length === 0) {
      console.log('Initializing groomers...');
      await set(groomersRef, DEFAULT_GROOMERS);
      console.log('✅ Groomers initialized');
    } else {
      console.log('⚠️ Groomers already exist, skipping...');
    }

    // Initialize empty collections if they don't exist
    const collections = ['bookings', 'users', 'customerProfiles', 'staffAbsences', 'bookingHistory', 'calendarBlackouts'];
    
    for (const collection of collections) {
      const collectionRef = ref(db, collection);
      const snapshot = await get(collectionRef);
      
      if (!snapshot.exists()) {
        await set(collectionRef, {});
        console.log(`✅ ${collection} collection initialized`);
      }
    }

    console.log('🎉 Firebase data initialization complete!');
    alert('Firebase data initialized successfully!');
    
  } catch (error) {
    console.error('Error initializing Firebase data:', error);
    alert('Error initializing data: ' + error.message);
  }
}

// Make function globally available
window.initializeFirebaseData = initializeFirebaseData;

// Export for module use
export { initializeFirebaseData, DEFAULT_PACKAGES, DEFAULT_GROOMERS };


// ============================================
// APNA BAZAR — Firebase Configuration
// ============================================
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (e.g. "apna-bazar")
// 3. Add a Web App inside it, copy the config it gives you, paste below
// 4. In the Firebase Console, enable "Firestore Database" (start in test mode
//    for now — lock it down with security rules before you launch for real)
//
// This ONE file is shared by all three apps (store, shopkeeper, delivery)
// so you only ever configure Firebase in one place.

  const firebaseConfig = {
    apiKey: "AIzaSyCeKXw7gdmpdHCcRH53lxDkJ9oF19m04SU",
    authDomain: "apnabazar-435b1.firebaseapp.com",
    projectId: "apnabazar-435b1",
    storageBucket: "apnabazar-435b1.firebasestorage.app",
    messagingSenderId: "777055036097",
    appId: "1:777055036097:web:7a785d74d4610288552a40",
    measurementId: "G-FW5W4VFV15"
  };


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth ? firebase.auth() : null; // only pages that load firebase-auth-compat.js will have this

// ---------- Shared helpers used by all three apps ----------

// Collections:
//   shops           { id = shopkeeper's auth uid, name, phone, area, createdAt }
//   products        { id, shopId (= owning shop's auth uid), shopName, name, price, unit, category, stock, area, imageUrl, createdAt }
//   customers       { id = auth uid, name, phone, address, area, email, photoURL (small compressed data URL, stored free in Firestore), createdAt }
//   deliveryPersons { id = auth uid, name, phone, walletBalance (cash held, owed to shops),
//                     earnings (confirmed delivery-charge income), location {lat,lng,updatedAt}, createdAt }
//   orders          { id, customerUid, customerName, customerPhone, address, area,
//                     items:[{productId,name,price,qty,shopId,shopName}], total, status,
//                     deliveryPersonName, deliveryPersonPhone, deliveryPersonUid,
//                     pickupLocation {lat,lng}, dropLocation {lat,lng}, distanceKm, deliveryCharge,
//                     settlement ('none'|'pending'|'accepted'), shopReceivedAmount,
//                     createdAt, updatedAt }
//
// Order status flow:
//   pending  ->  packed  ->  out_for_delivery  ->  delivered
// Settlement flow (runs alongside status once delivered):
//   none  ->  pending (delivery person requests return)  ->  accepted (shop confirms, charge deducted)

function formatRupees(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function timeAgo(ts) {
  if (!ts) return "";
  const seconds = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.floor(hrs / 24) + "d ago";
}

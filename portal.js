// Shared by shop.html and delivery.html. Needs firebase-config.js loaded first.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = { get(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const TS = () => firebase.firestore.FieldValue.serverTimestamp();
const rupees = n => "\u20B9\u00A0" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });   // symbol, then a gap, then the amount
function toast(m){ const t = $("#toast"); t.textContent = m; t.classList.add("on"); setTimeout(() => t.classList.remove("on"), 2600); }

// role: "shops" | "deliveryPersons"; extra: fields added on first registration; ready(user, data, ref) runs when allowed in
function boot(role, title, extra, ready){
  $("#login").innerHTML = `<h1>${esc(title)}</h1><div class="card"><p>Sign in with your Google account.</p>
    <label style="display:flex;gap:8px"><input type="checkbox" id="agree"><span class="s">I agree to the Terms and Privacy Policy. My details are used only to run deliveries and orders. Support: support.dsbccl@gmail.com</span></label>
    <p class="err" id="lerr" role="alert"></p><button id="go">Continue with Google</button></div>`;
  $("#go").onclick = async () => {
    const s = store.get("ab_auth_p", { fails: 0, lockUntil: 0, last: 0 }), now = Date.now(), e = $("#lerr"); e.textContent = "";
    if (!$("#agree").checked) return e.textContent = "Please accept the Terms and Privacy Policy.";
    if (now < s.lockUntil) return e.textContent = "Too many failed attempts. Try again in " + Math.ceil((s.lockUntil - now) / 60000) + " minute(s).";
    if (now - s.last < 10000) return e.textContent = "Please wait a few seconds.";
    s.last = now; store.set("ab_auth_p", s);
    try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); store.set("ab_auth_p", { fails: 0, lockUntil: 0, last: now }); }
    catch (x) { if (x.code === "auth/popup-closed-by-user") return; s.fails++; if (s.fails >= 5) { s.lockUntil = now + 900000; s.fails = 0; } store.set("ab_auth_p", s); e.textContent = "Sign-in failed (" + (x.code || x.message) + ")."; }
  };
  auth.onAuthStateChanged(async u => {
    $("#login").hidden = !!u; $("#reg").hidden = true; $("#app").hidden = true;
    if (!u) return;
    const ref = db.collection(role).doc(u.uid);
    try {
      const d = await ref.get();
      if (d.exists) return ready(u, d.data(), ref);
      if (extra === null) { // admin page: no self-registration
        $("#reg").hidden = false;
        $("#reg").innerHTML = `<h1>Not an admin</h1><div class="card"><p>This account is not an admin. To make it one, add a document in the Firestore collection <strong>admins</strong> with this ID as the document ID:</p><p><strong>${esc(u.uid)}</strong></p><button class="ghost" id="ro">Sign out</button></div>`;
        $("#ro").onclick = () => auth.signOut(); return;
      }
      $("#reg").hidden = false;
      $("#reg").innerHTML = `<h1>Register</h1><div class="card"><label for="rn">Name</label><input id="rn" value="${esc(u.displayName)}">
        <label for="rp">Phone (10 digits)</label><input id="rp" inputmode="numeric" maxlength="10">
        <label for="ra">Area</label><input id="ra">${role === "shops" ? '<label for="rpin">Shop pincode (6 digits)</label><input id="rpin" inputmode="numeric" maxlength="6"><label for="rad">Full shop address</label><input id="rad">' : ""}<p class="err" id="rerr" role="alert"></p><button id="rs">Register</button><button class="ghost" id="ro">Sign out</button></div>`;
      $("#ro").onclick = () => auth.signOut();
      $("#rs").onclick = async () => {
        const name = $("#rn").value.trim(), phone = $("#rp").value.replace(/\D/g, "").slice(-10), area = $("#ra").value.trim(), er = $("#rerr");
        if (name.length < 2) return er.textContent = "Enter your name.";
        if (!/^[6-9]\d{9}$/.test(phone)) return er.textContent = "Enter a valid 10-digit mobile number.";
        if (area.length < 2) return er.textContent = "Enter your area.";
        const more = {};
        if (role === "shops") {
          more.pincode = $("#rpin").value.trim(); more.address = $("#rad").value.trim();
          if (!/^\d{6}$/.test(more.pincode)) return er.textContent = "Enter a valid 6-digit pincode.";
          if (more.address.length < 8) return er.textContent = "Enter the full shop address.";
        }
        $("#rs").disabled = true; er.textContent = "";
        try { await ref.set({ name, phone, area, email: u.email || "", ...more, ...extra, createdAt: TS() }); location.reload(); }
        catch (x) { $("#rs").disabled = false; $("#rerr").textContent = "Could not register (" + (x.code || x.message) + ")."; }
      };
    } catch (x) { $("#login").hidden = false; $("#lerr").textContent = "Could not load your account (" + (x.code || x.message) + ")."; }
  });
}

import React, { useEffect, useMemo, useRef, useState } from "react";

// ========================= //
// Canteen Zomato-Style MVP  //
// Features:
// - Discover outlets (like Zomato): search, quick info, menus
// - Cart & checkout: place pickup orders
// - Seat booking in canteen: live grid with countdown & cancel
// - LocalStorage persistence (refresh-safe for demo)
// No backend required for this MVP. Tailwind classes for styling.
// ========================= //

// ------- Demo Data ---------
const sampleOutlets = [
  {
    id: "o1",
    name: "Spice Route",
    cuisine: ["North Indian", "Biryani"],
    rating: 4.5,
    eta: 18,
    priceLevel: "₹₹",
    menu: [
      { id: "m1", name: "Chicken Biryani", price: 220 },
      { id: "m2", name: "Paneer Butter Masala", price: 180 },
      { id: "m3", name: "Butter Naan (2)", price: 60 },
    ],
  },
  {
    id: "o2",
    name: "Campus Café",
    cuisine: ["Cafe", "Sandwiches", "Beverages"],
    rating: 4.2,
    eta: 12,
    priceLevel: "₹",
    menu: [
      { id: "m4", name: "Grilled Veg Sandwich", price: 90 },
      { id: "m5", name: "Cold Coffee", price: 80 },
      { id: "m6", name: "Chocolate Donut", price: 70 },
    ],
  },
  {
    id: "o3",
    name: "Wok & Roll",
    cuisine: ["Asian", "Noodles", "Dumplings"],
    rating: 4.3,
    eta: 22,
    priceLevel: "₹₹",
    menu: [
      { id: "m7", name: "Veg Hakka Noodles", price: 150 },
      { id: "m8", name: "Chicken Momos (6)", price: 120 },
      { id: "m9", name: "Spring Rolls (4)", price: 110 },
    ],
  },
];

const STORAGE_KEYS = {
  CART: "canteen_mvp_cart",
  ORDERS: "canteen_mvp_orders",
  SEATS: "canteen_mvp_seats",
};

const SEAT_ROWS = 6;
const SEAT_COLS = 10;
const BOOKING_MINUTES = 45; // default hold time

// ---------- Helpers ----------
const formatCurrency = (n) => `₹${n.toFixed(0)}`;
const cls = (...arr) => arr.filter(Boolean).join(" ");

function minutesFromNow(mins) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + mins);
  return d.getTime();
}

function msToTimer(ms) {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ---------- Hooks ----------
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

// ---------- Components ----------
function TopBar({ tab, setTab, search, setSearch }) {
  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="text-2xl font-black tracking-tight bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent animate-fade-in">⚡ ZapBooks</div>
        <nav className="ml-4 flex gap-1 text-sm">
          {[
            { id: "discover", label: "Discover" },
            { id: "canteen", label: "Seat Booking" },
            { id: "orders", label: "My Orders" },
            { id: "history", label: "History" },
            { id: "profile", label: "Profile" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cls(
                "px-3 py-1.5 rounded-full transition-all duration-300",
                tab === t.id
                  ? "bg-black text-white shadow-lg scale-105"
                  : "hover:bg-gray-100 text-gray-700 hover:scale-105"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex-1 max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search outlets, cuisines, dishes..."
            className="w-full border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all duration-200"
          />
        </div>
      </div>
    </div>
  );
}

function OutletCard({ outlet, onOpenMenu }) {
  return (
    <div className="rounded-2xl border p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 bg-white/80 backdrop-blur-sm animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 grid place-items-center text-2xl animate-bounce-subtle">
          🍲
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg truncate">{outlet.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium animate-pulse-subtle">
              ⭐ {outlet.rating}
            </span>
          </div>
          <div className="text-sm text-gray-600 truncate">
            {outlet.cuisine.join(" • ")}
          </div>
          <div className="text-xs text-gray-500 mt-1">{outlet.priceLevel} • {outlet.eta} min</div>
        </div>
        <button
          onClick={() => onOpenMenu(outlet)}
          className="px-3 py-2 text-sm rounded-xl bg-black text-white hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          View Menu
        </button>
      </div>
    </div>
  );
}

function Discover({ outlets, onOpenMenu }) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showOfferModal, setShowOfferModal] = useState(false);

  const categories = ["All", "Indian", "Asian", "Cafe"];
  
  const filteredByCategory = useMemo(() => {
    if (selectedCategory === "All") return outlets;
    return outlets.filter(o => 
      o.cuisine.some(c => c.toLowerCase().includes(selectedCategory.toLowerCase()))
    );
  }, [outlets, selectedCategory]);

  const trendingItems = [
    { name: "Chicken Biryani", outlet: "Spice Route", price: 220, emoji: "🍛", outletId: "o1", menuId: "m1" },
    { name: "Cold Coffee", outlet: "Campus Café", price: 80, emoji: "☕", outletId: "o2", menuId: "m5" },
    { name: "Chicken Momos (6)", outlet: "Wok & Roll", price: 120, emoji: "🥟", outletId: "o3", menuId: "m8" },
    { name: "Paneer Butter Masala", outlet: "Spice Route", price: 180, emoji: "🍢", outletId: "o1", menuId: "m2" },
  ];

  const handleTrendingItemClick = (item) => {
    const outlet = outlets.find(o => o.id === item.outletId);
    if (outlet) {
      onOpenMenu(outlet);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-8 text-white animate-fade-in">
        <div className="relative z-10">
          <div className="text-4xl font-black mb-2">🎉 Welcome to ZapBooks!</div>
          <div className="text-lg mb-4">Order delicious food & book your perfect seat in seconds</div>
          <div className="flex gap-3">
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium">
              ⚡ Fast Delivery
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium">
              💺 Instant Booking
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium">
              🎁 Daily Offers
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 animate-fade-in hover:scale-105 transition-transform duration-300 cursor-pointer">
          <div className="text-3xl mb-1">🍽️</div>
          <div className="text-2xl font-bold text-blue-700">{outlets.length}</div>
          <div className="text-xs text-blue-600">Active Outlets</div>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 animate-fade-in hover:scale-105 transition-transform duration-300 cursor-pointer" style={{animationDelay: '50ms'}}>
          <div className="text-3xl mb-1">⭐</div>
          <div className="text-2xl font-bold text-green-700">4.5</div>
          <div className="text-xs text-green-600">Avg Rating</div>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 animate-fade-in hover:scale-105 transition-transform duration-300 cursor-pointer" style={{animationDelay: '100ms'}}>
          <div className="text-3xl mb-1">⚡</div>
          <div className="text-2xl font-bold text-orange-700">15</div>
          <div className="text-xs text-orange-600">Min Delivery</div>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 animate-fade-in hover:scale-105 transition-transform duration-300 cursor-pointer" style={{animationDelay: '150ms'}} onClick={() => setShowOfferModal(true)}>
          <div className="text-3xl mb-1">🎉</div>
          <div className="text-2xl font-bold text-purple-700">20%</div>
          <div className="text-xs text-purple-600">Off Today</div>
        </div>
      </div>

      {/* Trending Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">🔥 Trending Now</h3>
          <button 
            onClick={() => setSelectedCategory("All")}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline transition-all"
          >
            View All →
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trendingItems.map((item, idx) => (
            <div 
              key={idx} 
              onClick={() => handleTrendingItemClick(item)}
              className="p-4 rounded-2xl border bg-white hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer animate-fade-in" 
              style={{animationDelay: `${idx * 60}ms`}}
            >
              <div className="text-4xl mb-2 animate-bounce-subtle">{item.emoji}</div>
              <div className="font-semibold text-sm mb-1">{item.name}</div>
              <div className="text-xs text-gray-500 mb-2">{item.outlet}</div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-600">{formatCurrency(item.price)}</span>
                <button className="w-7 h-7 rounded-full bg-black text-white text-xs hover:scale-110 active:scale-95 transition-all duration-200">+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Promotional Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 p-6 animate-fade-in">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-white mb-1">🎁 First Order Special!</div>
            <div className="text-white/90">Get 30% OFF on orders above ₹500</div>
          </div>
          <button 
            onClick={() => setShowOfferModal(true)}
            className="px-6 py-3 bg-white text-orange-600 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
          >
            Claim Now
          </button>
        </div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
      </div>

      {/* All Outlets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">🍽️ All Outlets</h3>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cls(
                  "px-3 py-1.5 rounded-full text-xs transition-all duration-200",
                  selectedCategory === cat 
                    ? "bg-black text-white shadow-lg scale-105" 
                    : "border hover:bg-gray-50 hover:scale-105"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredByCategory.length > 0 ? (
            filteredByCategory.map((o, idx) => (
              <div key={o.id} style={{animationDelay: `${idx * 100}ms`}}>
                <OutletCard outlet={o} onOpenMenu={onOpenMenu} />
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">😕</div>
              <div>No outlets found in this category</div>
            </div>
          )}
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setShowOfferModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold mb-2">Special Offer!</h3>
              <p className="text-gray-600 mb-6">
                Get <strong className="text-orange-600">30% OFF</strong> on your first order above ₹500. 
                Use code: <strong className="text-green-600">FIRST30</strong>
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowOfferModal(false);
                    navigator.clipboard?.writeText('FIRST30');
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  Copy Code
                </button>
                <button 
                  onClick={() => setShowOfferModal(false)}
                  className="w-full px-6 py-3 border rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuSheet({ outlet, onClose, onAdd }) {
  if (!outlet) return null;
  return (
    <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center gap-3 bg-gradient-to-r from-orange-50 to-red-50">
          <div className="text-2xl animate-bounce-subtle">🍲</div>
          <div>
            <div className="font-semibold">{outlet.name}</div>
            <div className="text-xs text-gray-600">{outlet.cuisine.join(" • ")}</div>
          </div>
          <button className="ml-auto text-gray-500 hover:text-black hover:rotate-90 transition-all duration-300" onClick={onClose}>✕</button>
        </div>
        <div className="divide-y max-h-[60vh] overflow-y-auto">
          {outlet.menu.map((item, idx) => (
            <div key={item.id} className="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors duration-200 animate-fade-in" style={{animationDelay: `${idx * 50}ms`}}>
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-600">{formatCurrency(item.price)}</div>
              </div>
              <button
                onClick={() => onAdd(outlet, item)}
                className="px-3 py-1.5 rounded-xl border hover:bg-black hover:text-white hover:border-black transition-all duration-200 text-sm active:scale-95"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Cart({ cart, onChangeQty, onCheckout }) {
  const total = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const itemCount = cart.reduce((s, it) => s + it.qty, 0);
  
  return (
    <div className="sticky bottom-4 z-10 animate-slide-up">
      <div className="max-w-6xl mx-auto px-4">
        <div className={cls(
          "rounded-2xl border backdrop-blur-sm transition-all duration-300 relative overflow-hidden",
          cart.length ? "p-4 scale-100 bg-white shadow-2xl" : "p-3 text-gray-500 scale-95 bg-white/80 shadow-lg"
        )}>
          {cart.length > 0 && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 animate-shimmer"></div>
          )}
          {cart.length === 0 ? (
            <div className="text-sm flex items-center gap-2">
              <span className="text-xl">🛒</span>
              <span>Your cart is empty. Add items from a menu.</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-lg font-bold flex items-center gap-2">
                  🛒 Cart <span className="text-sm px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{itemCount} items</span>
                </div>
                <button 
                  onClick={() => cart.forEach(it => onChangeQty(it.key, 0))}
                  className="ml-auto text-xs text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>
              <div className="max-h-56 overflow-auto divide-y">
                {cart.map((it, idx) => (
                  <div key={it.key} className="py-2 flex items-center gap-3 animate-fade-in" style={{animationDelay: `${idx * 30}ms`}}>
                    <div className="flex-1">
                      <div className="text-sm font-medium truncate">{it.name} <span className="text-xs text-gray-500">• {it.outletName}</span></div>
                      <div className="text-xs text-gray-500">{formatCurrency(it.price)}</div>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                      <button className="w-7 h-7 rounded-md bg-white border hover:bg-red-50 hover:border-red-300 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center text-red-600 font-bold" onClick={() => onChangeQty(it.key, it.qty - 1)}>−</button>
                      <div className="text-sm w-8 text-center font-bold">{it.qty}</div>
                      <button className="w-7 h-7 rounded-md bg-white border hover:bg-green-50 hover:border-green-300 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center text-green-600 font-bold" onClick={() => onChangeQty(it.key, it.qty + 1)}>+</button>
                    </div>
                    <div className="w-20 text-right text-sm font-bold text-orange-600">{formatCurrency(it.price * it.qty)}</div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t mt-3 flex items-center">
                <div className="flex-1">
                  <div className="text-xs text-gray-500 mb-1">Total Amount</div>
                  <div className="text-2xl font-black text-orange-600">{formatCurrency(total)}</div>
                </div>
                <button
                  onClick={onCheckout}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:from-orange-600 hover:to-red-600 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg flex items-center gap-2"
                >
                  <span>Place Order</span>
                  <span className="text-xl">→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Seat({ seat, onSelect }) {
  const now = Date.now();
  const remaining = (seat.until || 0) - now;
  const isActive = seat.status === "booked" && remaining > 0;
  return (
    <button
      title={seat.label}
      onClick={() => onSelect(seat)}
      className={cls(
        "aspect-square rounded-xl text-xs grid place-items-center border transition-all duration-300",
        seat.status === "free" && "bg-white hover:bg-green-50 hover:border-green-300 hover:scale-110 hover:shadow-md",
        isActive && "bg-emerald-50 border-emerald-300 animate-pulse-subtle scale-105",
        seat.status === "booked" && !isActive && "bg-gray-100 text-gray-400 border-gray-200 line-through opacity-50"
      )}
    >
      <div className="font-semibold">{seat.label}</div>
      {isActive && <div className="text-[10px] mt-0.5 font-mono">{msToTimer(remaining)}</div>}
    </button>
  );
}

function CanteenSeats({ seats, setSeats }) {
  // tick every second to force countdown re-render
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const onSelect = (seat) => {
    // Clicking a free seat books it for BOOKING_MINUTES
    if (seat.status === "free") {
      const updated = seats.map((s) =>
        s.id === seat.id ? { ...s, status: "booked", until: minutesFromNow(BOOKING_MINUTES) } : s
      );
      setSeats(updated);
      return;
    }
    // Clicking an active seat cancels it
    if (seat.status === "booked") {
      const updated = seats.map((s) => (s.id === seat.id ? { ...s, status: "free", until: null } : s));
      setSeats(updated);
    }
  };

  const freeCount = seats.filter((s) => s.status === "free").length;
  const bookedCount = seats.filter((s) => s.status === "booked" && (s.until || 0) > Date.now()).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 animate-fade-in">
          <div className="text-3xl font-bold text-green-700">{freeCount}</div>
          <div className="text-sm text-green-600">Available Seats</div>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 animate-fade-in" style={{animationDelay: '100ms'}}>
          <div className="text-3xl font-bold text-blue-700">{bookedCount}</div>
          <div className="text-sm text-blue-600">Currently Booked</div>
        </div>
        <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 animate-fade-in" style={{animationDelay: '200ms'}}>
          <div className="text-3xl font-bold text-orange-700">{BOOKING_MINUTES}</div>
          <div className="text-sm text-orange-600">Minutes per Booking</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold">Seat Map</div>
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border inline-block"/> Free</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-50 border-emerald-300 border inline-block"/> Booked</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border-gray-200 inline-block"/> Expired</span>
        </div>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
        {seats.map((seat) => (
          <Seat key={seat.id} seat={seat} onSelect={onSelect} />
        ))}
      </div>
      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-xl p-3">
        💡 <strong>Tip:</strong> Click a free seat to book it for {BOOKING_MINUTES} minutes. Click again to cancel your booking.
      </div>
    </div>
  );
}

function OrdersView({ orders, onAdvance }) {
  const stages = ["Received", "Preparing", "Ready for Pickup", "Completed"];
  const getStatusColor = (status) => {
    switch(status) {
      case "Received": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Preparing": return "bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse-subtle";
      case "Ready for Pickup": return "bg-green-100 text-green-700 border-green-200 animate-bounce-subtle";
      case "Completed": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };
  return (
    <div className="space-y-3">
      {orders.length === 0 && (
        <div className="text-sm text-gray-600">No orders yet. Place your first order from Discover.</div>
      )}
      {orders.map((o, idx) => (
        <div key={o.id} className="rounded-2xl border p-4 bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-fade-in" style={{animationDelay: `${idx * 100}ms`}}>
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold">Order #{o.id.slice(-6).toUpperCase()}</div>
            <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{o.outletName}</div>
            <div className="ml-auto text-xs text-gray-500">{new Date(o.createdAt).toLocaleString()}</div>
          </div>
          <div className="mt-2 text-sm">
            {o.items.map((it) => (
              <div key={it.key} className="flex justify-between">
                <div>
                  {it.name} × {it.qty}
                </div>
                <div className="font-medium">{formatCurrency(it.price * it.qty)}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center">
            <div className="text-sm font-semibold">Total: {formatCurrency(o.total)}</div>
            <div className="ml-auto">
              <span className={`text-xs px-3 py-1 rounded-full border font-medium ${getStatusColor(o.status)}`}>
                {o.status}
              </span>
            </div>
          </div>
          {o.status !== "Completed" && (
            <div className="mt-3">
              <button
                onClick={() => onAdvance(o.id)}
                className="px-3 py-1.5 rounded-xl border text-sm hover:bg-black hover:text-white hover:border-black transition-all duration-200 active:scale-95"
              >
                Advance Status →
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HistoryView({ orders, seats }) {
  const completedOrders = orders.filter((o) => o.status === "Completed");
  const totalSpent = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalBookings = seats.filter((s) => s.status === "booked" || s.until).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 animate-fade-in">
          <div className="text-3xl font-bold text-purple-700">{completedOrders.length}</div>
          <div className="text-sm text-purple-600">Completed Orders</div>
        </div>
        <div className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 animate-fade-in" style={{animationDelay: '100ms'}}>
          <div className="text-3xl font-bold text-green-700">{formatCurrency(totalSpent)}</div>
          <div className="text-sm text-green-600">Total Spent</div>
        </div>
        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 animate-fade-in" style={{animationDelay: '200ms'}}>
          <div className="text-3xl font-bold text-blue-700">{totalBookings}</div>
          <div className="text-sm text-blue-600">Seat Bookings</div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Order History</h3>
        {completedOrders.length === 0 ? (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-8 text-center">
            No completed orders yet. Complete your first order to see it here!
          </div>
        ) : (
          <div className="space-y-3">
            {completedOrders.map((o, idx) => (
              <div key={o.id} className="rounded-xl border p-4 bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-300 animate-fade-in" style={{animationDelay: `${idx * 50}ms`}}>
                <div className="flex items-center gap-2">
                  <div className="font-semibold">#{o.id.slice(-6).toUpperCase()}</div>
                  <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{o.outletName}</div>
                  <div className="ml-auto text-xs text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {o.items.length} item(s) • {formatCurrency(o.total)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {orders.slice(0, 5).map((o, idx) => (
            <div key={o.id} className="flex items-center gap-3 text-sm p-3 rounded-xl bg-white/60 backdrop-blur-sm animate-fade-in" style={{animationDelay: `${idx * 40}ms`}}>
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <div className="flex-1">Order placed at <strong>{o.outletName}</strong></div>
              <div className="text-xs text-gray-500">{new Date(o.createdAt).toLocaleTimeString()}</div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-6 text-center">
              No activity yet. Start by placing an order!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileView() {
  const [profile, setProfile] = useState({
    name: "Guest User",
    email: "user@zapbooks.com",
    phone: "+91 98765 43210",
    preferences: "Vegetarian",
    notifications: true,
  });

  const [editing, setEditing] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  const handleSave = () => {
    setEditing(false);
    // Save to localStorage
    localStorage.setItem('zapbooks_profile', JSON.stringify(profile));
  };

  const quickActions = [
    { 
      id: 'payment', 
      icon: '💳', 
      title: 'Payment Methods', 
      desc: 'Manage your saved cards',
      modal: 'payment'
    },
    { 
      id: 'address', 
      icon: '📍', 
      title: 'Saved Addresses', 
      desc: 'Manage delivery locations',
      modal: 'address'
    },
    { 
      id: 'offers', 
      icon: '🎁', 
      title: 'Offers & Rewards', 
      desc: 'View available discounts',
      modal: 'offers'
    },
    { 
      id: 'help', 
      icon: '❓', 
      title: 'Help & Support', 
      desc: 'Get assistance',
      modal: 'help'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-6 bg-white/80 backdrop-blur-sm animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-red-500 grid place-items-center text-3xl text-white font-bold shadow-lg">
            {profile.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <p className="text-sm text-gray-600">{profile.email}</p>
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className="px-4 py-2 rounded-xl bg-black text-white text-sm hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {editing ? "Save Changes" : "Edit Profile"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4 bg-white/80 backdrop-blur-sm animate-fade-in" style={{animationDelay: '100ms'}}>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
          <input
            type="tel"
            value={profile.phone}
            disabled={!editing}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 disabled:bg-gray-50 disabled:text-gray-600"
          />
        </div>

        <div className="rounded-xl border p-4 bg-white/80 backdrop-blur-sm animate-fade-in" style={{animationDelay: '150ms'}}>
          <label className="block text-sm font-medium text-gray-700 mb-2">Food Preferences</label>
          <select
            value={profile.preferences}
            disabled={!editing}
            onChange={(e) => setProfile({ ...profile, preferences: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 disabled:bg-gray-50 disabled:text-gray-600"
          >
            <option>Vegetarian</option>
            <option>Non-Vegetarian</option>
            <option>Vegan</option>
            <option>No Preference</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border p-4 bg-white/80 backdrop-blur-sm animate-fade-in" style={{animationDelay: '200ms'}}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Push Notifications</div>
            <div className="text-xs text-gray-600">Get notified about order status and offers</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={profile.notifications}
              onChange={(e) => setProfile({ ...profile, notifications: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-black/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action, idx) => (
            <button 
              key={action.id}
              onClick={() => setActiveModal(action.modal)}
              className="p-4 rounded-xl border bg-white hover:shadow-lg hover:scale-105 transition-all duration-200 text-left animate-fade-in"
              style={{animationDelay: `${idx * 50}ms`}}
            >
              <div className="text-lg mb-1">{action.icon} {action.title}</div>
              <div className="text-xs text-gray-600">{action.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'payment' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">💳 Payment Methods</h3>
            <div className="space-y-3 mb-6">
              <div className="p-4 border rounded-xl hover:bg-gray-50 cursor-pointer">
                <div className="font-semibold">Visa •••• 4242</div>
                <div className="text-xs text-gray-500">Expires 12/26</div>
              </div>
              <div className="p-4 border rounded-xl hover:bg-gray-50 cursor-pointer">
                <div className="font-semibold">Mastercard •••• 8888</div>
                <div className="text-xs text-gray-500">Expires 03/27</div>
              </div>
              <button className="w-full p-4 border-2 border-dashed rounded-xl hover:bg-gray-50 transition-all text-sm font-medium">
                + Add New Card
              </button>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {activeModal === 'address' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">📍 Saved Addresses</h3>
            <div className="space-y-3 mb-6">
              <div className="p-4 border rounded-xl hover:bg-gray-50 cursor-pointer">
                <div className="font-semibold flex items-center gap-2">
                  <span>🏠</span> Home
                </div>
                <div className="text-xs text-gray-500 mt-1">123 Main St, Apartment 4B, City 100001</div>
              </div>
              <div className="p-4 border rounded-xl hover:bg-gray-50 cursor-pointer">
                <div className="font-semibold flex items-center gap-2">
                  <span>💼</span> Office
                </div>
                <div className="text-xs text-gray-500 mt-1">456 Work Plaza, Floor 3, City 100002</div>
              </div>
              <button className="w-full p-4 border-2 border-dashed rounded-xl hover:bg-gray-50 transition-all text-sm font-medium">
                + Add New Address
              </button>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {activeModal === 'offers' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">🎁 Offers & Rewards</h3>
            <div className="space-y-3 mb-6">
              <div className="p-4 border-2 border-orange-200 bg-orange-50 rounded-xl">
                <div className="font-bold text-orange-600 mb-1">FIRST30</div>
                <div className="text-sm mb-2">30% OFF on orders above ₹500</div>
                <div className="text-xs text-gray-500">Valid till Dec 31, 2025</div>
              </div>
              <div className="p-4 border-2 border-green-200 bg-green-50 rounded-xl">
                <div className="font-bold text-green-600 mb-1">SEAT20</div>
                <div className="text-sm mb-2">₹20 OFF on seat bookings</div>
                <div className="text-xs text-gray-500">Valid till Nov 30, 2025</div>
              </div>
              <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-xl">
                <div className="font-bold text-blue-600 mb-1">FREESHIP</div>
                <div className="text-sm mb-2">Free delivery on orders above ₹300</div>
                <div className="text-xs text-gray-500">Valid till Dec 15, 2025</div>
              </div>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">❓ Help & Support</h3>
            <div className="space-y-3 mb-6">
              <a href="mailto:support@zapbooks.com" className="block p-4 border rounded-xl hover:bg-gray-50 transition-all">
                <div className="font-semibold flex items-center gap-2">
                  <span>📧</span> Email Support
                </div>
                <div className="text-xs text-gray-500 mt-1">support@zapbooks.com</div>
              </a>
              <a href="tel:+919876543210" className="block p-4 border rounded-xl hover:bg-gray-50 transition-all">
                <div className="font-semibold flex items-center gap-2">
                  <span>📞</span> Call Us
                </div>
                <div className="text-xs text-gray-500 mt-1">+91 98765 43210</div>
              </a>
              <button className="w-full p-4 border rounded-xl hover:bg-gray-50 transition-all text-left">
                <div className="font-semibold flex items-center gap-2">
                  <span>💬</span> Live Chat
                </div>
                <div className="text-xs text-gray-500 mt-1">Start a conversation with our team</div>
              </button>
              <button className="w-full p-4 border rounded-xl hover:bg-gray-50 transition-all text-left">
                <div className="font-semibold flex items-center gap-2">
                  <span>📚</span> FAQ
                </div>
                <div className="text-xs text-gray-500 mt-1">Browse frequently asked questions</div>
              </button>
            </div>
            <button onClick={() => setActiveModal(null)} className="w-full px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("discover");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useLocalStorage(STORAGE_KEYS.CART, []);
  const [orders, setOrders] = useLocalStorage(STORAGE_KEYS.ORDERS, []);
  const [menuFor, setMenuFor] = useState(null);

  // Init seats only once
  const initialSeats = useMemo(() => {
    const out = [];
    for (let r = 0; r < SEAT_ROWS; r++) {
      for (let c = 0; c < SEAT_COLS; c++) {
        const id = `S${r + 1}-${c + 1}`;
        out.push({ id, label: id, status: "free", until: null });
      }
    }
    return out;
  }, []);
  const [seats, setSeats] = useLocalStorage(STORAGE_KEYS.SEATS, initialSeats);

  // Auto-expire seats whose time has passed
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const updated = seats.map((s) => {
        if (s.status === "booked" && s.until && s.until <= now) {
          changed = true;
          return { ...s, status: "free", until: null };
        }
        return s;
      });
      if (changed) setSeats(updated);
    }, 5_000);
    return () => clearInterval(id);
  }, [seats, setSeats]);

  const filteredOutlets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sampleOutlets;
    return sampleOutlets.filter((o) =>
      o.name.toLowerCase().includes(q) ||
      o.cuisine.some((c) => c.toLowerCase().includes(q)) ||
      o.menu.some((m) => m.name.toLowerCase().includes(q))
    );
  }, [search]);

  // Cart handlers
  const addToCart = (outlet, item) => {
    const key = `${outlet.id}_${item.id}`;
    setCart((prev) => {
      const existing = prev.find((x) => x.key === key);
      if (existing) {
        return prev.map((x) => (x.key === key ? { ...x, qty: x.qty + 1 } : x));
      }
      return [
        ...prev,
        { key, outletId: outlet.id, outletName: outlet.name, name: item.name, price: item.price, qty: 1 },
      ];
    });
  };

  const changeQty = (key, qty) => {
    setCart((prev) => prev
      .map((x) => (x.key === key ? { ...x, qty } : x))
      .filter((x) => x.qty > 0)
    );
  };

  const checkout = () => {
    if (!cart.length) return;
    const total = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const outletName = cart[0].outletName;
    const newOrder = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      items: cart,
      total,
      outletName,
      status: "Received",
    };
    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setTab("orders");
  };

  // Auto-advance order statuses every ~25 seconds (demo)
  useEffect(() => {
    const id = setInterval(() => {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.status === "Received") return { ...o, status: "Preparing" };
          if (o.status === "Preparing") return { ...o, status: "Ready for Pickup" };
          return o;
        })
      );
    }, 25_000);
    return () => clearInterval(id);
  }, [setOrders]);

  const advanceOrder = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        if (o.status === "Received") return { ...o, status: "Preparing" };
        if (o.status === "Preparing") return { ...o, status: "Ready for Pickup" };
        if (o.status === "Ready for Pickup") return { ...o, status: "Completed" };
        return o;
      })
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 animate-gradient">
      <TopBar tab={tab} setTab={setTab} search={search} setSearch={setSearch} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {tab === "discover" && (
          <Discover outlets={filteredOutlets} onOpenMenu={setMenuFor} />
        )}

        {tab === "canteen" && (
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Seat Booking</h2>
              <span className="text-sm text-gray-600">Reserve your spot in the canteen.</span>
            </div>
            <CanteenSeats seats={seats} setSeats={setSeats} />
          </>
        )}

        {tab === "orders" && (
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">My Orders</h2>
              <span className="text-sm text-gray-600">Track status and totals.</span>
            </div>
            <OrdersView orders={orders} onAdvance={advanceOrder} />
          </>
        )}

        {tab === "history" && (
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">History</h2>
              <span className="text-sm text-gray-600">View your past orders and activity.</span>
            </div>
            <HistoryView orders={orders} seats={seats} />
          </>
        )}

        {tab === "profile" && (
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Profile</h2>
              <span className="text-sm text-gray-600">Manage your account settings.</span>
            </div>
            <ProfileView />
          </>
        )}
      </main>

      <Cart cart={cart} onChangeQty={changeQty} onCheckout={checkout} />

      <MenuSheet outlet={menuFor} onClose={() => setMenuFor(null)} onAdd={addToCart} />

      <footer className="max-w-6xl mx-auto px-4 py-10 text-center text-xs text-gray-500">
        <div className="mb-2">⚡ <strong>ZapBooks</strong> - Your Complete Canteen Solution</div>
        <div>Order Food • Book Seats • Track Orders • Manage Profile</div>
        <div className="mt-2">Built as a demo MVP • No backend required • Data persists in your browser</div>
      </footer>
    </div>
  );
}

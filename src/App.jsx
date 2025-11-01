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
  FAVORITES: "zapbooks_favorites",
  WALLET: "zapbooks_wallet",
  LOYALTY_POINTS: "zapbooks_loyalty_points",
  REVIEWS: "zapbooks_reviews",
  NOTIFICATIONS: "zapbooks_notifications",
  DARK_MODE: "zapbooks_dark_mode",
  REFERRAL_CODE: "zapbooks_referral_code",
  RECOMMENDATIONS: "zapbooks_recommendations",
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
function TopBar({ tab, setTab, search, setSearch, darkMode, setDarkMode }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useLocalStorage(STORAGE_KEYS.NOTIFICATIONS, [
    { id: 1, type: 'order', message: 'Your order is ready for pickup!', time: '5 min ago', read: false },
    { id: 2, type: 'offer', message: 'New offer: 30% off on orders above ₹500', time: '1 hour ago', read: false },
    { id: 3, type: 'seat', message: 'Your seat booking expires in 15 minutes', time: '2 hours ago', read: true },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

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
        <div className="ml-auto flex items-center gap-3">
          <div className="flex-1 max-w-md relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search outlets, cuisines, dishes..."
              className="w-full border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black transition-all duration-200"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-gray-100 transition-all text-xl"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-all"
            >
              <span className="text-xl">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse-subtle">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border overflow-hidden animate-slide-up z-50">
                <div className="p-3 border-b bg-gray-50 font-semibold">Notifications</div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">No notifications</div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className={cls(
                        "p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors",
                        !notif.read && "bg-blue-50"
                      )}>
                        <div className="flex items-start gap-2">
                          <span className="text-lg">
                            {notif.type === 'order' && '📦'}
                            {notif.type === 'offer' && '🎁'}
                            {notif.type === 'seat' && '💺'}
                          </span>
                          <div className="flex-1">
                            <div className="text-sm">{notif.message}</div>
                            <div className="text-xs text-gray-500 mt-1">{notif.time}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="w-full p-3 text-center text-sm text-gray-600 hover:bg-gray-50 border-t"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OutletCard({ outlet, onOpenMenu }) {
  const [favorites, setFavorites] = useLocalStorage(STORAGE_KEYS.FAVORITES, []);
  const isFavorite = favorites.includes(outlet.id);

  const toggleFavorite = (e) => {
    e.stopPropagation();
    if (isFavorite) {
      setFavorites(favorites.filter(id => id !== outlet.id));
    } else {
      setFavorites([...favorites, outlet.id]);
    }
  };

  return (
    <div className="rounded-2xl border p-4 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 bg-white/80 backdrop-blur-sm animate-fade-in relative">
      <button
        onClick={toggleFavorite}
        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-md hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center z-10"
      >
        <span className={cls("text-lg", isFavorite ? "animate-bounce-subtle" : "")}>
          {isFavorite ? "❤️" : "🤍"}
        </span>
      </button>
      
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
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            <span>{outlet.priceLevel}</span>
            <span>•</span>
            <span>⚡ {outlet.eta} min</span>
            <span>•</span>
            <span className="text-green-600 font-medium">Open Now</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onOpenMenu(outlet)}
        className="w-full mt-3 px-3 py-2 text-sm rounded-xl bg-black text-white hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        View Menu
      </button>
    </div>
  );
}

// Review Component
function ReviewsSection({ outletId }) {
  const [reviews, setReviews] = useLocalStorage(STORAGE_KEYS.REVIEWS, {});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', name: 'Guest User' });
  
  const outletReviews = reviews[outletId] || [];
  const avgRating = outletReviews.length > 0 
    ? (outletReviews.reduce((sum, r) => sum + r.rating, 0) / outletReviews.length).toFixed(1)
    : '0.0';

  const submitReview = () => {
    const review = {
      ...newReview,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    setReviews({
      ...reviews,
      [outletId]: [review, ...(reviews[outletId] || [])],
    });
    setNewReview({ rating: 5, comment: '', name: 'Guest User' });
    setShowReviewModal(false);
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <span className="text-xl font-bold">{avgRating}</span>
          <span className="text-sm text-gray-500">({outletReviews.length} reviews)</span>
        </div>
        <button 
          onClick={() => setShowReviewModal(true)}
          className="px-4 py-2 rounded-xl border-2 border-orange-500 text-orange-600 font-medium hover:bg-orange-50 transition-all text-sm"
        >
          ✍️ Write Review
        </button>
      </div>

      {outletReviews.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {outletReviews.slice(0, 3).map((review) => (
            <div key={review.id} className="p-3 rounded-xl bg-gray-50 border">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-yellow-500">{'⭐'.repeat(review.rating)}</div>
                <span className="text-sm font-semibold">{review.name}</span>
              </div>
              <p className="text-sm text-gray-700">{review.comment}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(review.date).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm grid place-items-center p-4" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Write a Review</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setNewReview({ ...newReview, rating: star })}
                    className="text-3xl hover:scale-110 transition-transform"
                  >
                    {star <= newReview.rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Your Name</label>
              <input
                type="text"
                value={newReview.name}
                onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                className="w-full border-2 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Your Review</label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                rows={4}
                className="w-full border-2 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                placeholder="Share your experience..."
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowReviewModal(false)}
                className="flex-1 px-4 py-2 border-2 rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={submitReview}
                disabled={!newReview.comment.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Recommendations Component
function RecommendationsWidget({ orders, outlets }) {
  const [recommendations, setRecommendations] = useLocalStorage(STORAGE_KEYS.RECOMMENDATIONS, []);

  useEffect(() => {
    // Generate recommendations based on order history
    if (orders.length > 0) {
      const lastOrderOutlet = orders[orders.length - 1]?.outletName;
      const suggested = outlets.filter(o => o.name !== lastOrderOutlet).slice(0, 2);
      setRecommendations(suggested);
    }
  }, [orders, outlets]);

  if (recommendations.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🎯</span>
        <h3 className="text-lg font-bold text-purple-700">Recommended for You</h3>
      </div>
      <div className="space-y-3">
        {recommendations.map((outlet) => (
          <div key={outlet.id} className="p-3 rounded-xl bg-white border border-purple-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 grid place-items-center text-2xl">
                🍽️
              </div>
              <div className="flex-1">
                <div className="font-bold">{outlet.name}</div>
                <div className="text-xs text-gray-600">{outlet.cuisine.join(', ')}</div>
                <div className="text-xs text-purple-600 font-medium mt-1">⭐ {outlet.rating} • {outlet.eta} min</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Discover({ outlets, onOpenMenu, orders = [] }) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [walletBalance] = useLocalStorage(STORAGE_KEYS.WALLET, 500);
  const [loyaltyPoints] = useLocalStorage(STORAGE_KEYS.LOYALTY_POINTS, 1250);
  const [favorites] = useLocalStorage(STORAGE_KEYS.FAVORITES, []);
  const [referralCode] = useLocalStorage(STORAGE_KEYS.REFERRAL_CODE, "ZAP" + Math.random().toString(36).substr(2, 6).toUpperCase());

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

  const favoriteOutlets = outlets.filter(o => favorites.includes(o.id));

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 p-8 text-white animate-fade-in">
        <div className="relative z-10">
          <div className="text-4xl font-black mb-2">🎉 Welcome to ZapBooks!</div>
          <div className="text-lg mb-4">Order delicious food & book your perfect seat in seconds</div>
          <div className="flex gap-3 flex-wrap">
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium">
              ⚡ Fast Delivery
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium">
              💺 Instant Booking
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium">
              🎁 Daily Offers
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium">
              💰 Wallet: ₹{walletBalance}
            </div>
            <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium">
              ⭐ {loyaltyPoints} Points
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

      {/* Favorites Section */}
      {favoriteOutlets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">❤️ Your Favorites</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteOutlets.map((o, idx) => (
              <div key={o.id} style={{animationDelay: `${idx * 100}ms`}}>
                <OutletCard outlet={o} onOpenMenu={onOpenMenu} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Widget */}
      {orders.length > 0 && <RecommendationsWidget orders={orders} outlets={outlets} />}

      {/* Referral Program Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-6 animate-fade-in cursor-pointer" onClick={() => setShowReferralModal(true)}>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-white mb-1">🎁 Refer & Earn!</div>
            <div className="text-white/90 text-sm">Share your code and get ₹100 per referral</div>
          </div>
          <button className="px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg">
            Share Now
          </button>
        </div>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
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

      {/* Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setShowReferralModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-6xl mb-4">🎁</div>
              <h3 className="text-2xl font-bold mb-2">Refer & Earn</h3>
              <p className="text-gray-600 mb-6">
                Share your unique referral code with friends and earn ₹100 for each successful referral!
              </p>
              
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300">
                <div className="text-sm text-purple-600 font-medium mb-2">Your Referral Code</div>
                <div className="text-3xl font-black text-purple-700 tracking-wider">{referralCode}</div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    navigator.clipboard?.writeText(referralCode);
                    alert('Referral code copied! 🎉');
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  📋 Copy Code
                </button>
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Join ZapBooks',
                        text: `Use my referral code ${referralCode} and get ₹50 off on your first order!`,
                      });
                    }
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  📤 Share Code
                </button>
                <button 
                  onClick={() => setShowReferralModal(false)}
                  className="w-full px-6 py-3 border rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="text-sm font-medium text-blue-900 mb-2">📊 Your Referral Stats</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">0</div>
                    <div className="text-xs text-blue-600">Referrals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">₹0</div>
                    <div className="text-xs text-green-600">Earned</div>
                  </div>
                </div>
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
        
        {/* Menu Items */}
        <div className="divide-y max-h-[45vh] overflow-y-auto">
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
        
        {/* Reviews Section in Menu */}
        <div className="p-4 border-t bg-gray-50">
          <ReviewsSection outletId={outlet.id} />
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
    bio: "Food enthusiast & bookworm 📚",
    joinDate: "2024-01-15",
    level: "Gold",
  });

  const [editing, setEditing] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [walletBalance, setWalletBalance] = useLocalStorage(STORAGE_KEYS.WALLET, 500);
  const [loyaltyPoints, setLoyaltyPoints] = useLocalStorage(STORAGE_KEYS.LOYALTY_POINTS, 1250);
  const [favorites] = useLocalStorage(STORAGE_KEYS.FAVORITES, []);
  const [notifications] = useLocalStorage(STORAGE_KEYS.NOTIFICATIONS, []);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState('');

  const handleSave = () => {
    setEditing(false);
    localStorage.setItem('zapbooks_profile', JSON.stringify(profile));
  };

  const handleAddMoney = () => {
    const amount = parseFloat(addMoneyAmount);
    if (amount > 0) {
      setWalletBalance(walletBalance + amount);
      setAddMoneyAmount('');
      setShowAddMoney(false);
    }
  };

  const redeemPoints = (points) => {
    if (loyaltyPoints >= points) {
      const cashback = points / 10; // 10 points = ₹1
      setLoyaltyPoints(loyaltyPoints - points);
      setWalletBalance(walletBalance + cashback);
      alert(`🎉 Redeemed ${points} points for ₹${cashback}!`);
    }
  };

  const quickActions = [
    { 
      id: 'wallet', 
      icon: '💰', 
      title: 'Wallet & Balance', 
      desc: `₹${walletBalance} available`,
      modal: 'wallet',
      badge: `₹${walletBalance}`
    },
    { 
      id: 'loyalty', 
      icon: '⭐', 
      title: 'Loyalty Points', 
      desc: `${loyaltyPoints} points earned`,
      modal: 'loyalty',
      badge: loyaltyPoints
    },
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
      id: 'favorites', 
      icon: '❤️', 
      title: 'My Favorites', 
      desc: `${favorites.length} saved outlets`,
      modal: 'favorites',
      badge: favorites.length
    },
    { 
      id: 'offers', 
      icon: '🎁', 
      title: 'Offers & Coupons', 
      desc: 'View available discounts',
      modal: 'offers'
    },
    { 
      id: 'security', 
      icon: '🔒', 
      title: 'Security & Privacy', 
      desc: 'Manage your account security',
      modal: 'security'
    },
    { 
      id: 'help', 
      icon: '❓', 
      title: 'Help & Support', 
      desc: '24/7 customer support',
      modal: 'help'
    },
  ];

  return (
    <div className="space-y-8 pb-6">
      {/* Premium Profile Header */}
      <div className="relative rounded-3xl border-2 overflow-hidden shadow-2xl animate-fade-in">
        {/* Background Gradient with Animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 animate-gradient"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="relative p-8">
          <div className="flex items-start gap-6 mb-8">
            <div className="relative group">
              <div className="w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-md grid place-items-center text-5xl font-black text-white shadow-2xl animate-pulse-subtle group-hover:scale-105 transition-transform duration-300 border-4 border-white/30">
                {profile.name.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 rounded-2xl grid place-items-center text-2xl shadow-xl animate-bounce-subtle border-4 border-white">
                {profile.level === "Gold" ? "👑" : "⭐"}
              </div>
            </div>
            
            <div className="flex-1 text-white">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-black tracking-tight">{profile.name}</h2>
                <span className="px-3 py-1 rounded-xl bg-white/20 backdrop-blur-md text-sm font-bold border-2 border-white/40 animate-pulse-subtle">
                  ✨ {profile.level}
                </span>
              </div>
              <p className="text-white/90 text-base mb-2 font-medium">{profile.email}</p>
              <p className="text-white/80 text-sm italic mb-3 leading-relaxed">"{profile.bio}"</p>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
                  📅 Joined {new Date(profile.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
                  ⚡ Active Member
                </span>
              </div>
            </div>
            
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className="px-6 py-3 rounded-2xl bg-white text-gray-900 text-sm font-bold hover:scale-105 active:scale-95 transition-all duration-200 shadow-2xl hover:shadow-white/20 flex items-center gap-2"
            >
              <span className="text-lg">{editing ? "💾" : "✏️"}</span>
              {editing ? "Save Changes" : "Edit Profile"}
            </button>
          </div>

          {/* Enhanced Stats Grid with Icons and Animations */}
          <div className="grid grid-cols-4 gap-4">
            <div className="group relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md p-5 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl border-2 border-white/50">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-4xl mb-2">⭐</div>
                <div className="text-3xl font-black text-orange-600 mb-1">{loyaltyPoints}</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Points</div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md p-5 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl border-2 border-white/50">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-4xl mb-2">💰</div>
                <div className="text-3xl font-black text-green-600 mb-1">₹{walletBalance}</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Wallet</div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md p-5 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl border-2 border-white/50">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-100 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-4xl mb-2">❤️</div>
                <div className="text-3xl font-black text-red-600 mb-1">{favorites.length}</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Favorites</div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md p-5 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl border-2 border-white/50">
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-100 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-4xl mb-2">🔔</div>
                <div className="text-3xl font-black text-purple-600 mb-1">{notifications.length}</div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Alerts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center text-white text-xl shadow-lg">
            👤
          </div>
          <div>
            <h3 className="text-xl font-bold">Personal Information</h3>
            <p className="text-xs text-gray-500">Manage your personal details</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="group rounded-2xl border-2 p-5 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl hover:border-orange-300 transition-all duration-300 animate-fade-in" style={{animationDelay: '100ms'}}>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
              <span className="text-xl">📱</span> Phone Number
            </label>
            <input
              type="tel"
              value={profile.phone}
              disabled={!editing}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full border-2 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all group-hover:border-orange-200"
            />
          </div>

          <div className="group rounded-2xl border-2 p-5 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl hover:border-orange-300 transition-all duration-300 animate-fade-in" style={{animationDelay: '150ms'}}>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
              <span className="text-xl">🍽️</span> Food Preferences
            </label>
            <select
              value={profile.preferences}
              disabled={!editing}
              onChange={(e) => setProfile({ ...profile, preferences: e.target.value })}
              className="w-full border-2 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all group-hover:border-orange-200"
            >
              <option>Vegetarian</option>
              <option>Non-Vegetarian</option>
              <option>Vegan</option>
              <option>No Preference</option>
            </select>
          </div>

          <div className="group rounded-2xl border-2 p-5 bg-gradient-to-br from-white to-gray-50 hover:shadow-xl hover:border-orange-300 transition-all duration-300 animate-fade-in md:col-span-2" style={{animationDelay: '200ms'}}>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
              <span className="text-xl">💬</span> Bio
            </label>
            <textarea
              value={profile.bio}
              disabled={!editing}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
              className="w-full border-2 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-600 transition-all resize-none group-hover:border-orange-200"
              placeholder="Tell us about yourself..."
            />
          </div>
        </div>
      </div>

      {/* Preferences & Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 grid place-items-center text-white text-xl shadow-lg">
            ⚙️
          </div>
          <div>
            <h3 className="text-xl font-bold">Preferences & Settings</h3>
            <p className="text-xs text-gray-500">Customize your experience</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="group rounded-2xl border-2 p-5 bg-gradient-to-br from-white to-blue-50 hover:shadow-xl hover:border-blue-300 transition-all duration-300 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center text-2xl shadow-lg">
                  🔔
                </div>
                <div>
                  <div className="font-bold text-gray-900">Push Notifications</div>
                  <div className="text-xs text-gray-500 mt-0.5">Get notified about order status and offers</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.notifications}
                  onChange={(e) => setProfile({ ...profile, notifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
              </label>
            </div>
          </div>

          <div className="group rounded-2xl border-2 p-5 bg-gradient-to-br from-white to-green-50 hover:shadow-xl hover:border-green-300 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 grid place-items-center text-2xl shadow-lg">
                  📧
                </div>
                <div>
                  <div className="font-bold text-gray-900">Email Updates</div>
                  <div className="text-xs text-gray-500 mt-0.5">Receive weekly newsletters and special offers</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
              </label>
            </div>
          </div>

          <div className="group rounded-2xl border-2 p-5 bg-gradient-to-br from-white to-purple-50 hover:shadow-xl hover:border-purple-300 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 grid place-items-center text-2xl shadow-lg">
                  📍
                </div>
                <div>
                  <div className="font-bold text-gray-900">Location Services</div>
                  <div className="text-xs text-gray-500 mt-0.5">Enable for better recommendations</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={true}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 grid place-items-center text-white text-xl shadow-lg">
            ⚡
          </div>
          <div>
            <h3 className="text-xl font-bold">Quick Actions</h3>
            <p className="text-xs text-gray-500">Access your favorite features instantly</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <button 
              key={action.id}
              onClick={() => setActiveModal(action.modal)}
              className="relative p-6 rounded-2xl border-2 bg-white hover:shadow-2xl hover:scale-105 hover:-translate-y-1 hover:border-orange-400 transition-all duration-300 text-left animate-fade-in group overflow-hidden"
              style={{animationDelay: `${idx * 50}ms`}}
            >
              {/* Animated Background Gradient on Hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-200 to-red-200 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 grid place-items-center text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-md">
                    {action.icon}
                  </div>
                  {action.badge && (
                    <div className="px-2.5 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-xl shadow-lg animate-pulse-subtle">
                      {action.badge}
                    </div>
                  )}
                </div>
                <div className="font-bold text-base mb-1.5 text-gray-900 group-hover:text-orange-600 transition-colors">
                  {action.title}
                </div>
                <div className="text-xs text-gray-600 leading-relaxed">{action.desc}</div>
                
                {/* Arrow indicator on hover */}
                <div className="absolute bottom-6 right-6 text-orange-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                  →
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Account Management Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 grid place-items-center text-white text-xl shadow-lg">
            🎯
          </div>
          <div>
            <h3 className="text-xl font-bold">Account Management</h3>
            <p className="text-xs text-gray-500">Manage your account settings</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button className="group relative p-6 rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 via-rose-50 to-red-100 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-200 rounded-full blur-3xl opacity-0 group-hover:opacity-60 transition-opacity"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 grid place-items-center text-3xl mb-3 shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all">
                🚪
              </div>
              <div className="font-bold text-base text-red-700 mb-1">Logout</div>
              <div className="text-xs text-red-600 leading-relaxed">Sign out of your account</div>
            </div>
          </button>
          
          <button className="group relative p-6 rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-200 rounded-full blur-3xl opacity-0 group-hover:opacity-60 transition-opacity"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 grid place-items-center text-3xl mb-3 shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all">
                🗑️
              </div>
              <div className="font-bold text-base text-orange-700 mb-1">Delete Account</div>
              <div className="text-xs text-orange-600 leading-relaxed">Permanently delete account</div>
            </div>
          </button>
          
          <button className="group relative p-6 rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-200 rounded-full blur-3xl opacity-0 group-hover:opacity-60 transition-opacity"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 grid place-items-center text-3xl mb-3 shadow-lg group-hover:scale-110 group-hover:rotate-12 transition-all">
                📤
              </div>
              <div className="font-bold text-base text-green-700 mb-1">Export Data</div>
              <div className="text-xs text-green-600 leading-relaxed">Download your information</div>
            </div>
          </button>
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

      {/* Wallet Modal */}
      {activeModal === 'wallet' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">💰 Wallet</h3>
            
            {/* Balance Card */}
            <div className="rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-6 text-white mb-6 animate-gradient">
              <div className="text-sm opacity-90 mb-2">Available Balance</div>
              <div className="text-4xl font-bold mb-4">₹{walletBalance}</div>
              <button 
                onClick={() => setShowAddMoney(true)}
                className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium hover:bg-white/30 transition-all"
              >
                + Add Money
              </button>
            </div>

            {/* Recent Transactions */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Recent Transactions</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 grid place-items-center text-white">+</div>
                    <div>
                      <div className="font-medium text-sm">Added to wallet</div>
                      <div className="text-xs text-gray-500">Nov 1, 2025</div>
                    </div>
                  </div>
                  <div className="font-bold text-green-600">+₹500</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500 grid place-items-center text-white">-</div>
                    <div>
                      <div className="font-medium text-sm">Order payment</div>
                      <div className="text-xs text-gray-500">Oct 30, 2025</div>
                    </div>
                  </div>
                  <div className="font-bold text-red-600">-₹245</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 grid place-items-center text-white">★</div>
                    <div>
                      <div className="font-medium text-sm">Cashback earned</div>
                      <div className="text-xs text-gray-500">Oct 28, 2025</div>
                    </div>
                  </div>
                  <div className="font-bold text-green-600">+₹50</div>
                </div>
              </div>
            </div>

            <button onClick={() => setActiveModal(null)} className="w-full px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Money Sub-Modal */}
      {showAddMoney && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setShowAddMoney(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Add Money to Wallet</h3>
            <input
              type="number"
              value={addMoneyAmount}
              onChange={(e) => setAddMoneyAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full border-2 rounded-xl px-4 py-3 text-lg font-semibold mb-4 focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[100, 500, 1000].map(amt => (
                <button 
                  key={amt}
                  onClick={() => setAddMoneyAmount(amt.toString())}
                  className="px-4 py-2 border-2 rounded-xl hover:bg-gray-50 transition-all font-medium"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAddMoney(false)} className="flex-1 px-4 py-2 border rounded-xl hover:bg-gray-50 transition-all">
                Cancel
              </button>
              <button onClick={handleAddMoney} className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition-all font-medium">
                Add Money
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loyalty Points Modal */}
      {activeModal === 'loyalty' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">⭐ Loyalty Points</h3>
            
            {/* Points Balance Card */}
            <div className="rounded-2xl bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 p-6 text-white mb-6 animate-gradient">
              <div className="text-sm opacity-90 mb-2">Total Points</div>
              <div className="text-4xl font-bold mb-1">{loyaltyPoints}</div>
              <div className="text-sm opacity-90">≈ ₹{(loyaltyPoints / 10).toFixed(0)} value</div>
            </div>

            {/* Points Info */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="text-sm font-medium text-blue-900 mb-2">💡 How it works</div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>• Earn 1 point for every ₹10 spent</div>
                <div>• Redeem 10 points = ₹1 cashback</div>
                <div>• Points never expire!</div>
              </div>
            </div>

            {/* Redeem Options */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Redeem Points</h4>
              <div className="space-y-2">
                {[100, 500, 1000].map(points => (
                  <button
                    key={points}
                    onClick={() => redeemPoints(points)}
                    disabled={loyaltyPoints < points}
                    className={cls(
                      "w-full p-4 rounded-xl border-2 transition-all text-left",
                      loyaltyPoints >= points
                        ? "hover:bg-orange-50 hover:border-orange-300 cursor-pointer"
                        : "opacity-50 cursor-not-allowed bg-gray-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold">{points} Points</div>
                        <div className="text-xs text-gray-600">Get ₹{points / 10} cashback</div>
                      </div>
                      <div className="text-2xl">💰</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Points History */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Recent Activity</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <div>
                    <div className="font-medium text-sm">Order reward</div>
                    <div className="text-xs text-gray-500">Oct 30, 2025</div>
                  </div>
                  <div className="font-bold text-green-600">+50 pts</div>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                  <div>
                    <div className="font-medium text-sm">Referral bonus</div>
                    <div className="text-xs text-gray-500">Oct 25, 2025</div>
                  </div>
                  <div className="font-bold text-purple-600">+200 pts</div>
                </div>
              </div>
            </div>

            <button onClick={() => setActiveModal(null)} className="w-full px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Security Modal */}
      {activeModal === 'security' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">🔒 Security & Privacy</h3>
            
            <div className="space-y-3 mb-6">
              <button className="w-full p-4 border-2 rounded-xl hover:bg-gray-50 transition-all text-left">
                <div className="font-semibold flex items-center gap-2 mb-1">
                  <span>🔑</span> Change Password
                </div>
                <div className="text-xs text-gray-500">Update your account password</div>
              </button>

              <button className="w-full p-4 border-2 rounded-xl hover:bg-gray-50 transition-all text-left">
                <div className="font-semibold flex items-center gap-2 mb-1">
                  <span>📱</span> Two-Factor Authentication
                </div>
                <div className="text-xs text-gray-500">Add an extra layer of security</div>
                <div className="mt-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Enabled</span>
                </div>
              </button>

              <button className="w-full p-4 border-2 rounded-xl hover:bg-gray-50 transition-all text-left">
                <div className="font-semibold flex items-center gap-2 mb-1">
                  <span>📧</span> Email Verification
                </div>
                <div className="text-xs text-gray-500">Verify your email address</div>
                <div className="mt-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">Verified</span>
                </div>
              </button>

              <button className="w-full p-4 border-2 rounded-xl hover:bg-gray-50 transition-all text-left">
                <div className="font-semibold flex items-center gap-2 mb-1">
                  <span>📱</span> Active Sessions
                </div>
                <div className="text-xs text-gray-500">Manage your logged-in devices</div>
              </button>

              <button className="w-full p-4 border-2 rounded-xl hover:bg-gray-50 transition-all text-left">
                <div className="font-semibold flex items-center gap-2 mb-1">
                  <span>🛡️</span> Privacy Settings
                </div>
                <div className="text-xs text-gray-500">Control your data sharing preferences</div>
              </button>
            </div>

            <button onClick={() => setActiveModal(null)} className="w-full px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Favorites Modal */}
      {activeModal === 'favorites' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4 animate-fade-in" onClick={() => setActiveModal(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">❤️ My Favorites</h3>
            
            {favorites.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💔</div>
                <div className="text-gray-600 mb-2">No favorites yet</div>
                <div className="text-sm text-gray-500">Start adding your favorite outlets!</div>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {favorites.map((favId, idx) => (
                  <div key={favId} className="p-4 border-2 rounded-xl hover:shadow-md transition-all animate-fade-in" style={{animationDelay: `${idx * 50}ms`}}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 grid place-items-center text-2xl">
                          {idx % 3 === 0 ? '🍛' : idx % 3 === 1 ? '☕' : '🥟'}
                        </div>
                        <div>
                          <div className="font-bold">Outlet #{favId.slice(-2)}</div>
                          <div className="text-xs text-gray-500">⭐ 4.5 • 15-20 min</div>
                        </div>
                      </div>
                      <button className="text-2xl hover:scale-110 transition-transform">❤️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
  const [darkMode, setDarkMode] = useLocalStorage(STORAGE_KEYS.DARK_MODE, false);
  const [referralCode] = useLocalStorage(STORAGE_KEYS.REFERRAL_CODE, "ZAP" + Math.random().toString(36).substr(2, 6).toUpperCase());

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#1a1a1a';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f9fafb';
    }
  }, [darkMode]);

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
      <TopBar tab={tab} setTab={setTab} search={search} setSearch={setSearch} darkMode={darkMode} setDarkMode={setDarkMode} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {tab === "discover" && (
          <Discover outlets={filteredOutlets} onOpenMenu={setMenuFor} orders={orders} />
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

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {outlets.map((o) => (
        <OutletCard key={o.id} outlet={o} onOpenMenu={onOpenMenu} />)
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
  return (
    <div className="sticky bottom-4 z-10 animate-slide-up">
      <div className="max-w-6xl mx-auto px-4">
        <div className={cls(
          "rounded-2xl border bg-white shadow-xl backdrop-blur-sm transition-all duration-300",
          cart.length ? "p-4 scale-100" : "p-3 text-gray-500 scale-95"
        )}>
          {cart.length === 0 ? (
            <div className="text-sm">Your cart is empty. Add items from a menu.</div>
          ) : (
            <div>
              <div className="max-h-56 overflow-auto divide-y">
                {cart.map((it, idx) => (
                  <div key={it.key} className="py-2 flex items-center gap-3 animate-fade-in" style={{animationDelay: `${idx * 30}ms`}}>
                    <div className="flex-1">
                      <div className="text-sm font-medium truncate">{it.name} <span className="text-xs text-gray-500">• {it.outletName}</span></div>
                      <div className="text-xs text-gray-500">{formatCurrency(it.price)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 rounded border hover:bg-gray-100 hover:scale-110 active:scale-95 transition-all duration-200" onClick={() => onChangeQty(it.key, it.qty - 1)}>-</button>
                      <div className="text-sm w-6 text-center font-semibold">{it.qty}</div>
                      <button className="px-2 py-1 rounded border hover:bg-gray-100 hover:scale-110 active:scale-95 transition-all duration-200" onClick={() => onChangeQty(it.key, it.qty + 1)}>+</button>
                    </div>
                    <div className="w-16 text-right text-sm font-medium">{formatCurrency(it.price * it.qty)}</div>
                  </div>
                ))}
              </div>
              <div className="pt-3 flex items-center">
                <div className="text-sm font-semibold">Total: {formatCurrency(total)}</div>
                <button
                  onClick={onCheckout}
                  className="ml-auto px-4 py-2 rounded-xl bg-black text-white text-sm hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg"
                >
                  Place Order
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
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Discover</h2>
              <span className="text-sm text-gray-600">Pick an outlet and add items to your cart.</span>
            </div>
            <Discover outlets={filteredOutlets} onOpenMenu={setMenuFor} />
          </>
        )}

        {tab === "canteen" && (
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Canteen Seats</h2>
              <span className="text-sm text-gray-600">Book a seat before you arrive.</span>
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
      </main>

      <Cart cart={cart} onChangeQty={changeQty} onCheckout={checkout} />

      <MenuSheet outlet={menuFor} onClose={() => setMenuFor(null)} onAdd={addToCart} />

      <footer className="max-w-6xl mx-auto px-4 py-10 text-center text-xs text-gray-500">
        Built as a demo MVP • No backend required • Data persists in your browser
      </footer>
    </div>
  );
}

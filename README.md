# ⚡ ZapBooks - Complete Canteen Solution

A modern, feature-rich canteen management system with food ordering, seat booking, and user management - all in one place!

## 🚀 Features

### 🍽️ **Discover & Order**
- Browse multiple food outlets with ratings and ETA
- Real-time search across outlets, cuisines, and dishes
- Interactive menu sheets with smooth animations
- Smart cart management with quantity controls
- Instant order placement with localStorage persistence

### 💺 **Seat Booking System**
- Live seat availability grid (60 seats)
- Real-time countdown timers for active bookings
- 45-minute booking duration with visual feedback
- Click to book/cancel with instant updates
- Color-coded status indicators (Free/Booked/Expired)
- Statistics dashboard showing availability metrics

### 📦 **Order Tracking**
- Multi-stage order status (Received → Preparing → Ready → Completed)
- Color-coded status badges with animations
- Auto-advancing order statuses (demo mode)
- Manual status advancement controls
- Order details with outlet info and totals

### 📊 **History Dashboard**
- Completed orders archive
- Total spending analytics
- Seat booking history
- Recent activity timeline
- Visual statistics cards

### 👤 **Profile Management**
- User profile with avatar
- Editable contact information
- Food preference settings
- Push notification toggle
- Quick action buttons for:
  - Payment methods
  - Saved addresses
  - Offers & rewards
  - Help & support

## 🎨 Design Features

### Animations
- ✨ Fade-in animations for all content
- 📤 Slide-up effects for modals and cart
- 🎯 Bounce effects for icons and status badges
- 💫 Pulse animations for active elements
- 🌈 Animated gradient background (15s cycle)
- 🎭 Staggered animations for lists

### Visual Effects
- Glassmorphism (backdrop blur) on cards
- Dynamic shadows on hover
- Scale transformations on interaction
- Smooth transitions (200-300ms)
- Color-coded status indicators
- Gradient text logo

### Responsive Design
- Mobile-first approach
- Adaptive grid layouts
- Touch-friendly controls
- Optimized for all screen sizes

## 🛠️ Technology Stack

- **Frontend:** React 19 with Hooks
- **Styling:** Tailwind CSS v4 with custom animations
- **Build Tool:** Vite 7
- **State Management:** React useState & useEffect
- **Persistence:** LocalStorage
- **No Backend Required!**

## 📦 Installation

```bash
# Clone the repository
git clone <your-repo-url>

# Navigate to project directory
cd zapm

# Install dependencies
npm install

# Start development server
npm run dev
```

## 🎯 Usage

1. **Browse Outlets:** Explore food outlets on the Discover page
2. **Add to Cart:** Click "View Menu" and add items
3. **Book a Seat:** Navigate to Seat Booking and click any free seat
4. **Place Order:** Review cart and click "Place Order"
5. **Track Progress:** Monitor order status in My Orders
6. **View History:** Check completed orders and analytics
7. **Manage Profile:** Update preferences and settings

## 📱 Features by Page

### Discover
- 3 sample outlets with diverse cuisines
- Search functionality across all content
- Outlet cards with ratings and ETA
- Quick "View Menu" access

### Seat Booking
- 60 seats in 6x10 grid layout
- Real-time availability counter
- Active booking countdown timers
- One-click book/cancel

### My Orders
- Live order tracking
- Status progression system
- Order details and totals
- Manual status controls

### History
- Performance metrics
- Completed order list
- Activity timeline
- Spending analytics

### Profile
- Personal information
- Preferences management
- Notification settings
- Quick action shortcuts

## 🎨 Color Scheme

- **Primary:** Orange to Red gradient
- **Success:** Green (available/completed)
- **Warning:** Yellow (preparing)
- **Info:** Blue (booked/received)
- **Neutral:** Gray scale for UI elements

## 🔄 Data Persistence

All data is stored in browser LocalStorage:
- `canteen_mvp_cart` - Shopping cart items
- `canteen_mvp_orders` - Order history
- `canteen_mvp_seats` - Seat booking states

**Note:** Data persists across page refreshes but is device-specific.

## 🚀 Performance

- GPU-accelerated animations (transform/opacity)
- Optimized re-renders with React hooks
- Efficient localStorage updates
- Minimal bundle size with Vite

## 📄 License

MIT License - Feel free to use for your projects!

## 🤝 Contributing

Contributions welcome! Feel free to open issues or submit PRs.

---

**Built with ❤️ using React + Tailwind + Vite**

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
#

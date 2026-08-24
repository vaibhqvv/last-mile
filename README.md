# LastMile Delivery Tracker

A full-stack delivery management platform for last-mile logistics. Supports three roles (Customer, Delivery Agent, Admin), auto-calculated charges based on configurable rate cards, intelligent agent assignment, real-time order tracking, and email notifications.

---

## Features

- **Role-Based Access**: Customer, Delivery Agent, and Admin dashboards with tailored experiences
- **Rate Calculation Engine**: Zone detection, volumetric weight (L×B×H ÷ 5000), B2B/B2C rate cards, COD surcharge — all admin-configurable
- **Order Lifecycle**: Pending → Confirmed → Agent Assigned → Picked Up → In Transit → Out for Delivery → Delivered / Failed → Rescheduled
- **Immutable Tracking**: Every status change is logged with timestamp, actor, and optional note
- **Auto-Assignment**: Assigns nearest available agent based on zone matching and workload balancing
- **Failed Delivery Handling**: Customer is notified, can reschedule, agent gets reassigned
- **Email Notifications**: Sent via SendGrid on every status change
- **Admin Controls**: Create zones, configure rate cards, manage agents, override statuses, filter orders

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT + bcrypt |
| Email | SendGrid |
| Styling | Vanilla CSS with custom design system |

---

## Setup Guide

### Prerequisites

- Node.js (v16+)
- MongoDB Atlas account (or local MongoDB)
- SendGrid account with API key

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/LastMile_Delivery_Tracker.git
cd LastMile_Delivery_Tracker
```

### 2. Backend Setup

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory (refer to `.env.example`):

```env
MONGO_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/lastmile_tracker?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender@example.com
CLIENT_URL=http://localhost:5173
```

Start the server:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd client
npm install
```

Optionally create a `.env` file in the `client/` directory if your API is not at `localhost:5000`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the client:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 4. Initial Setup (First-Time)

1. Register a new account (this creates a customer account)
2. To create an admin, use the API directly:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"admin123","role":"admin"}'
```

3. To create a delivery agent:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Agent One","email":"agent1@example.com","password":"agent123","role":"agent"}'
```

4. Log in as admin to:
   - Create zones (e.g., "North Delhi", "South Mumbai")
   - Add pincodes to each zone
   - Set up rate cards for zone pairs
   - Assign agents to zones

---

## API Documentation

Base URL: `http://localhost:5000/api`

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | Login | No |
| GET | `/auth/me` | Get current user | Bearer Token |

### Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/orders/calculate` | Preview charge before confirming | Bearer Token |
| POST | `/orders` | Create a new order | Customer, Admin |
| GET | `/orders` | List orders (filtered by role) | Bearer Token |
| GET | `/orders/:id` | Get order detail with tracking | Bearer Token |
| PUT | `/orders/:id/assign` | Manually assign agent | Admin |
| PUT | `/orders/:id/auto-assign` | Auto-assign nearest agent | Admin |
| PUT | `/orders/:id/status` | Update delivery status | Agent |
| PUT | `/orders/:id/reschedule` | Reschedule failed delivery | Customer |
| PUT | `/orders/:id/override` | Override order status | Admin |

### Zones

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/zones` | Create zone | Admin |
| GET | `/zones` | List all zones | Bearer Token |
| PUT | `/zones/:id` | Update zone | Admin |
| DELETE | `/zones/:id` | Delete zone | Admin |

### Rate Cards

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/rate-cards` | Create rate card | Admin |
| GET | `/rate-cards` | List all rate cards | Bearer Token |
| PUT | `/rate-cards/:id` | Update rate card | Admin |
| DELETE | `/rate-cards/:id` | Delete rate card | Admin |

### Agents

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/agents` | List all agents with stats | Admin |
| PUT | `/agents/:id/availability` | Toggle availability | Agent, Admin |
| PUT | `/agents/:id/location` | Update location | Agent |
| PUT | `/agents/:id/zone` | Assign agent to zone | Admin |

---

## Database Schema

### User
```
{
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  role: 'customer' | 'agent' | 'admin',
  isAvailable: Boolean (agents only),
  currentLocation: { lat: Number, lng: Number },
  assignedZone: ObjectId → Zone
}
```

### Zone
```
{
  name: String (unique),
  areas: [String],  // array of pincodes
  description: String
}
```

### RateCard
```
{
  orderType: 'B2B' | 'B2C',
  fromZone: ObjectId → Zone,
  toZone: ObjectId → Zone,
  ratePerKg: Number,
  codSurcharge: Number
}
Unique compound index: (orderType, fromZone, toZone)
```

### Order
```
{
  customer: ObjectId → User,
  pickupAddress: String, pickupPincode: String,
  dropAddress: String, dropPincode: String,
  pickupZone: ObjectId → Zone, dropZone: ObjectId → Zone,
  packageDimensions: { length, breadth, height },
  actualWeight: Number,
  volumetricWeight: Number,  // L×B×H ÷ 5000
  billedWeight: Number,      // max(actual, volumetric)
  orderType: 'B2B' | 'B2C',
  paymentType: 'Prepaid' | 'COD',
  baseCharge: Number, codSurcharge: Number, totalCharge: Number,
  status: String (enum),
  assignedAgent: ObjectId → User,
  trackingHistory: [{ status, timestamp, updatedBy, note }],
  failureReason: String,
  rescheduledDate: Date
}
```

---

## Rate Calculation Logic

The rate engine is in `server/services/rateEngine.js`. Here's how it works step-by-step:

1. **Zone Detection**: Given a pincode, we search all zones to find which one contains that pincode. Both pickup and drop pincodes are resolved to their respective zones.

2. **Volumetric Weight**: Calculated using the industry-standard formula:
   ```
   Volumetric Weight = (Length × Breadth × Height) ÷ 5000
   ```
   All dimensions are in centimeters, result is in kilograms.

3. **Billed Weight**: The customer is billed on whichever is higher:
   ```
   Billed Weight = max(Actual Weight, Volumetric Weight)
   ```
   This ensures dimensional packages aren't undercharged.

4. **Rate Card Lookup**: We find the rate card matching the combination of:
   - Order type (B2B or B2C)
   - From zone (pickup)
   - To zone (drop)
   
   This supports both intra-zone (same zone) and inter-zone (different zones) pricing.

5. **Charge Calculation**:
   ```
   Base Charge = Billed Weight × Rate per kg
   COD Surcharge = applies only if paymentType is 'COD' (flat fee from rate card)
   Total Charge = Base Charge + COD Surcharge
   ```

---

## System Design Write-Up

### Rate Calculation Engine

The rate engine is decoupled from the order controller as a standalone service (`rateEngine.js`). This separation means pricing logic can be independently tested and modified without touching order creation flow. Zone detection uses a simple pincode-to-zone mapping stored in the Zone model — each zone holds an array of pincodes. While this approach is straightforward and works well for Indian PIN-code-based logistics, it could be extended with geospatial queries for coordinate-based zone detection.

The volumetric weight calculation follows the industry-standard DIM factor of 5000 (used by most Indian couriers). The engine always takes the higher of actual vs volumetric weight for billing — this is the universal practice in logistics to account for packages that are light but take up significant cargo space.

Rate cards are fully admin-configurable through the UI. Each rate card entry specifies a unique combination of order type (B2B/B2C) and zone pair (from → to), with per-kg rate and flat COD surcharge. A unique compound index on (orderType, fromZone, toZone) prevents accidental duplicate configurations. Separate entries for intra-zone and inter-zone rates give admins granular control over pricing.

### Zone Detection Approach

Zones are modeled as named groups of pincodes. When an order is placed, the system iterates through all zones to find which one contains the pickup pincode and which contains the drop pincode. This is a MongoDB `findOne` with an array containment check, which performs well for the expected number of zones and pincodes in a typical last-mile operation.

The approach trades off complex geospatial computation for simplicity and predictability. Pincodes in India map well to geographic regions, making this a natural fit for zone-based pricing. If future requirements demand coordinate-based zone detection (e.g., for international operations), the Zone model could be extended with GeoJSON polygons and MongoDB's `$geoWithin` queries.

### Auto-Assignment Logic

Agent assignment uses a two-step strategy implemented in `assignmentService.js`:

1. **Zone Preference**: First, the system looks for available agents assigned to the same zone as the order's pickup location. This optimizes for proximity since zone-assigned agents are likely physically near the pickup point.

2. **Workload Balancing**: Among matching agents, the one with the fewest active (non-delivered, non-failed) orders is selected. This prevents overloading a single agent while others are idle.

3. **Fallback**: If no zone-matched agents are available, the search widens to all available agents, still selecting by lowest workload.

This approach balances proximity with fairness. For more sophisticated assignment, the system could be extended to factor in real-time GPS coordinates, estimated travel time, or delivery time windows.

### Failed Delivery Handling

The failed delivery flow is designed for reliability and customer satisfaction:

1. **Agent marks delivery as "Failed"** with a mandatory failure reason (e.g., "Customer not available", "Address not found"). This is immutably recorded in the tracking history.

2. **Customer is notified** via email with the failure reason and an option to reschedule.

3. **Customer selects a new date** through their dashboard. The system sets the order status to "Rescheduled" and logs the new date.

4. **Agent auto-reassignment** occurs during rescheduling — the system runs the same auto-assignment algorithm to find the best available agent for the new attempt. This handles cases where the original agent may no longer be available.

5. **Full audit trail** is maintained — the tracking history shows the original delivery attempt, failure reason, reschedule date, and new agent assignment, all with timestamps and actor IDs.

---

## Deployment Notes

### Frontend (Vercel)

The frontend is configured for Vercel deployment. Make sure to:
- Set the root directory to `client`
- Set the build command to `npm run build`
- Set the output directory to `dist`
- Add environment variable: `VITE_API_URL=https://your-backend-url.onrender.com/api`

### Backend (Render)

For Render deployment:
- Set the root directory to `server`
- Set the build command to `npm install`
- Set the start command to `node server.js`
- Add all environment variables from `.env.example`
- Update `CLIENT_URL` to your Vercel frontend URL for CORS

---

## License

ISC
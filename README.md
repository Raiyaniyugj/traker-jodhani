# Trackerz — Jewelry Production Tracker with Shopify Integration

A full-stack clone of **Trackerz** ([trackers-lake.vercel.app](https://trackers-lake.vercel.app)) built specifically for custom jewelry workshops and manufacturing pipelines, with end-to-end **Shopify Webhook & Admin REST API integration**.

---

## 💎 Features

### 1. Master Production Dashboard (`/dashboard`)
- **Live Metrics**: Total Revenue & Total Profit calculated automatically from order values and manufacturing costs.
- **9-Stage Jewelry Pipeline Kanban Board**:
  - `New Orders`
  - `CAD Design`
  - `RPT (Rapid Prototyping / Wax Printing)`
  - `Casting`
  - `Factory (Stone Setting, Assembly)`
  - `Quality Check (QC & Laser Hallmarking)`
  - `Packaging`
  - `Shipping`
  - `Completed / Delivered`
- **One-Click Stage Advancement**: Move orders forward through the pipeline or click any stage milestone.
- **Dual Views**: Seamless toggle between **Kanban View** and **Table View**.
- **Manual & Automated Creation**: "+ Add Order" modal with full jewelry specifications (metal purity, color, diamond shape, carat, custom engraving) and one-click Shopify simulation.

### 2. Order Details Page (`/orders/[id]`)
- **Interactive Production Timeline**: Visual track with clickable milestone checkmarks to advance stages.
- **Financial Breakdown**: Retail price, subtotal, shipping fee, base workshop production cost, and calculated profit.
- **Fine Jewelry Specs**: Metal type (10K, 14K, 18K, Platinum), color (White gold, Yellow gold, Rose gold), Diamond shape (Round, Oval, Emerald, etc.), carat size, custom stamping & engraving.
- **Collaborative Tabs**:
  - **Gallery**: Upload and review 3D CAD `.stl` renders, casting inspection photos, and QC microscope snapshots.
  - **Comments**: Team chat thread with role tags.
  - **Activity**: Audit log tracking stage movements and timestamped modifications.
- **Shipping & Tracking**: Input courier (FedEx, DHL, Blue Dart) and waybill number.
- **Customer Live Tracking Link Generator**: Creates a shareable link (`/track/[orderId]`) for clients.

### 3. Public Customer Live Tracking (`/track/[orderId]`)
- **No Login Required**: Customers can track their jewelry being crafted in real-time.
- Shows live progress percentage, active manufacturing stage, jewelry specifications, and dispatch carrier details.

### 4. Shopify Integration & Settings (`/settings`)
- **HMAC Signature Verification**: Securely validates incoming Shopify webhooks using `crypto.createHmac('sha256', secret)`.
- **Live Webhook Endpoint**: `POST /api/webhooks/shopify/orders-create`
- **Shopify Setup Instructions**: Step-by-step guidance for Shopify Admin (Settings → Notifications → Webhooks).
- **Admin REST API Sync**: "Sync Orders Now" button fetches open jewelry orders from Shopify Admin API.
- **Simulate Shopify Order**: Instant testing button to ingest a realistic Shopify jewelry order without needing a live paid store.
- **Webhook Activity Log**: Audit trail showing incoming webhook events, HMAC statuses, timestamps, and payload previews.
- **Workspace Profile**: Customize company name, workshop owner, phone, email, and currency symbol (`$`, `₹`, `€`, `£`).

### 5. Team & Role Access (`/team`)
- Manage team members: Admins, CAD Designers, Manufacturers, and QC Managers.

### 6. Pipeline Customization (`/pipeline`)
- Customize pipeline stages and assign role permissions per stage.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or 20+ installed.

### Installation
```bash
# In project directory (d:\project\jodhani export):
npm install
```

### Running Locally
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

- **Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Settings**: [http://localhost:3000/settings](http://localhost:3000/settings)
- **Delivered Orders**: [http://localhost:3000/delivered](http://localhost:3000/delivered)
- **Pipeline Management**: [http://localhost:3000/pipeline](http://localhost:3000/pipeline)
- **Team Management**: [http://localhost:3000/team](http://localhost:3000/team)
- **Public Customer Live Tracking Demo**: [http://localhost:3000/track/6a4dc73d-2dc6-4e67-ba26-5769e3e55926](http://localhost:3000/track/6a4dc73d-2dc6-4e67-ba26-5769e3e55926)

---

## 🔗 Connecting with Real Shopify Store

1. In your **Shopify Admin**, go to **Settings → Notifications**.
2. Scroll down to the **Webhooks** section and click **Create webhook**.
3. Set:
   - **Event**: `Order creation`
   - **Format**: `JSON`
   - **URL**: `https://<your-domain-or-ngrok>/api/webhooks/shopify/orders-create`
   - **Webhook API version**: Latest (2024-01 or newer)
4. Copy the **Signing Secret** shown at the bottom of the Webhooks section.
5. In Trackerz, go to **[Settings](/settings)**:
   - Enter your `your-store.myshopify.com` domain.
   - Paste the signing secret into **Webhook Signing Secret**.
   - (Optional) Enter your Shopify Custom App Admin API token (`shpat_...`) for direct REST sync.
   - Click **Connect Store**.
6. Whenever an order is placed on your Shopify store, it will automatically appear in your **New Orders** column on the Kanban board!

---

## 📁 Project Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── auth/              # Login, signup, session handlers
│   │   ├── orders/            # Order CRUD, comments, media upload
│   │   ├── pipeline/          # Stage configuration and ordering
│   │   ├── settings/          # Workspace settings & webhook logs
│   │   ├── shopify/           # Sync, test connection, simulate orders
│   │   └── webhooks/shopify/  # HMAC verified Shopify webhook receiver
│   ├── dashboard/             # Master Production Dashboard
│   ├── delivered/             # Completed/delivered orders archive
│   ├── login/                 # User login page
│   ├── orders/[id]/           # Full order details & production timeline
│   ├── pipeline/              # Pipeline stage management
│   ├── settings/              # Shopify integration & workspace settings
│   ├── signup/                # Workspace onboarding
│   ├── team/                  # Team member roles & permissions
│   ├── track/[orderId]/       # Public customer live tracking page
│   ├── globals.css            # Styling, luxury typography, Tailwind
│   ├── layout.tsx             # Root layout with fonts & metadata
│   └── page.tsx               # Marketing landing page
├── components/
│   ├── AddOrderModal.tsx      # Modal for custom jewelry job creation
│   ├── Header.tsx             # Top bar with user profile & logout
│   ├── KanbanBoard.tsx        # Stage pipeline Kanban board
│   ├── Sidebar.tsx            # Navigation sidebar with diamond branding
│   └── TableView.tsx          # Filterable order table view
├── lib/
│   ├── shopify.ts             # HMAC verification & Shopify payload mapping
│   ├── store.ts               # Persistent thread-safe JSON database
│   └── types.ts               # TypeScript data models
└── data/
    └── database.json          # Persistent workspace data store
```

# QMS Platform

A Quality Management System built with Next.js, Express.js, PostgreSQL, and Supabase.

## Tech Stack

**Frontend:** Next.js 15, TypeScript, Tailwind CSS  
**Backend:** Express.js, Sequelize ORM  
**Database:** PostgreSQL (Supabase)  
**Storage:** Supabase Storage  
**Auth:** JWT  

## Features

- Document management with version control and approval workflow
- Audit scheduling and lifecycle management
- Finding and corrective action tracking
- Achievement/gamification system
- Role-based access control (Quality Manager, Process Owner, Employee)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL or Supabase account

### Backend Setup
\`\`\`bash
cd backend
npm install
cp .env.example .env   # Fill in your values
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all
npm run dev
\`\`\`

### Frontend Setup
\`\`\`bash
cd frontend
npm install
cp .env.example .env.local   # Fill in your values
npm run dev
\`\`\`

## Demo

Live: [your-domain.dev](https://your-domain.dev)  
The demo resets every Sunday at 2AM UTC to maintain a clean state.

## License

MIT
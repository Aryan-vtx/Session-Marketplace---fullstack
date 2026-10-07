# 🎯 Sessions Marketplace Fullstack

A full-stack web application that allows users to **discover, create, and book professional sessions**. The platform provides separate workflows for customers and service providers, with secure authentication, session availability management, booking functionality, and RESTful APIs.

## 🚀 Features

### 👤 User Management
- User registration and login
- JWT-based authentication
- Role-based access control
- Customer and service-provider roles
- Secure protected APIs

### 📅 Session Management
- Create and manage professional sessions
- Add session title, description, price, and duration
- View available sessions
- Search and filter sessions
- Manage session availability

### 📌 Booking System
- Book available sessions
- View upcoming and previous bookings
- Booking status management
- Prevent duplicate or conflicting bookings
- Customer and provider booking management

### 🔐 Security
- JWT authentication
- Password hashing
- Role-based authorization
- Protected API endpoints
- Secure environment-variable configuration

### 🐳 Deployment
- Dockerized application
- Docker Compose support
- Separate frontend and backend services
- Environment-based configuration

---

## 🛠️ Tech Stack

### Frontend
- React.js
- JavaScript / TypeScript
- HTML5
- CSS3
- Axios

### Backend
- Python
- Django
- Django REST Framework
- REST APIs
- JWT Authentication

### Database
- MySQL
- Redis *(optional, if enabled)*

### DevOps & Tools
- Docker
- Docker Compose
- Git
- GitHub
- Postman

---

## 🏗️ Project Architecture

```text
                 ┌──────────────────┐
                 │      Client      │
                 │   React.js UI    │
                 └────────┬─────────┘
                          │
                     REST API
                          │
                          ▼
                 ┌──────────────────┐
                 │     Backend      │
                 │ Django + DRF     │
                 └────────┬─────────┘
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
      ┌──────────────┐         ┌──────────────┐
      │    MySQL     │         │    Redis     │
      │   Database   │         │   (Optional) │
      └──────────────┘         └──────────────┘
```

---

## 📂 Project Structure

```text
sessions-marketplace/
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/
│   ├── users/
│   ├── sessions/
│   └── bookings/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   ├── package.json
│   └── public/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/sessions-marketplace.git

cd sessions-marketplace
```

### 2. Backend Setup

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file:

```env
SECRET_KEY=your_secret_key
DEBUG=True

DB_NAME=sessions_marketplace
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_HOST=localhost
DB_PORT=3306

JWT_SECRET_KEY=your_jwt_secret
```

### 4. Create MySQL Database

Open MySQL and run:

```sql
CREATE DATABASE sessions_marketplace;
```

### 5. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Create Admin User

```bash
python manage.py createsuperuser
```

### 7. Start Django Server

```bash
python manage.py runserver
```

Backend will run at:

```text
http://127.0.0.1:8000/
```

---

## 💻 Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will typically run at:

```text
http://localhost:5173/
```

---

## 🔌 API Endpoints

### Authentication

```text
POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/refresh/
```

### Sessions

```text
GET    /api/sessions/
POST   /api/sessions/
GET    /api/sessions/<id>/
PUT    /api/sessions/<id>/
DELETE /api/sessions/<id>/
```

### Bookings

```text
GET    /api/bookings/
POST   /api/bookings/
GET    /api/bookings/<id>/
PUT    /api/bookings/<id>/
DELETE /api/bookings/<id>/
```

> Endpoint names may vary depending on the final Django URL configuration.

---

## 🔄 Application Workflow

```text
User Registration
       ↓
User Login
       ↓
JWT Authentication
       ↓
Browse Sessions
       ↓
View Session Details
       ↓
Check Availability
       ↓
Book Session
       ↓
Booking Confirmation
       ↓
Manage Booking
```

### Provider Workflow

```text
Provider Login
       ↓
Create Session
       ↓
Set Availability
       ↓
Receive Booking
       ↓
Manage Bookings
       ↓
Update Session
```

---

## 🧠 Key Backend Concepts

### Authentication

JWT tokens are used to authenticate users and protect private API endpoints.

```text
Login
  ↓
Credentials Verification
  ↓
JWT Token
  ↓
Authenticated API Requests
```

### Role-Based Access Control

The application differentiates between:

```text
Customer
   ├── Browse Sessions
   ├── Book Sessions
   └── Manage Bookings

Provider
   ├── Create Sessions
   ├── Manage Availability
   └── Manage Bookings

Admin
   └── Manage Platform
```

### Booking Validation

Before creating a booking, the backend verifies:

- Session exists
- User is authenticated
- Requested time is available
- User does not already have a conflicting booking
- Booking request satisfies business rules

This helps prevent invalid or conflicting bookings.

---

## 🧪 Testing

Run Django tests using:

```bash
python manage.py test
```

API endpoints can also be tested using **Postman** or **Swagger/OpenAPI**.

---

## 🐳 Running with Docker

Build and start the services:

```bash
docker-compose up --build
```

Stop the services:

```bash
docker-compose down
```

---

## 🔮 Future Improvements

- 💳 Stripe/Razorpay payment integration
- 📧 Email notifications
- ⭐ Session reviews and ratings
- 🔍 Advanced search and filtering
- 📊 Provider analytics dashboard
- 🔔 Real-time booking notifications
- 📅 Calendar integration
- ⚡ Redis caching
- ☁️ AWS deployment
- 🔄 CI/CD using GitHub Actions
- 🤖 AI-powered session recommendations

---

## 🎯 Learning Outcomes

This project demonstrates practical experience with:

- Full-stack web development
- Python and Django

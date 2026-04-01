# The Food Truck - Full-Stack Food Delivery Application

A production-ready food delivery website built with Node.js, Express.js, MongoDB, and EJS.

## Features

- **MVC Architecture**: Clean separation of concerns with controllers, routes, models
- **Authentication & Authorization**: User registration/login with Passport.js, role-based access (user/admin)
- **Menu Management**: CRUD operations for menu items, image uploads with Cloudinary
- **Shopping Cart**: Add/remove items, persistent cart storage
- **Order Management**: Complete order lifecycle with history
- **Recommendation System**: Basic recommendations based on user order history
- **Admin Dashboard**: Manage menu items, view orders, user management
- **Responsive Design**: Mobile-friendly UI
- **Security**: Password hashing, input validation, authentication middleware

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: Passport.js Local Strategy
- **Image Storage**: Cloudinary
- **Frontend**: EJS templates, CSS
- **Session Management**: express-session with MongoDB store
- **Validation**: express-validator

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Cloudinary account (for image uploads)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd thefoodtruck
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env` file in the root directory:

   ```env
   MONGODB_URL=mongodb://localhost:27017/thefoodtruck
   SESSION_SECRET=your-super-secret-session-key-change-this-in-production
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   PORT=8080
   ```

4. **Seed the database** (optional)
   ```bash
   npm run seed
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

6. **Access the application**

   Open your browser and navigate to `http://localhost:8080`

## Project Structure

```
thefoodtruck/
├── controllers/          # Request handlers
│   ├── authController.js
│   ├── menuController.js
│   ├── cartController.js
│   ├── orderController.js
│   └── adminController.js
├── models/              # Database models
│   ├── Users.js
│   ├── MenuItem.js
│   ├── Category.js
│   ├── Cart.js
│   └── Orders.js
├── routes/              # Route definitions
│   ├── authRoutes.js
│   ├── menuRoutes.js
│   ├── cartRoutes.js
│   ├── orderRoutes.js
│   └── adminRoutes.js
├── views/               # EJS templates
│   ├── auth/
│   ├── menu/
│   ├── cart/
│   ├── orders/
│   ├── admin/
│   └── *.ejs
├── public/              # Static assets
│   ├── css/
│   └── album/
├── middleware/          # Custom middleware
│   └── auth.js
├── init/                # Database seeding
│   ├── data.js
│   └── index.js
├── .env                 # Environment variables
├── server.js            # Application entry point
└── package.json
```

## API Endpoints

### Authentication
- `GET /auth/login` - Login page
- `POST /auth/login` - Login user
- `GET /auth/signup` - Signup page
- `POST /auth/signup` - Register user
- `POST /auth/logout` - Logout user

### Menu
- `GET /menu` - View menu with filtering
- `GET /menu/admin` - Admin menu management
- `POST /menu/admin/create` - Create menu item
- `POST /menu/admin/edit/:id` - Update menu item
- `DELETE /menu/admin/:id` - Delete menu item

### Cart
- `GET /cart` - View cart
- `POST /cart/add` - Add item to cart
- `POST /cart/update` - Update cart item quantity
- `DELETE /cart/remove/:id` - Remove item from cart
- `POST /cart/clear` - Clear cart

### Orders
- `GET /orders` - User order history
- `GET /orders/:id` - Order details
- `GET /orders/checkout` - Checkout page
- `POST /orders/create` - Create order
- `GET /orders/admin` - Admin order management

### Admin
- `GET /admin` - Admin dashboard
- `GET /admin/users` - User management
- `POST /admin/users/:id/role` - Update user role

## Default Admin Account

After seeding the database, you can create an admin user by updating a user's role in the database or through the admin panel.

## Security Features

- Password hashing with bcrypt
- Session-based authentication
- Input validation and sanitization
- CSRF protection (recommended to add)
- Rate limiting (recommended to add)
- HTTPS in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

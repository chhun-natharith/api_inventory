# API Routes Documentation

All routes are prefixed with `/api` (configured in `src/main.ts`)

## 🔓 Public Routes (No Authentication Required)

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| POST | `/api/auth/register` | Register a new account | `auth.controller.ts` |
| POST | `/api/auth/login` | Login and receive tokens | `auth.controller.ts` |
| POST | `/api/auth/refresh` | Rotate a refresh token | `auth.controller.ts` |
| POST | `/api/auth/logout` | Revoke a refresh token | `auth.controller.ts` |

---

## 🔒 Protected Routes (Require Authentication)

**Authentication**: All routes below require Bearer token in header:
```
Authorization: Bearer <your_access_token>
```

### Authentication Profile (`/api/auth`)
| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| GET | `/api/auth/me` | Get authenticated user profile | `auth.controller.ts` |

---

### Users (`/api/users`)
| Method | Endpoint | Description | Required Permission | Controller |
|--------|----------|-------------|---------------------|------------|
| POST | `/api/users` | Create a user | `users:write` | `users.controller.ts` |
| GET | `/api/users` | List all users (paginated) | `users:read` | `users.controller.ts` |
| GET | `/api/users/:id` | Get user by ID | `users:read` | `users.controller.ts` |
| PATCH | `/api/users/:id` | Update a user | `users:write` | `users.controller.ts` |
| PATCH | `/api/users/:id/role` | Change a user's role | `users:manage-roles` | `users.controller.ts` |
| DELETE | `/api/users/:id` | Delete a user | `users:delete` | `users.controller.ts` |
| POST | `/api/users/:id/profile-image` | Upload profile image | `users:write` | `users.controller.ts` |
| PATCH | `/api/users/:id/profile-image` | Update profile image | `users:write` | `users.controller.ts` |
| DELETE | `/api/users/:id/profile-image` | Delete profile image | `users:write` | `users.controller.ts` |

---

### Roles (`/api/roles`)
| Method | Endpoint | Description | Required Permission | Controller |
|--------|----------|-------------|---------------------|------------|
| GET | `/api/roles` | List all roles with their permissions | `users:manage-roles` | `roles.controller.ts` |
| GET | `/api/roles/:id` | Get a role with its permissions | `users:manage-roles` | `roles.controller.ts` |

---

### Categories (`/api/categories`)
| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| POST | `/api/categories` | Create a category | `categories.controller.ts` |
| GET | `/api/categories` | List all categories (paginated) | `categories.controller.ts` |
| GET | `/api/categories/:id` | Get category by ID | `categories.controller.ts` |
| PATCH | `/api/categories/:id` | Update a category | `categories.controller.ts` |
| DELETE | `/api/categories/:id` | Delete a category | `categories.controller.ts` |

---

### Products (`/api/products`)
| Method | Endpoint | Description | Required Permission | Controller |
|--------|----------|-------------|---------------------|------------|
| POST | `/api/products` | Create a product | `products:write` | `products.controller.ts` |
| GET | `/api/products` | List all products (paginated) | `products:read` | `products.controller.ts` |
| GET | `/api/products/:id` | Get product by ID | `products:read` | `products.controller.ts` |
| PATCH | `/api/products/:id` | Update a product | `products:write` | `products.controller.ts` |
| DELETE | `/api/products/:id` | Delete a product | `products:delete` | `products.controller.ts` |
| POST | `/api/products/:id/images` | Upload product image | `products:write` | `products.controller.ts` |
| GET | `/api/products/:id/images` | Get all product images | `products:read` | `products.controller.ts` |
| GET | `/api/products/:id/images/:imageId` | Get single product image | `products:read` | `products.controller.ts` |
| PATCH | `/api/products/:id/images/:imageId` | Update image metadata | `products:write` | `products.controller.ts` |
| PATCH | `/api/products/:id/images/:imageId/primary` | Set image as primary | `products:write` | `products.controller.ts` |
| DELETE | `/api/products/:id/images/:imageId` | Delete product image | `products:delete` | `products.controller.ts` |

---

### Product Variants (`/api/product-variants`)
| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| POST | `/api/product-variants` | Create a product variant | `product-variants.controller.ts` |
| GET | `/api/product-variants` | List all variants (paginated) | `product-variants.controller.ts` |
| GET | `/api/product-variants/:id` | Get variant by ID | `product-variants.controller.ts` |
| PATCH | `/api/product-variants/:id` | Update a variant | `product-variants.controller.ts` |
| DELETE | `/api/product-variants/:id` | Delete a variant | `product-variants.controller.ts` |

---

### Orders (`/api/orders`)
| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| POST | `/api/orders` | Create an order | `orders.controller.ts` |
| GET | `/api/orders` | List all orders (paginated) | `orders.controller.ts` |
| GET | `/api/orders/:id` | Get order by ID | `orders.controller.ts` |
| PATCH | `/api/orders/:id` | Update an order | `orders.controller.ts` |
| DELETE | `/api/orders/:id` | Cancel an order | `orders.controller.ts` |

---

## 📝 How Routes Work in NestJS (vs Laravel)

### Laravel Way:
```php
// routes/api.php
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/users', [UserController::class, 'index'])->middleware('auth');
```

### NestJS Way:
```typescript
// auth.controller.ts
@Controller('auth')              // Defines /api/auth
export class AuthController {
  
  @Post('login')                // Defines POST /api/auth/login
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
```

**Key Differences:**
- Laravel: Routes defined in **one file** (`routes/api.php`)
- NestJS: Routes defined with **decorators** in each controller file
- Global prefix (`/api`) set in `main.ts` with `app.setGlobalPrefix('api')`
- `@Controller('users')` = route prefix (like Laravel's route groups)
- `@Post()`, `@Get()`, `@Patch()`, `@Delete()` = HTTP methods
- `@UseGuards(JwtAuthGuard)` = middleware (like Laravel's `->middleware('auth')`)
- `@Public()` decorator = skip authentication (like Laravel's public routes)

---

## 🔍 Viewing All Routes

### Option 1: Swagger Documentation (Recommended)
1. Start the server: `npm run start:dev`
2. Visit: http://localhost:8200/docs
3. Interactive API documentation with all endpoints

### Option 2: Using NestJS CLI
```bash
# If you want a command-line route list (requires setup)
npm i -D @nestjs/cli
```

### Option 3: This File
Keep this `ROUTES.md` updated as you add new endpoints!

---

## 🧪 Testing Routes

### Using curl:
```bash
# Login
curl -X POST http://localhost:8200/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get users (with token)
curl -X GET http://localhost:8200/api/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman/Insomnia:
Import the Swagger JSON from: http://localhost:8200/docs-json

---

## 📂 Finding Routes in Code

To find where a route is defined:

1. Look at `src/app.module.ts` - see all imported modules
2. Check each module's controller file:
   - `src/auth/auth.controller.ts`
   - `src/users/users.controller.ts`
   - `src/products/products.controller.ts`
   - etc.

Every `@Controller('path')` + `@Post('action')` combination creates a route!

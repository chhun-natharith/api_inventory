# NestJS Project Pattern

## Tech Stack

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Swagger
- Docker
- ESLint
- Prettier

---

# Project Structure

```
src/
│
├── app.module.ts
├── main.ts
│
├── common/
│   ├── constants/
│   ├── decorators/
│   ├── dto/
│   ├── enums/
│   ├── exceptions/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── middleware/
│   ├── pipes/
│   ├── interfaces/
│   ├── utils/
│   └── types/
│
├── config/
│
├── prisma/
│
├── auth/
│
├── users/
│
├── products/
│
├── categories/
│
├── orders/
```

---

# Every Feature Module

Each feature follows the exact same structure.

```
users/

├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── login.dto.ts
│
├── entities/
│   └── user.entity.ts
│
├── interfaces/
│
├── users.controller.ts
├── users.service.ts
├── users.module.ts
└── users.repository.ts
```

Every module must look like this.

---

# Request Flow

```
HTTP Request

↓

Controller

↓

Service

↓

Repository

↓

Prisma

↓

Database

↓

Response
```

Controllers never access Prisma directly.

---

# Responsibilities

## Controller

Responsible for

- Routes
- Request
- Response
- Validation

Never

- Business Logic
- Database Queries

Example

```
POST /users
```

Controller simply calls

```
usersService.create()
```

---

## Service

Responsible for

- Business Logic
- Validation Rules
- Authorization Logic
- Transactions

Never

- HTTP
- Request Object

---

## Repository

Responsible for

Only database operations.

Example

```
findById()

findByEmail()

create()

update()

delete()
```

No business logic.

---

## Prisma

Repository communicates with Prisma.

Service never communicates with Prisma directly.

---

# DTO

Every API request must have a DTO.

Good

```
CreateUserDto

UpdateUserDto

LoginDto
```

Bad

Using

```
any
```

---

# Validation

Always validate using

class-validator

Example

```
@IsString()

@IsEmail()

@IsOptional()

@IsNumber()
```

Validation belongs inside DTO.

---

# Dependency Injection

Always inject dependencies.

Good

```
Controller

↓

Service

↓

Repository
```

Never instantiate manually

Bad

```
new UserService()
```

---

# API Response

Always return consistent responses.

Example

```
{
    success: true,
    message: "User created successfully",
    data: {}
}
```

Errors

```
{
    success: false,
    message: "Email already exists"
}
```

---

# Naming Convention

Module

```
users
```

Controller

```
UsersController
```

Service

```
UsersService
```

Repository

```
UsersRepository
```

DTO

```
CreateUserDto

UpdateUserDto
```

Entity

```
UserEntity
```

---

# Folder Naming

Always

```
kebab-case
```

Files

```
create-user.dto.ts

users.controller.ts
```

Classes

```
PascalCase
```

Variables

```
camelCase
```

Constants

```
UPPER_CASE
```

---

# Authentication

JWT

```
Login

↓

Access Token

↓

Refresh Token
```

Protected routes

```
@UseGuards(JwtAuthGuard)
```

---

# Authorization

RBAC

```
Admin

Manager

Staff
```

Never check role manually.

Always use Guards.

---

# Error Handling

Throw Nest Exceptions.

```
BadRequestException

UnauthorizedException

ForbiddenException

NotFoundException

ConflictException
```

Never return

```
return {
    error: ...
}
```

---

# Swagger

Every endpoint should have

```
@ApiTags()

@ApiOperation()

@ApiResponse()

@ApiBearerAuth()
```

---

# Environment

Never hardcode

Database

JWT Secret

Port

Everything comes from

```
.env
```

---

# Code Style

Controllers

Small

<50 lines if possible

Services

Single Responsibility

Repository

Database only

Functions

One responsibility only.

---

# Principles

Always

✅ SOLID

✅ DRY

✅ KISS

✅ Dependency Injection

✅ Feature First

Never

❌ Massive Controller

❌ Massive Service

❌ Business Logic in Controller

❌ Prisma inside Controller

❌ any

---

# Learning Order

1. Modules

2. Controllers

3. Services

4. Dependency Injection

5. DTO

6. Validation

7. Prisma

8. CRUD

9. JWT

10. Guards

11. Interceptors

12. Exception Filters

13. Swagger

14. Testing

15. Docker
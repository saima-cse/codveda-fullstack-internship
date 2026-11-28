# Level 2, Task 3: Database Integration (PostgreSQL + Sequelize)

REST API for products and categories, backed by a PostgreSQL database using the Sequelize ORM.

## Features
- PostgreSQL with Sequelize ORM
- Two models, `Category` and `Product`, with a one-to-many relationship (a category has many products)
- Indexes on `Product.name` and `Product.price`
- Validation before saving records
- Full CRUD for products, create and list for categories

## Setup
1. Create a PostgreSQL database named `codveda_db`
2. Copy `.env.example` to `.env` and fill in your database user and password
3. Install and run:

        npm install
        npm run dev

Server runs on http://localhost:4000

## Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | List categories |
| POST | /api/categories | Create a category |
| GET | /api/products | List products with their category |
| GET | /api/products/:id | Get one product |
| POST | /api/products | Create a product |
| PUT | /api/products/:id | Update a product |
| DELETE | /api/products/:id | Delete a product |

## Validation rules
- Product name: required, 2-100 characters
- Price: required, 0 or more
- Stock: integer, 0 or more
- Category name: required, unique, 2-50 characters
- Invalid `CategoryId` returns 400, unknown product id returns 404

## Database

### Categories table (unique name)
![Categories table](screenshots/pgadmin-categories-sql.jpeg)

### Products table (foreign key to Categories, ON DELETE SET NULL)
![Products table](screenshots/pgadmin-products-sql.jpeg)

### Indexes on Products
![Indexes](screenshots/pgadmin-indexes.jpeg)

### Stored data
![Products data](screenshots/pgadmin-products-data.jpeg)

## API Testing (Thunder Client)

### Create category
![POST category](screenshots/post-category-201.jpeg)

### Create product
![POST product](screenshots/post-product-201.jpeg)

### Get all products with category
![GET all](screenshots/get-all-with-category.jpeg)

### Get one product
![GET one](screenshots/get-one.jpeg)

### Update product
![PUT](screenshots/put-200.jpeg)

### Delete product
![DELETE](screenshots/delete-200.jpeg)

### Validation error (400)
![Validation](screenshots/post-validation-400.jpeg)

### Invalid category (400)
![Invalid category](screenshots/post-invalid-category-400.jpeg)

### Not found (404)
![404](screenshots/get-404.jpeg)
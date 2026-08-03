# Installation

## Yêu cầu môi trường

- Java 21 (JDK)
- Maven 3.9+ (hoặc dùng `mvnw` nếu có)
- Node.js 20+ và npm
- PostgreSQL (local hoặc dùng Neon/Supabase)

## Backend (`eduschedule-backend`)

1. Copy file cấu hình mẫu:
   ```
   cp src/main/resources/application.properties.example src/main/resources/application.properties
   ```
2. Sửa `application.properties` với thông tin DB, JWT secret, tài khoản admin mặc định.
3. Tạo database Postgres tên `eduschedule` (hoặc đổi tên trong `DB_URL`).
4. Chạy app:
   ```
   mvn spring-boot:run
   ```
   Backend chạy ở `http://localhost:8080`.

## Frontend (`eduschedule-frontend`)

1. Cài dependencies:
   ```
   npm install
   ```
2. Tạo file `.env.local` từ `.env.example`, điền:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8080
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
3. Chạy app:
   ```
   npm run dev
   ```
   Frontend chạy ở `http://localhost:3000`.

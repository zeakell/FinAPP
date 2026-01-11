# GANTI DARI: FROM golang:1.22-alpine AS builder
# MENJADI VERSI TERBARU (Support Go 1.24+):
FROM golang:alpine AS builder

WORKDIR /app

# Copy file dependency
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN go build -o main .

# --- Stage 2 (Tetap Sama) ---
FROM alpine:latest

WORKDIR /root/

COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]

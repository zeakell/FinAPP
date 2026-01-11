package main

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"io"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// --- MODEL DATABASE ---

// AES 256 - 32 BYTES
const ENCRYPTION_KEY = "aVerySecretKey!12345678901234567" // 16, 24, or 32 bytes for AES-128, AES-192, or AES-256

type RevealRequest struct {
	ID       int    `json:"id"`
	UserID   int    `json:"user_id"`
	Password string `json:"password"`
}
type PasswordStore struct {
	ID          int    `json:"id" gorm:"primaryKey"`
	UserID      int    `json:"user_id"`
	Category    string `json:"category"`                       // Email, Sosmed, Finance, dll
	AccountName string `json:"account_name"`                   // Misal: "Gmail Utama", "Facebook Kerja"
	Username    string `json:"username"`                       // Username login
	Password    string `json:"password"`                       // Akan disimpan TERENKRIPSI di DB
	Status      string `json:"status" gorm:"default:'Active'"` // Default 'Active'
}

type TOTPAccount struct {
	ID          int    `json:"id"`
	UserID      int    `json:"user_id"`
	ServiceName string `json:"service_name"`
	SecretCode  string `json:"secret_code"`
}

type ChangePasswordInput struct {
	UserID      uint   `json:"user_id"`
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type User struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	Username string `gorm:"unique" json:"username"`
	Password string `json:"password"`
}

type Transaction struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	UserID          uint      `json:"user_id"`
	Title           string    `json:"title"`
	Amount          float64   `json:"amount"`
	Type            string    `json:"type"`
	Category        string    `json:"category"`
	TransactionDate string    `json:"date" gorm:"column:tgl_transaksi"`
	CreatedAt       time.Time `json:"created_at"`
}

var db *gorm.DB

func connectDatabase() {
	dbHost := os.Getenv("DB_HOST")
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbName := "finance_db"

	if dbHost == "" {
		dbHost = "127.0.0.1"
	}
	if dbUser == "" {
		dbUser = "root"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPass, dbHost, dbName)

	var err error
	database := &gorm.DB{} // Inisialisasi variabel

	// --- LOGIKA RETRY (Mencoba Berulang Kali) ---
	maxRetries := 10 // Coba maksimal 10 kali
	for i := 1; i <= maxRetries; i++ {
		fmt.Printf("⏳ Percobaan koneksi ke database (%d/%d)...\n", i, maxRetries)
		database, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})

		if err == nil {
			fmt.Println("✅ Berhasil koneksi ke database!")
			break
		}

		fmt.Printf("❌ Gagal koneksi: %v\n", err)
		fmt.Println("   Menunggu 5 detik sebelum mencoba lagi...")
		time.Sleep(5 * time.Second)
	}

	if err != nil {
		panic("🔥 Menyerah! Tidak bisa koneksi ke database setelah beberapa kali percobaan.")
	}

	// AutoMigrate
	database.AutoMigrate(&User{}, &Transaction{})
	db = database
}

// --- HANDLERS ---

func register(c *gin.Context) {
	var input User
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal hash password"})
		return
	}
	input.Password = string(hashedPassword)
	if err := db.Create(&input).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username sudah ada"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Registrasi berhasil"})
}

func login(c *gin.Context) {
	var input User
	var user User
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := db.Where("username = ?", input.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User tidak ditemukan"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Password salah"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Login berhasil", "user_id": user.ID, "username": user.Username})
}

func getTransactions(c *gin.Context) {
	// Ambil User ID dari parameter URL
	userID := c.Query("user_id")
	month := c.Query("month")
	year := c.Query("year")

	var transactions []Transaction

	// Filter Wajib: Hanya ambil data milik user ini
	query := db.Where("user_id = ?", userID).Order("tgl_transaksi desc")

	// Filter Opsional: Bulan & Tahun
	if month != "" && year != "" {
		query = query.Where("tgl_transaksi LIKE ?", year+"-"+month+"-%")
	}

	query.Find(&transactions)
	c.JSON(http.StatusOK, transactions)
}

func createTransaction(c *gin.Context) {
	var input Transaction
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Input JSON dari frontend sudah mengandung "user_id"
	db.Create(&input)
	c.JSON(http.StatusOK, input)
}

func deleteTransaction(c *gin.Context) {
	id := c.Param("id")
	if err := db.Delete(&Transaction{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Terhapus"})
}

func changePassword(c *gin.Context) {
	var input ChangePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	// 1. Cari user
	if err := db.First(&user, input.UserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	// 2. Cek Password Lama (Validasi)
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.OldPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Password lama salah"})
		return
	}

	// 3. Hash Password Baru
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)

	// 4. Update Database
	db.Model(&user).Update("password", string(hashedPassword))

	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil diubah"})
}

// 1. Get TOTP (Support Filter User & Search)
func getTOTPs(c *gin.Context) {
	userID := c.Query("user_id")
	search := c.Query("search") // Tangkap parameter search

	var totps []TOTPAccount

	// Query Dasar: Filter User ID Wajib
	query := db.Where("user_id = ?", userID).Order("id desc")

	// Logic Search: Jika ada parameter search, tambahkan filter LIKE
	if search != "" {
		// %search% artinya mencari teks yang mengandung kata tersebut
		query = query.Where("service_name LIKE ?", "%"+search+"%")
	}

	// Eksekusi Query
	if err := query.Find(&totps).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, totps)
}

// POST: Tambah TOTP Baru
func createTOTP(c *gin.Context) {
	var newTotp TOTPAccount

	// Bind JSON dari Frontend
	// Golang otomatis memetakan json "user_id" ke struct UserID
	if err := c.ShouldBindJSON(&newTotp); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data JSON Invalid: " + err.Error()})
		return
	}

	// Validasi sederhana
	if newTotp.UserID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID tidak boleh kosong (Silakan login ulang)"})
		return
	}

	// Simpan ke DB (GORM)
	if err := db.Create(&newTotp).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data ke DB"})
		return
	}

	c.JSON(http.StatusCreated, newTotp)
}

func deleteTOTP(c *gin.Context) {
	id := c.Param("id")

	// Hapus berdasarkan ID
	if err := db.Delete(&TOTPAccount{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}

func encrypt(text string) (string, error) {
	block, err := aes.NewCipher([]byte(ENCRYPTION_KEY))
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(text), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func decrypt(encryptedText string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encryptedText)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher([]byte(ENCRYPTION_KEY))
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// --- HANDLER PASSWORD MANAGER (BARU) ---

func revealPassword(c *gin.Context) {
	var req RevealRequest
	// req.MasterPIN sekarang akan berisi Password Login User
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// 1. AMBIL DATA USER DARI DB (Berdasarkan User ID)
	var user User
	if err := db.Where("id = ?", req.UserID).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "User tidak ditemukan"})
		return
	}

	// 2. VERIFIKASI PASSWORD LOGIN (Compare Hash vs Input)
	// Kita bandingkan password di DB (Hash) dengan input user (req.MasterPIN)
	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		c.JSON(401, gin.H{"error": "Password Login Salah! Akses Ditolak."})
		return
	}

	// 3. JIKA PASS BENAR, CARI DATA PASSWORD STORE
	var item PasswordStore
	if err := db.Where("id = ? AND user_id = ?", req.ID, req.UserID).First(&item).Error; err != nil {
		c.JSON(404, gin.H{"error": "Data akun tidak ditemukan"})
		return
	}

	// 4. DEKRIPSI
	decrypted, err := decrypt(item.Password)
	if err != nil {
		c.JSON(500, gin.H{"error": "Gagal dekripsi data"})
		return
	}

	// 5. KIRIM HASIL
	c.JSON(200, gin.H{"password": decrypted})
}

func getPasswords(c *gin.Context) {
	userID := c.Query("user_id")
	category := c.Query("category") // Support filter kategori
	search := c.Query("search")

	var passwords []PasswordStore
	query := db.Where("user_id = ?", userID).Order("id desc")

	if category != "" && category != "All" {
		query = query.Where("category = ?", category)
	}
	if search != "" {
		query = query.Where("account_name LIKE ? OR username LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Find(&passwords).Error; err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// DEKRIPSI PASSWORD SEBELUM DIKIRIM KE FRONTEND
	for i := range passwords {
		// Kita sembunyikan password aslinya dari Network Browser
		passwords[i].Password = "🔒 TERKUNCI"
	}

	c.JSON(200, passwords)
}

func createPassword(c *gin.Context) {
	var input PasswordStore
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// ENKRIPSI PASSWORD SEBELUM DISIMPAN KE DB
	encrypted, err := encrypt(input.Password)
	if err != nil {
		c.JSON(500, gin.H{"error": "Gagal mengenkripsi data"})
		return
	}
	input.Password = encrypted

	if err := db.Create(&input).Error; err != nil {
		c.JSON(500, gin.H{"error": "Gagal menyimpan ke DB"})
		return
	}

	c.JSON(201, input)
}

func updatePassword(c *gin.Context) {
	id := c.Param("id")
	var input PasswordStore

	// 1. Bind JSON Input
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// 2. Cari Data Lama (Pastikan milik user yang sama)
	var existing PasswordStore
	if err := db.Where("id = ? AND user_id = ?", id, input.UserID).First(&existing).Error; err != nil {
		c.JSON(404, gin.H{"error": "Data tidak ditemukan atau akses ditolak"})
		return
	}

	// 3. ENKRIPSI ULANG Password Baru
	// Kita harus mengenkripsi lagi karena database hanya menerima cipher text
	encrypted, err := encrypt(input.Password)
	if err != nil {
		c.JSON(500, gin.H{"error": "Gagal mengenkripsi data"})
		return
	}

	// 4. Update Field
	existing.Category = input.Category
	existing.AccountName = input.AccountName
	existing.Username = input.Username
	existing.Status = input.Status
	existing.Password = encrypted

	// 5. Simpan ke DB
	db.Save(&existing)

	c.JSON(200, existing)
}

func deletePassword(c *gin.Context) {
	id := c.Param("id")
	db.Delete(&PasswordStore{}, id)
	c.JSON(200, gin.H{"message": "Deleted"})
}
func main() {
	connectDatabase()
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},

		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	// -------------------------------------------

	api := r.Group("/api")
	{
		api.GET("/transactions", getTransactions)
		api.POST("/transactions", createTransaction)
		api.PUT("/change-password", changePassword)
		api.DELETE("/transactions/:id", deleteTransaction)
		// === MENU BARU TOTP ===
		api.GET("/totp", getTOTPs)
		api.POST("/totp", createTOTP)
		//api.PUT("/totp/:id", updateTOTP) // Jika ada fitur edit
		api.DELETE("/totp/:id", deleteTOTP)

		// Password Manager Routes (BARU)
		api.GET("/passwordsManager", getPasswords)
		api.POST("/passwordsManager", createPassword)
		api.DELETE("/passwordsManager/:id", deletePassword)
		api.PUT("/passwordsManager/:id", updatePassword)
		api.POST("/passwordsManager/reveal", revealPassword)
	}
	r.POST("/api/login", login)
	r.POST("/api/register", register)

	r.Run(":8081")
}

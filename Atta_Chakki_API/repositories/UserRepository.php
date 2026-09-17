<?php
namespace AttaChakki\Repositories;

// repository for User entity operations
class UserRepository extends BaseRepository
{
    // find a user by their primary key ID
    public function findById(int $id): ?array
    {
        return $this->selectOne(
            "SELECT id, full_name, phone, email, role, is_active, address, landmark, latitude, longitude, created_at 
             FROM users WHERE id = ?",
            [$id]
        );
    }

    // find a user including their hashed password (for authentication)
    public function findForAuth(int $id): ?array
    {
        return $this->selectOne(
            "SELECT id, full_name, phone, email, password, role, is_active, address, landmark, latitude, longitude 
             FROM users WHERE id = ?",
            [$id]
        );
    }

    // find a user by phone number
    public function findByPhone(string $phone): ?array
    {
        return $this->selectOne(
            "SELECT id, full_name, phone, email, password, role, is_active, address, landmark, latitude, longitude, created_at 
             FROM users WHERE phone = ?",
            [$phone]
        );
    }

    // find a user by email
    public function findByEmail(string $email): ?array
    {
        return $this->selectOne(
            "SELECT id, full_name, phone, email, password, role, is_active, address, landmark, latitude, longitude, created_at 
             FROM users WHERE email = ?",
            [$email]
        );
    }

    // get user role by user ID
    public function getUserRole(int $id): ?string
    {
        $res = $this->selectOne("SELECT role FROM users WHERE id = ?", [$id]);
        return $res ? $res['role'] : null;
    }

    // check if user is an admin
    public function isAdmin(int $id): bool
    {
        $role = $this->getUserRole($id);
        return $role !== null && strtolower($role) === 'admin';
    }

    // get active drivers
    public function getActiveDrivers(): array
    {
        return $this->selectAll(
            "SELECT id, full_name, phone, email, is_active 
             FROM users WHERE role = 'driver' AND is_active = 1 
             ORDER BY full_name ASC"
        );
    }

    // get paginated customers list with optional search query
    public function getCustomers(int $limit = 50, int $offset = 0, string $search = ''): array
    {
        if (!empty($search)) {
            $term = '%' . $search . '%';
            return $this->selectAll(
                "SELECT id, full_name, phone, email, address, landmark, created_at, is_active 
                 FROM users 
                 WHERE role = 'customer' AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ?) 
                 ORDER BY created_at DESC LIMIT ? OFFSET ?",
                [$term, $term, $term, $limit, $offset]
            );
        }

        return $this->selectAll(
            "SELECT id, full_name, phone, email, address, landmark, created_at, is_active 
             FROM users 
             WHERE role = 'customer' 
             ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [$limit, $offset]
        );
    }

    // count total customers with optional search query
    public function countCustomers(string $search = ''): int
    {
        if (!empty($search)) {
            $term = '%' . $search . '%';
            return (int)$this->selectScalar(
                "SELECT COUNT(*) FROM users WHERE role = 'customer' AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ?)",
                [$term, $term, $term]
            );
        }

        return (int)$this->selectScalar("SELECT COUNT(*) FROM users WHERE role = 'customer'");
    }

    // update user profile
    public function updateProfile(int $id, array $data): int
    {
        $fields = [];
        $params = [];

        $allowed = ['full_name', 'email', 'phone', 'address', 'landmark', 'latitude', 'longitude', 'is_active'];
        foreach ($allowed as $field) {
            if (array_key_exists($field, $data)) {
                $fields[] = "{$field} = ?";
                $params[] = $data[$field];
            }
        }

        if (empty($fields)) {
            return 0;
        }

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        return $this->execute($sql, $params);
    }

    // update user password
    public function updatePassword(int $id, string $passwordHash): int
    {
        return $this->execute("UPDATE users SET password = ? WHERE id = ?", [$passwordHash, $id]);
    }

    // create a new user
    public function create(array $data): int
    {
        return $this->insert(
            "INSERT INTO users (full_name, phone, email, password, role, address, landmark, latitude, longitude, is_active, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            [
                $data['full_name'],
                $data['phone'],
                $data['email'] ?? null,
                $data['password'],
                $data['role'] ?? 'customer',
                $data['address'] ?? null,
                $data['landmark'] ?? null,
                $data['latitude'] ?? null,
                $data['longitude'] ?? null,
                $data['is_active'] ?? 1
            ]
        );
    }
}

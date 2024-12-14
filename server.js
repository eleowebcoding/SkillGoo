require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { createClient } = require('@libsql/client');
const http = require('http');
const multer = require('multer');
const path = require('path');
const { Server } = require('socket.io');

// Configuración del servidor y base de datos
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Base de datos
const db = createClient({
    url: process.env.TURSO_API_URL,
    authToken: process.env.TURSO_API_KEY
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));

// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'mi_clave_secreta',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Cargar la imagen de perfil con multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
app.use('/uploads', express.static('uploads'));

// Variables globales para usuarios conectados
const connectedUsers = {};

// Crear tablas en base de datos
const initDB = async () => {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            online BOOLEAN DEFAULT 0,
            profilePicture TEXT DEFAULT 'default.png'
        )`);
    await db.execute(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY,
            sender TEXT,
            recipient TEXT,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    // tabla para el post 
    await db.execute(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY,
            username TEXT,
            content TEXT,
            image TEXT DEFAULT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
};
initDB().catch(console.error);

// Socket.IO - Eventos de conexión y chat
io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // Evento login para marcar usuario como online
    socket.on('login', async (username) => {
        socket.username = username;
        connectedUsers[username] = socket.id;
        await db.execute(`UPDATE users SET online = 1 WHERE username = ?`, [username]);
        io.emit('update');
    });

    // Desconexión de usuario
    socket.on('disconnect', async () => {
        if (socket.username) {
            delete connectedUsers[socket.username];
            await db.execute(`UPDATE users SET online = 0 WHERE username = ?`, [socket.username]);
            io.emit('update');
        }
        console.log(`Usuario desconectado: ${socket.id}`);
    });

    // Manejo de mensajes de chat
    socket.on('chatMessage', async ({ to, from, message }) => {
        await db.execute(`INSERT INTO messages (sender, recipient, message) VALUES (?, ?, ?)`, [from, to, message]);
        if (connectedUsers[to]) io.to(connectedUsers[to]).emit('chatMessage', { from, message });
        io.to(socket.id).emit('chatMessage', { from, message });
    });
});

// Rutas de autenticación y usuario
app.post('/register', upload.single('profilePicture'), async (req, res) => {
    const { username, password } = req.body;
    const profilePicture = req.file ? req.file.filename : 'default.png';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await db.execute(`INSERT INTO users (username, password, online, profilePicture) VALUES (?, ?, ?, ?)`,
            [username, hashedPassword, false, profilePicture]);
        req.session.username = username;
        res.redirect('/dashboard.html');
    } catch (err) {
        console.error("Error en el registro:", err);
        res.status(500).send("Error en el registro");
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.execute(`SELECT * FROM users WHERE username = ?`, [username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid) {
                req.session.username = username;
                io.emit('update');
                res.redirect('/dashboard.html');
            } else {
                res.status(401).send("Contraseña incorrecta");
            }
        } else {
            res.status(404).send("Usuario no encontrado");
        }
    } catch (err) {
        console.error("Error al iniciar sesión:", err);
        res.status(500).send("Error al iniciar sesión");
    }
});

app.get('/user-data', async (req, res) => {
    if (!req.session.username) return res.status(401).send("No autorizado");

    try {
        const result = await db.execute(`SELECT username, profilePicture, online FROM users WHERE username = ?`,
            [req.session.username]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            user.profilePicture = `/uploads/${user.profilePicture || 'default.png'}`; // Asegúrate de que siempre haya una ruta válida
            res.json(user);
        } else {
            res.status(404).send("Usuario no encontrado");
        }
    } catch (err) {
        console.error("Error al obtener los datos del usuario:", err);
        res.status(500).send("Error al obtener los datos del usuario");
    }
});

app.get('/users', async (req, res) => {
    if (!req.session.username) return res.status(401).send("No autorizado");

    try {
        const result = await db.execute(`SELECT id, username, online, profilePicture FROM users`);
        const users = result.rows.map(user => ({
            ...user,
            profilePicture: `/uploads/${user.profilePicture || 'default.png'}` // Asegúrate de que la URL sea correcta
        }));
        res.json(users);
    } catch (err) {
        console.error("Error al obtener los usuarios:", err);
        res.status(500).send("Error al obtener los usuarios");
    }
});

app.post('/logout', async (req, res) => {
    const username = req.session.username;
    if (username) {
        await db.execute(`UPDATE users SET online = 0 WHERE username = ?`, [username]);
        io.emit('update');
    }
    req.session.destroy(err => {
        if (err) res.status(500).send("Error al cerrar sesión");
        else res.redirect('/index.html');
    });
});

app.post('/edit-profile', upload.single('profilePicture'), async (req, res) => {
    if (!req.session.username) return res.status(401).send('No autorizado');

    const { newUsername } = req.body;
    const profilePicture = req.file ? req.file.filename : undefined;

    try {
        await db.execute(`UPDATE users SET username = ?${profilePicture ? ', profilePicture = ?' : ''} WHERE username = ?`,
            profilePicture ? [newUsername, profilePicture, req.session.username] : [newUsername, req.session.username]);

        req.session.username = newUsername;
        res.status(200).send('Nombre de usuario actualizado');
    } catch (err) {
        console.error('Error al actualizar el nombre de usuario:', err);
        res.status(500).send('Error al actualizar el nombre de usuario');
    }
});

app.get('/messages', async (req, res) => {
    if (!req.session.username) return res.status(401).send("No autorizado");

    const { username, limit = 10, offset = 0 } = req.query;
    try {
        const result = await db.execute(`
            SELECT * FROM messages
            WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
            ORDER BY timestamp ASC
            LIMIT ? OFFSET ?`,
            [req.session.username, username, username, req.session.username, limit, offset]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener los mensajes:", err);
        res.status(500).send("Error al obtener los mensajes");
    }
});

app.post('/create-post', upload.single('postImage'), async (req, res) => {
    const { content } = req.body;
    const username = req.session.username;
    const postImage = req.file ? req.file.filename : null;

    if (!username) return res.status(401).send('No autorizado');
    if (!content || content.trim() === '') return res.status(400).send('Contenido de la publicación es obligatorio');

    try {
        await db.execute(
            `INSERT INTO posts (username, content, image) VALUES (?, ?, ?)`,
            [username, content, postImage]
        );
        res.status(200).send('Publicación creada');
    } catch (err) {
        console.error('Error al crear la publicación:', err);
        res.status(500).send('Error al crear la publicación');
    }
});

app.get('/posts', async (req, res) => {
    try {
        const result = await db.execute('SELECT * FROM posts ORDER BY timestamp DESC');
        const posts = await Promise.all(result.rows.map(async (post) => {
            // Obtener la imagen de perfil del autor de la publicación
            const userResult = await db.execute('SELECT profilePicture FROM users WHERE username = ?', [post.username]);
            const user = userResult.rows[0];
            const profilePictureUrl = `/uploads/${user.profilePicture || 'default.png'}`;

            // Agregar la imagen de perfil al objeto de la publicación
            return {
                ...post,
                profilePicture: profilePictureUrl
            };
        }));

        res.json(posts);
    } catch (err) {
        console.error('Error al obtener las publicaciones:', err);
        res.status(500).send('Error al obtener las publicaciones');
    }
});


// Ruta para eliminar un post
app.delete('/delete-post/:id', async (req, res) => {
    const postId = req.params.id;
    const currentUser = req.session.username; // Obtener el usuario actual desde la sesión

    // Verificar que el usuario esté autenticado
    if (!currentUser) return res.status(401).send('No autorizado');

    try {
        // Buscar el post por su ID
        const result = await db.execute(`SELECT * FROM posts WHERE id = ?`, [postId]);
        const post = result.rows[0];

        if (!post) {
            return res.status(404).send('Post no encontrado');
        }

        // Verificar si el usuario actual es el autor del post
        if (post.username !== currentUser) {
            return res.status(403).send('No tienes permiso para eliminar este post');
        }

        // Eliminar el post si es el autor
        await db.execute(`DELETE FROM posts WHERE id = ?`, [postId]);

        res.status(200).send('Post eliminado');
    } catch (err) {
        console.error('Error al eliminar el post:', err);
        res.status(500).send('Error al eliminar el post');
    }
});





// Iniciar el servidor
server.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

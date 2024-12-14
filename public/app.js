const socket = io();

// Conexión al servidor Socket.IO
socket.on('connect', () => {
  console.log('Conectado al servidor Socket.IO');
});

document.addEventListener('DOMContentLoaded', () => {
  const mobileDock = document.querySelector('.mobile-dock');
  let initialHeight = window.innerHeight;

  window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    if (currentHeight < initialHeight - 100) {
      // Si la altura disminuye significativamente, se oculta el dock
      mobileDock.style.transform = 'translateY(100%)';
    } else {
      // Si la altura vuelve a la normalidad, reaparece el dock
      mobileDock.style.transform = 'translateY(0)';
    }
  });
});


// Obtener los datos del usuario
fetch('/user-data')
  .then(response => {
    if (response.ok) return response.json();
    else throw new Error("No autorizado");
  })
  .then(data => {
    document.getElementById('username').innerText = data.username;
    document.getElementById('profile-pic').src = data.profilePicture || 'default.png'; // Cargar imagen de perfil
    socket.emit('login', data.username);
    showHomeSection();
  })
  .catch(err => {
    console.error(err);
    window.location.href = '/index.html';
  });

// Funciones para cambiar entre secciones
function showHomeSection() {
  document.getElementById('home-section').style.display = 'block';
  document.getElementById('edit-profile-section').style.display = 'none';
  document.getElementById('users-section').style.display = 'none';
  loadPosts(); // Cargar publicaciones en el home
}

function showProfileSection() {
  document.getElementById('home-section').style.display = 'none';
  document.getElementById('edit-profile-section').style.display = 'block';
  document.getElementById('users-section').style.display = 'none';
}

function showUsersSection() {
  document.getElementById('home-section').style.display = 'none';
  document.getElementById('edit-profile-section').style.display = 'none';
  document.getElementById('users-section').style.display = 'block';
  fetchUsers();
}

// Navegación en el dock
document.getElementById('home').addEventListener('click', showHomeSection);
document.getElementById('profile').addEventListener('click', showProfileSection);
document.getElementById('show-users').addEventListener('click', showUsersSection);

// Cerrar sesión
document.getElementById('logout').addEventListener('click', () => {
  socket.emit('logout');
  fetch('/logout', { method: 'POST' })
    .then(() => window.location.href = '/index.html')
    .catch(err => console.error("Error al cerrar sesión:", err));
});

// Navegación en el dock móvil
document.getElementById('mobile-home').addEventListener('click', showHomeSection);
document.getElementById('mobile-profile').addEventListener('click', showProfileSection);
document.getElementById('mobile-show-users').addEventListener('click', showUsersSection);

// Cerrar sesión (versión móvil)
document.getElementById('mobile-logout').addEventListener('click', () => {
  socket.emit('logout');
  fetch('/logout', { method: 'POST' })
    .then(() => window.location.href = '/index.html')
    .catch(err => console.error("Error al cerrar sesión:", err));
});










// Actualizar nombre de usuario y foto de perfil
document.getElementById('edit-profile-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const newUsername = document.getElementById('new-username').value;
  const profilePicInput = document.getElementById('profile-pic-input').files[0];

  const formData = new FormData();
  formData.append('newUsername', newUsername);
  if (profilePicInput) {
    formData.append('profilePicture', profilePicInput);
  }

  fetch('/edit-profile', {
    method: 'POST',
    body: formData,
  })
    .then(response => {
      if (response.ok) {
        document.getElementById('username').innerText = newUsername;
        alert('Perfil actualizado exitosamente.');

        // Actualizar la imagen de perfil en la sección
        const reader = new FileReader();
        reader.onload = function (e) {
          document.getElementById('profile-pic').src = e.target.result; // Actualiza la imagen de perfil
        };
        reader.readAsDataURL(profilePicInput);
      } else {
        throw new Error('Error al actualizar el perfil.');
      }
    })
    .catch(err => console.error(err));
});




// Mostrar la imagen de perfil seleccionada
document.getElementById('profile-pic-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      document.getElementById('profile-pic').src = event.target.result; // Muestra la nueva imagen en el perfil
    };
    reader.readAsDataURL(file);
  }
});


// Mostrar usuarios para chatear
function fetchUsers() {
  fetch('/users')
    .then(response => response.json())
    .then(users => {
      const usersList = document.getElementById('users');
      usersList.innerHTML = '';
      const currentUser = document.getElementById('username').innerText;

      users.filter(user => user.username !== currentUser).forEach(user => {
        const li = document.createElement('li');
        li.classList.add('user-card');

        li.style = `
          position: relative;
          width: 180px;
          height: 180px;
          border-radius: 15px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(200, 200, 200, 0.1));
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
        `;

        // Efecto de hover
        li.onmouseover = () => {
          li.style.transform = 'scale(1.05)';
          li.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.3)';
        };
        li.onmouseleave = () => {
          li.style.transform = 'scale(1)';
          li.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)';
        };

        const img = document.createElement('img');
        img.src = user.profilePicture || 'default.png';
        img.alt = `${user.username}'s photo`;
        img.style = `
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
          filter: brightness(70%); /* Efecto de oscurecimiento para destacar el texto */
        `;

        const userContent = document.createElement('div');
        userContent.style = `
          position: relative;
          z-index: 2;
          color: white;
          font-size: 1em;
          font-weight: bold;
          text-shadow: 0px 1px 5px rgba(0, 0, 0, 0.6);
          padding: 15px;
          text-align: center;
          background: rgba(0, 0, 0, 0.6); /* Fondo semi-transparente para el texto */
          width: 100%; /* Abarca todo el ancho de la tarjeta */
          bottom: 0;
          border-bottom-left-radius: 15px;
          border-bottom-right-radius: 15px;
        `;

        const usernameText = document.createElement('span');
        usernameText.innerText = `${user.username} ${user.online ? '(Conectado)' : '(Desconectado)'}`;
        usernameText.style.color = user.online ? '#43e89d' : '#f05a5a';

        userContent.appendChild(usernameText);
        li.appendChild(img);
        li.appendChild(userContent);

        li.addEventListener('click', () => {
          openChat(user.username);
        });

        usersList.appendChild(li);
      });
    })
    .catch(err => console.error(err));
}



// Función para abrir el chat y mostrar mensajes históricos
function openChat(username) {
  document.getElementById('chatWithUser').innerText = 'Chat con ' + username;
  document.getElementById('messages').innerHTML = ''; // Limpiar mensajes previos
  $('#chatModal').modal('show');

  // Traer mensajes previos
  fetch(`/messages?username=${username}`)
    .then(response => response.json())
    .then(messages => {
      messages.forEach(msg => displayMessage(msg.sender, msg.message, msg.id));
    })
    .catch(err => console.error(err));
}

// Listener para recibir mensajes en tiempo real y actualizar el DOM
socket.on('chatMessage', (msg) => {
  const currentUser = document.getElementById('username').innerText;

  // Solo mostrar el mensaje en el modal si es para el chat abierto
  const chatWithUser = document.getElementById('chatWithUser').innerText.replace('Chat con ', '');
  if (msg.from === chatWithUser || msg.to === currentUser) {
    displayMessage(msg.from, msg.message, msg.id);
  }
});

// Enviar mensaje y mostrar en el DOM inmediatamente
document.getElementById('sendMessage').onclick = () => {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value;
  const currentUser = document.getElementById('username').innerText;
  const chatWithUser = document.getElementById('chatWithUser').innerText.replace('Chat con ', '');

  if (message) {
    // Emitir el mensaje al servidor para el destinatario
    socket.emit('chatMessage', { to: chatWithUser, from: currentUser, message });

    // Agregarlo al DOM directamente para el emisor
    displayMessage(currentUser, message, null);

    // Limpiar el campo de entrada
    messageInput.value = '';
  }
};


// Función para cargar las publicaciones
function loadPosts() {
  fetch('/posts')
    .then(response => response.json())
    .then(posts => {
      const postsList = document.getElementById('posts-list');
      postsList.innerHTML = ''; // Limpia el contenedor de publicaciones

      posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.classList.add('post', 'mb-4');

        // Añadir estilo directamente al contenedor de la publicación
        postElement.style.width = '100%'; // Asegura que ocupe el 100% del ancho
        postElement.style.margin = '0'; // Elimina márgenes horizontales
        postElement.style.padding = '30px'; // Mantén el padding interno

        postElement.innerHTML = `
          <div class="post-header d-flex align-items-center mb-3">
            <img src="${post.profilePicture}" alt="${post.username} profile" class="profile-image rounded-circle" />
            <div class="post-header-info" style="flex-grow: 1;">
              <div class="d-flex align-items-center">
                <strong class="text-light post-username">${post.username}</strong>
                <span class="post-timestamp">${new Date(post.timestamp).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</span>
              </div>
              ${post.username === document.getElementById('username').innerText ?
            `
                <div class="post-actions">
                  <!-- Botón de eliminar publicación -->
                  <button class="bin-button" onclick="deletePost(${post.id})" title="Eliminar publicación">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                  <!-- Botón de modificar publicación -->
                  <button class="edit-button" onclick="editPost(${post.id})" title="Modificar publicación">
                    <i class="fas fa-edit"></i>
                  </button>
                </div>
                ` : ''
          }
            </div>
          </div>

          <!-- Contenido de la publicación -->
          <div class="post-content mt-2" id="post-content-${post.id}">
            ${post.content}
          </div>

          <!-- Imagen de la publicación (si existe) -->
          ${post.image ? `<img src="/uploads/${post.image}" alt="Imagen de publicación" class="img-fluid rounded mt-3" />` : ''}

          <!-- Pie de la publicación -->
          <div class="post-footer d-flex justify-content-between align-items-center mt-3">
            <!-- Botón de Me gusta -->
            <button class="like-button btn btn-link p-0 d-flex flex-column align-items-center" onclick="likePost(${post.id})" title="Me gusta">
              <i class="far fa-heart text-danger" style="font-size: 1.5rem;"></i>
              <span style="font-size: 0.9rem; color: #bbb;">Me gusta</span>
            </button>
            <!-- Botón de Comentar -->
            <button class="comment-button btn btn-link p-0 d-flex flex-column align-items-center" onclick="commentOnPost(${post.id})" title="Comentar">
              <i class="far fa-comment text-success" style="font-size: 1.5rem;"></i>
              <span style="font-size: 0.9rem; color: #bbb;">Comentar</span>
            </button>
            <!-- Botón de Compartir -->
            <button class="share-button btn btn-link p-0 d-flex flex-column align-items-center" onclick="sharePost(${post.id})" title="Compartir">
              <i class="fas fa-share-alt text-warning" style="font-size: 1.5rem;"></i>
              <span style="font-size: 0.9rem; color: #bbb;">Compartir</span>
            </button>
          </div>
        `;

        postsList.appendChild(postElement);
      });
    })
    .catch(err => console.error('Error al cargar las publicaciones:', err));
}


// Mostrar solo fotos y nombres de usuarios
document.addEventListener('DOMContentLoaded', function () {
  fetchUsersProfile();  // Llamamos a la función al cargar la página
});

// Escuchar el evento cuando el modal está por mostrarse
const usersModal = document.getElementById('usersModal');
usersModal.addEventListener('show.bs.modal', fetchMobileUsersProfile);


// Función para obtener y mostrar los usuarios conectados
function fetchUsersProfile() {
  const usersCardContainer = document.getElementById('home-users-card');

  if (!usersCardContainer) {
    console.error('Contenedor de usuarios no encontrado');
    return;
  }

  const cardHTML = `
    <div class="user-card-container">
      <h4 class="card-title">Usuarios Conectados</h4>
      <ul id="home-users" class="list-unstyled mt-3">
      </ul>
    </div>
  `;
  usersCardContainer.innerHTML = cardHTML;

  fetch('/users')
    .then(response => response.json())
    .then(users => {
      const usersList = document.getElementById('home-users');

      if (!usersList) {
        console.error('No se encontró el contenedor de usuarios');
        return;
      }

      usersList.innerHTML = '';
      const currentUser = document.getElementById('username').innerText;

      users
        .filter(user => user.username !== currentUser)
        .forEach(user => {
          const userElement = document.createElement('div');
          userElement.classList.add('user-card');

          userElement.innerHTML = `
            <div class="user-header">
              <img src="${user.profilePicture || 'default.png'}" alt="${user.username} profile" class="profile-image" />
              <div>
                <div class="username">${user.username}</div>
              </div>
            </div>
            <div class="user-footer">
              <button class="message-button" onclick="startChat('${user.username}')" title="Iniciar chat">
                <i class="far fa-comment"></i>
                <span>Mensaje</span>
              </button>
              <button class="view-profile-button" onclick="viewProfile('${user.username}')" title="Ver perfil">
                <i class="far fa-user"></i>
                <span>Perfil</span>
              </button>
            </div>
          `;

          usersList.appendChild(userElement);
        });
    })
    .catch(err => console.error('Error al obtener usuarios:', err));
}



function fetchMobileUsersProfile() {
  const mobileUsersList = document.getElementById('mobile-users-list');

  if (!mobileUsersList) {
    console.error('Contenedor de usuarios en el modal no encontrado');
    return;
  }

  mobileUsersList.innerHTML = '';

  fetch('/users')
    .then(response => response.json())
    .then(users => {
      const currentUser = document.getElementById('username').innerText;

      users
        .filter(user => user.username !== currentUser)
        .forEach(user => {
          const userElement = document.createElement('li');
          userElement.classList.add('user-card', 'mb-4');

          userElement.innerHTML = `
            <div class="user-header">
              <img src="${user.profilePicture || 'default.png'}" alt="${user.username} profile" class="profile-image rounded-circle" />
              <div class="user-header-info">
                <div class="username">${user.username}</div>
              </div>
            </div>

            <div class="user-footer">
              <button class="message-button" onclick="startChat('${user.username}')" title="Iniciar chat">
                <i class="far fa-comment"></i>
                <span>Mensaje</span>
              </button>
              <button class="view-profile-button" onclick="viewProfile('${user.username}')" title="Ver perfil">
                <i class="far fa-user"></i>
                <span>Perfil</span>
              </button>
            </div>
          `;

          mobileUsersList.appendChild(userElement);
        });
    })
    .catch(err => console.error('Error al obtener usuarios:', err));
}






// Función para eliminar un post
function deletePost(postId) {
  if (confirm('¿Estás seguro de que deseas eliminar este post?')) {
    fetch(`/delete-post/${postId}`, {
      method: 'DELETE',
    })
      .then(response => {
        if (response.ok) {
          alert('Publicación eliminada con éxito');
          loadPosts();  // Recargar las publicaciones en el home
        } else {
          throw new Error('Error al eliminar la publicación');
        }
      })
      .catch(err => console.error('Error al eliminar el post:', err));
  }
}

// Evento para crear una nueva publicación
document.getElementById('new-post-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const content = document.getElementById('post-description').value;
  const postImage = document.getElementById('post-image').files[0];

  const formData = new FormData();
  formData.append('content', content);
  if (postImage) formData.append('postImage', postImage);

  fetch('/create-post', {
    method: 'POST',
    body: formData,
  })
    .then(response => {
      if (response.ok) {
        //alert('Publicación creada con éxito');
        loadPosts();  // Recargar las publicaciones en el home
      } else {
        throw new Error('Error al crear la publicación');
      }
    })
    .catch(err => console.error(err));
});

// Función para mostrar un mensaje en el DOM en el modal del chat
function displayMessage(sender, message) {
  const msgElement = document.createElement('div');
  msgElement.classList.add('message', sender === document.getElementById('username').innerText ? 'sent' : 'received');
  msgElement.innerHTML = `${sender === document.getElementById('username').innerText ? 'Yo: ' : sender + ': '}${message}`;
  document.getElementById('messages').appendChild(msgElement);
  document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight; // Desplazarse hacia el último mensaje
}

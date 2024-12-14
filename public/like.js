function toggleLike(postId) {
    const checkbox = document.getElementById(`like-${postId}`);
    const likeCount = document.querySelector(`#like-${postId}`).nextElementSibling;
  
    // Verifica si el checkbox está marcado
    if (checkbox.checked) {
      // Actualizar el contador de "me gusta"
      likeCount.classList.add('one');
      likeCount.textContent = parseInt(likeCount.textContent) + 1;
    } else {
      // Reducir el contador
      likeCount.classList.remove('one');
      likeCount.textContent = parseInt(likeCount.textContent) - 1;
    }
  
    // Enviar al servidor para actualizar la base de datos
    fetch(`/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ liked: checkbox.checked })
    })
    .then(response => response.json())
    .then(data => {
      console.log('Like actualizado', data);
    })
    .catch(error => {
      console.error('Error al actualizar el like:', error);
    });
  }
  
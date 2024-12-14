document.getElementById("new-post-form").addEventListener("submit", function (e) {
    e.preventDefault(); // Evita el envío normal del formulario
    
    // Muestra el loader
    document.getElementById("postLoader").style.display = "flex";

    // Simulación del envío (sustituye con el envío real de datos)
    setTimeout(function () {
        // Oculta el loader después de 2 segundos
        document.getElementById("postLoader").style.display = "none";
        
        // Cierra el modal después de enviar
        $('#newPostModal').modal('hide');
        
        // Reinicia el formulario (opcional)
        document.getElementById("new-post-form").reset();

        // Mensaje opcional de éxito (también puede mostrarse como una alerta o notificación)
        alert("¡Publicación realizada con éxito!");
    }, 2000); // Tiempo simulado para el envío de datos
});

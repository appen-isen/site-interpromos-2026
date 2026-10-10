export function api_ping(request, response) {
    // Lorsque la fonction api_ping est appelée, elle renvoie un objet JSON contenant le message "pong"
    response.send({ message: 'pong' });
}
export const emitSocketError = (
  socket,
  message,
  code = "SOCKET_ERROR"
) => {
  socket.emit("socket:error", {
    success: false,
    code,
    message,
  });
};
import { Server } from 'socket.io'

let io: Server | null = null

export const setSocketServer = (server: Server) => {
  io = server
}

export const getSocketServer = () => io

// Helper function to emit events from other API routes
export const emitSocketEvent = (event: string, room: string, data: any) => {
  if (io) {
    io.to(room).emit(event, data)
  }
}
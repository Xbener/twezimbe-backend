import { DefaultEventsMap, Server } from "socket.io";
import { UserDoc } from "../model/user.model";

let onlineUsers: UserDoc[] = []

const findSocketId = (receiverId: string) => {
    const user = onlineUsers.find(user => user._id === receiverId)
    return user
}

export default async (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) => {
    io.on('connection', (socket) => {
        console.log(`${socket.id} connected`)

        socket.on('add-online-user', user => {
            onlineUsers.push({ socketId: socket.id, ...user });
            console.log('Online users:', onlineUsers.length);
            io.emit('user-logged-in', { user, onlineUsers });
        });

        socket.on('new-message', ({ sender, receiver, message }) => {
            console.log(receiver)
            if (Array.isArray(receiver)) {
                receiver.forEach((receiverId) => {
                    socket.to(findSocketId(receiverId)?.socketId as string).emit('new-message-added', { sender, message });
                });
            } else {
                socket.to(findSocketId(receiver)?.socketId as string).emit('new-message-added', { sender, message });
            }
        })

        socket.on('disconnect', () => {
            const user = onlineUsers.find(u => u.socketId === socket.id);
            if (user) {
                onlineUsers = onlineUsers.filter(u => u.socketId !== socket.id);
                console.log('Online users:', onlineUsers.length);
                io.emit('user-logged-out', { user, onlineUsers });
            }
        });
    })

}